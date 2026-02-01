import 'dotenv/config';
import Fastify from 'fastify';
import { SiweMessage } from 'siwe';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createPublicClient, http, getAddress } from 'viem';
import { baseSepolia, arbitrumSepolia, optimismSepolia, sepolia } from 'viem/chains';
import { DEFAULTS, computeOpsCreditsEntitled, computeVirtualAreaSqm, newId } from '@farmbot/shared';
import type { Address, Artifact, EntitlementSnapshot, Plot, WorkRequest, WorkRequestType } from '@farmbot/shared';

const app = Fastify({ logger: true });

const dataDir = path.join(process.cwd(), 'data');
const ledgerPath = path.join(dataDir, 'mock-ledger.json');
const plotsPath = path.join(dataDir, 'plots.json');
const boundaryPath = path.join(dataDir, 'property_boundary_image.json');
const agentKeysPath = path.join(dataDir, 'agent-keys.json');

// Physical-world config (template JSON; safe to keep generic)
const irrigationPath = path.join(dataDir, 'irrigation.json');
const pumpsPath = path.join(dataDir, 'pumps.json');
const camerasPath = path.join(dataDir, 'cameras.json');
const contractorsPath = path.join(dataDir, 'contractors.json');
const cropsPath = path.join(dataDir, 'crops.json');
const dronesPath = path.join(dataDir, 'drones.json');
const robotsPath = path.join(dataDir, 'robots.json');
const vehiclesPath = path.join(dataDir, 'vehicles.json');

const nonces = new Map<string, string>();
const sessions = new Map<string, { wallet: Address; createdAt: number }>();

function loadJson<T>(p: string): T {
  const raw = fs.readFileSync(p, 'utf8');
  // Handle UTF-8 BOM (PowerShell Out-File writes BOM by default)
  const text = raw.replace(/^\uFEFF/, '');
  return JSON.parse(text) as T;
}

function safeLoadJson<T>(p: string, fallback: T): T {
  try {
    return loadJson<T>(p);
  } catch {
    return fallback;
  }
}

function saveJson(p: string, obj: unknown) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

type AgentKeyRecord = {
  id: string;
  wallet: Address;
  name: string;
  keyHash: string; // sha256 hex
  createdAt: string;
  revokedAt?: string;
  scopes: string[];
};

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function loadAgentKeys(): AgentKeyRecord[] {
  const arr = loadJson<AgentKeyRecord[]>(agentKeysPath);
  return Array.isArray(arr) ? arr : [];
}

function saveAgentKeys(arr: AgentKeyRecord[]) {
  saveJson(agentKeysPath, arr);
}

function chainFromEnv() {
  const id = Number(process.env.TOKEN_CHAIN_ID ?? 0);
  switch (id) {
    case baseSepolia.id:
      return baseSepolia;
    case arbitrumSepolia.id:
      return arbitrumSepolia;
    case optimismSepolia.id:
      return optimismSepolia;
    case sepolia.id:
      return sepolia;
    default:
      return baseSepolia;
  }
}

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'supply', type: 'uint256' }]
  }
] as const;

async function getTokenBalanceAndSupply(wallet: Address): Promise<{ balance: bigint; totalSupply: bigint; source: 'chain' | 'mock' }> {
  const rpc = process.env.TOKEN_RPC_URL;
  const token = process.env.TOKEN_ADDRESS as Address | undefined;
  if (rpc && token) {
    const client = createPublicClient({ chain: chainFromEnv(), transport: http(rpc) });
    const [balance, totalSupply] = await Promise.all([
      client.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [wallet] }),
      client.readContract({ address: token, abi: ERC20_ABI, functionName: 'totalSupply' })
    ]);
    return { balance, totalSupply, source: 'chain' };
  }

  const ledger = loadJson<Record<string, string>>(ledgerPath);
  const b = BigInt(ledger[wallet] ?? '0');
  const totalSupply = BigInt(Math.round(DEFAULTS.farmTotalAreaSqm * DEFAULTS.tokensPerSqm));
  return { balance: b, totalSupply, source: 'mock' };
}

function getBearer(req: any): string | null {
  const auth = req.headers['authorization'];
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim();
}

function requireHumanSession(req: any): Address {
  const token = getBearer(req);
  if (!token) throw new Error('Missing Authorization Bearer token');
  const s = sessions.get(token);
  if (!s) throw new Error('Invalid session');
  return s.wallet;
}

function requireWallet(req: any): { wallet: Address; authType: 'session' | 'agentKey'; scopes?: string[] } {
  const token = getBearer(req);
  if (!token) throw new Error('Missing Authorization Bearer token');

  // Agent keys are sent as Bearer ak_...
  if (token.startsWith('ak_')) {
    const keys = loadAgentKeys();
    const rec = keys.find((k) => !k.revokedAt && k.keyHash === sha256Hex(token));
    if (!rec) throw new Error('Invalid agent key');
    return { wallet: rec.wallet, authType: 'agentKey', scopes: rec.scopes };
  }

  const s = sessions.get(token);
  if (!s) throw new Error('Invalid session');
  return { wallet: s.wallet, authType: 'session' };
}

function requireScope(auth: { authType: 'session' | 'agentKey'; scopes?: string[] }, scope: string) {
  if (auth.authType !== 'agentKey') return;
  const scopes = auth.scopes ?? [];
  if (!scopes.includes(scope)) {
    throw new Error(`Agent key missing required scope: ${scope}`);
  }
}

// --- Auth ---
app.post('/auth/nonce', async (req) => {
  const body = z.object({ address: z.string() }).parse((req as any).body);
  const address = getAddress(body.address) as Address;
  const nonce = crypto.randomBytes(16).toString('hex');
  nonces.set(address, nonce);
  return { address, nonce };
});

app.post('/auth/verify', async (req) => {
  const body = z
    .object({
      message: z.string(),
      signature: z.string()
    })
    .parse((req as any).body);

  const msg = new SiweMessage(body.message);
  const fields = await msg.verify({ signature: body.signature });
  const address = getAddress(fields.data.address) as Address;
  const expected = nonces.get(address);
  if (!expected || fields.data.nonce !== expected) throw new Error('Bad nonce');

  const sessionToken = crypto.randomBytes(24).toString('hex');
  sessions.set(sessionToken, { wallet: address, createdAt: Date.now() });
  return { sessionToken, address };
});

// --- Entitlement ---
app.get('/me/entitlement', async (req) => {
  const { wallet } = requireWallet(req);
  const { balance, totalSupply, source } = await getTokenBalanceAndSupply(wallet);

  const opsCreditsEntitled = computeOpsCreditsEntitled(balance, totalSupply);
  const virtualAreaSqm = computeVirtualAreaSqm(balance, totalSupply);

  const now = new Date();
  const epochStart = new Date(now);
  epochStart.setUTCHours(0, 0, 0, 0);
  const epochEnd = new Date(epochStart);
  epochEnd.setUTCDate(epochEnd.getUTCDate() + 7);

  const snap: EntitlementSnapshot & { source: string } = {
    wallet,
    epochStart: epochStart.toISOString(),
    epochEnd: epochEnd.toISOString(),
    tokenBalance: balance.toString(),
    totalSupply: totalSupply.toString(),
    opsCreditsPerWeek: DEFAULTS.totalOpsCreditsPerWeek,
    opsCreditsEntitled,
    virtualAreaSqm,
    source
  };

  return snap;
});

// --- Plots + allocations (in-memory MVP) ---
let allocations: Record<string, { plotId: string; credits: number }[]> = {};

app.get('/plots', async () => {
  return loadJson<Plot[]>(plotsPath);
});

app.get('/boundary', async () => {
  return { polygonImage: loadJson<Array<[number, number]>>(boundaryPath) };
});

// --- World snapshot (agent-customer primitive) ---
// In MVP this is mock data. Later it is backed by the edge gateway.
app.get('/world/snapshot', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'read');

  const query = z
    .object({
      plotIds: z.string().optional()
    })
    .parse((req as any).query ?? {});

  const plots = loadJson<Plot[]>(plotsPath);
  const requested = (query.plotIds ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const scopedPlots = requested.length > 0 ? plots.filter((p) => requested.includes(p.id)) : plots;

  const irrigation = safeLoadJson<any>(irrigationPath, { zones: [], waterSources: [] });
  const pumps = safeLoadJson<any>(pumpsPath, { pumps: [] });
  const cameras = safeLoadJson<any>(camerasPath, { cameras: [] });
  const contractors = safeLoadJson<any>(contractorsPath, { contractors: [] });
  const crops = safeLoadJson<any>(cropsPath, { beds: [], plantings: [], harvests: [] });
  const drones = safeLoadJson<any>(dronesPath, { drones: [], constraints: {} });
  const robots = safeLoadJson<any>(robotsPath, { robots: [] });
  const vehicles = safeLoadJson<any>(vehiclesPath, { vehicles: [] });

  const snapshot = {
    ts: new Date().toISOString(),
    plots: scopedPlots,

    irrigation,
    pumps,
    cameras,
    contractors,
    crops,
    drones,
    robots,
    vehicles,

    sensors: {
      water: {
        tankLevelPct: 72,
        flowLpm: 0,
        pressureKpa: 0
      },
      energy: {
        batterySocPct: 65,
        solarKw: 0,
        loadKw: 0.8
      },
      weather: {
        tempC: 23,
        humidityPct: 55,
        windKph: 8,
        rainMm24h: 0
      }
    },
    actuators: {
      pumps: [{ id: 'pump_main', state: 'off' }],
      valves: [{ id: 'valve_zone_1', state: 'closed' }]
    },
    anomalies: [
      { id: 'mvp_no_cctv', severity: 'info', message: 'CCTV not connected (MVP)' },
      { id: 'mvp_no_edge', severity: 'info', message: 'Edge gateway not enforcing safety policies yet (MVP)' }
    ]
  };

  return snapshot;
});

app.get('/me/allocations', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'read');
  const { wallet } = auth;
  return { wallet, allocations: allocations[wallet] ?? [] };
});

app.post('/me/allocations', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'plan');
  const { wallet } = auth;
  const body = z
    .object({
      allocations: z.array(z.object({ plotId: z.string(), credits: z.number().nonnegative() }))
    })
    .parse((req as any).body);

  allocations[wallet] = body.allocations;
  return { ok: true };
});

// --- Jobs + runbooks (agent-customer primitive) ---
type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

type JobKind =
  | 'irrigation_schedule'
  | 'pump_monitoring'
  | 'security_patrol'
  | 'contractor_dispatch'
  | 'seeding'
  | 'harvest'
  | 'drone_deployment'
  | 'humanoid_deployment'
  | 'vehicle_sentry'
  | 'generic';

type Job = {
  id: string;
  createdAt: string;
  wallet: Address;
  requestedBy: 'session' | 'agentKey';
  kind: JobKind;
  plotIds: string[];
  objective: string;
  constraints?: Record<string, unknown>;
  status: JobStatus;
  error?: string;
};

const jobs = new Map<string, Job>();
const jobArtifacts = new Map<string, Artifact[]>();

function renderRunbook(job: Job, world: any): string {
  const plots = job.plotIds.map((p) => `- ${p}`).join('\n');

  const kindHints: Record<JobKind, string> = {
    irrigation_schedule:
      'Focus: zone runtimes, water availability, pump constraints, and a weekly schedule with safe assumptions.',
    pump_monitoring:
      'Focus: expected pump curves/signals, fault detection (dry run, cavitation), and alert thresholds.',
    security_patrol:
      'Focus: camera sweep cadence, motion review checklist, and escalation steps.',
    contractor_dispatch:
      'Focus: convert problem description into a dispatch pack (scope, parts, photos, access notes).',
    seeding: 'Focus: bed prep, seed rate, timing, labour estimate, and post-seed irrigation.',
    harvest: 'Focus: harvest window, labour plan, handling/cold chain, yield logging.',
    drone_deployment:
      'Focus: mission plan + preflight checklist + safety/compliance; no autonomous flight execution in MVP.',
    humanoid_deployment:
      'Focus: task decomposition + tool list + safety constraints + teleop plan; assume on-site supervision and E-stop.',
    vehicle_sentry:
      'Focus: sentry/telemetry monitoring, event triage, escalation runbook; no remote driving.',
    generic: 'General operational runbook.'
  };

  return `# Runbook (MVP)\n\n## Kind\n${job.kind}\n\n## Objective\n${job.objective}\n\n## Hints\n${kindHints[job.kind]}\n\n## Plots\n${plots}\n\n## Constraints\n\n\`\`\`json\n${JSON.stringify(job.constraints ?? {}, null, 2)}\n\`\`\`\n\n## World snapshot (summary)\n\`\`\`json\n${JSON.stringify(
    {
      sensors: world?.sensors ?? {},
      irrigation: world?.irrigation ?? {},
      pumps: world?.pumps ?? {},
      cameras: world?.cameras ?? {},
      drones: world?.drones ?? {}
    },
    null,
    2
  )}\n\`\`\`\n\n## Steps (plan-only)\n1) Validate inputs (water/energy/weather).\n2) Generate schedule / checks (ops credits aware).\n3) Produce safe action proposals (no actuation in MVP).\n4) If action needed: generate an approval request / contractor dispatch pack.\n\n## Safety\n- No physical actuation is performed in MVP.\n- Any future actuation must pass edge policy + (initially) human approval.\n`;
}

app.post('/jobs', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'plan');

  const body = z
    .object({
      kind: z
        .enum([
          'irrigation_schedule',
          'pump_monitoring',
          'security_patrol',
          'contractor_dispatch',
          'seeding',
          'harvest',
          'drone_deployment',
          'humanoid_deployment',
          'vehicle_sentry',
          'generic'
        ])
        .default('generic'),
      plotIds: z.array(z.string()).min(1),
      objective: z.string().min(3),
      constraints: z.record(z.any()).optional()
    })
    .parse((req as any).body);

  const id = newId('job');
  const job: Job = {
    id,
    createdAt: new Date().toISOString(),
    wallet: auth.wallet,
    requestedBy: auth.authType,
    kind: body.kind,
    plotIds: body.plotIds,
    objective: body.objective,
    constraints: body.constraints,
    status: 'queued'
  };

  jobs.set(id, job);
  return job;
});

app.get('/jobs', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'read');

  const query = z.object({ status: z.string().optional() }).parse((req as any).query ?? {});
  const list = Array.from(jobs.values()).filter((j) => j.wallet === auth.wallet);
  const filtered = query.status ? list.filter((j) => j.status === query.status) : list;
  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
});

app.get('/jobs/:id', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'read');

  const id = (req as any).params.id as string;
  const job = jobs.get(id);
  if (!job || job.wallet !== auth.wallet) return { error: 'not_found' };
  return job;
});

app.get('/jobs/:id/artifacts', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'read');

  const id = (req as any).params.id as string;
  const job = jobs.get(id);
  if (!job || job.wallet !== auth.wallet) return { error: 'not_found' };
  return jobArtifacts.get(id) ?? [];
});

app.post('/jobs/:id/cancel', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'plan');

  const id = (req as any).params.id as string;
  const job = jobs.get(id);
  if (!job || job.wallet !== auth.wallet) return { ok: false, error: 'not_found' };
  if (job.status === 'succeeded' || job.status === 'failed') return { ok: false, error: 'already_finished' };
  job.status = 'canceled';
  jobs.set(id, job);
  return { ok: true };
});

// simple in-process worker loop (MVP)
setInterval(async () => {
  const next = Array.from(jobs.values()).find((j) => j.status === 'queued');
  if (!next) return;

  next.status = 'running';
  jobs.set(next.id, next);

  try {
    // world snapshot (reuse endpoint logic lightly)
    const world = {
      sensors: {
        water: { tankLevelPct: 72, flowLpm: 0, pressureKpa: 0 },
        energy: { batterySocPct: 65, solarKw: 0, loadKw: 0.8 },
        weather: { tempC: 23, humidityPct: 55, windKph: 8, rainMm24h: 0 }
      }
    };

    const art: Artifact = {
      id: newId('art'),
      workRequestId: next.id,
      kind: 'markdown',
      filename: `${next.id}_runbook.md`,
      content: renderRunbook(next, world)
    };

    jobArtifacts.set(next.id, [art]);
    next.status = 'succeeded';
    jobs.set(next.id, next);
  } catch (e: any) {
    next.status = 'failed';
    next.error = String(e?.message ?? e);
    jobs.set(next.id, next);
  }
}, 750);

// --- Work requests + artifacts (legacy stub agent) ---
const workRequests = new Map<string, WorkRequest>();
const artifacts = new Map<string, Artifact[]>();

function renderPlan(type: WorkRequestType, plotIds: string[], prompt: string): string {
  const plots = plotIds.map((p) => `- ${p}`).join('\n');
  return `# FarmBot plan (${type})\n\n## Plots\n${plots}\n\n## Prompt\n${prompt}\n\n## Output (MVP)\nThis is a placeholder plan. Next step: wire this to a real agent worker (Clawdbot or LLM) and the edge gateway state APIs.\n\n### Checklist\n- Validate constraints (weather, water availability, labour)\n- Generate schedule\n- Produce execution steps + safety notes\n`;
}

app.post('/work-requests', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'plan');
  const { wallet } = auth;
  const body = z
    .object({
      plotIds: z.array(z.string()).min(1),
      type: z.enum(['irrigation_plan', 'harvest_plan', 'scouting_plan', 'maintenance_checklist', 'generic']),
      prompt: z.string().min(1)
    })
    .parse((req as any).body);

  const id = newId('wr');
  const wr: WorkRequest = {
    id,
    createdAt: new Date().toISOString(),
    wallet,
    plotIds: body.plotIds,
    type: body.type,
    prompt: body.prompt,
    status: 'succeeded'
  };

  workRequests.set(id, wr);
  const art: Artifact = {
    id: newId('art'),
    workRequestId: id,
    kind: 'markdown',
    filename: `${id}.md`,
    content: renderPlan(body.type, body.plotIds, body.prompt)
  };
  artifacts.set(id, [art]);

  return { workRequest: wr, artifacts: [art] };
});

app.get('/work-requests/:id', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'read');
  const { wallet } = auth;
  const id = (req as any).params.id as string;
  const wr = workRequests.get(id);
  if (!wr || wr.wallet !== wallet) {
    return { error: 'not_found' };
  }
  return wr;
});

app.get('/work-requests/:id/artifacts', async (req) => {
  const auth = requireWallet(req);
  requireScope(auth, 'read');
  const { wallet } = auth;
  const id = (req as any).params.id as string;
  const wr = workRequests.get(id);
  if (!wr || wr.wallet !== wallet) {
    return { error: 'not_found' };
  }
  return artifacts.get(id) ?? [];
});

// --- Agent keys (MVP: file-backed) ---
// Create a key (returns plaintext token ONCE)
app.post('/agent-keys', async (req) => {
  const wallet = requireHumanSession(req);
  const body = z
    .object({
      name: z.string().min(1).max(64),
      scopes: z.array(z.string()).default(['read', 'plan'])
    })
    .parse((req as any).body);

  const token = `ak_${crypto.randomBytes(24).toString('hex')}`;
  const rec: AgentKeyRecord = {
    id: newId('ak'),
    wallet,
    name: body.name,
    keyHash: sha256Hex(token),
    createdAt: new Date().toISOString(),
    scopes: body.scopes
  };

  const keys = loadAgentKeys();
  keys.push(rec);
  saveAgentKeys(keys);

  return {
    agentKey: token,
    record: { id: rec.id, name: rec.name, createdAt: rec.createdAt, scopes: rec.scopes }
  };
});

// List keys (no plaintext)
app.get('/agent-keys', async (req) => {
  const wallet = requireHumanSession(req);
  const keys = loadAgentKeys()
    .filter((k) => k.wallet === wallet)
    .map((k) => ({ id: k.id, name: k.name, createdAt: k.createdAt, revokedAt: k.revokedAt, scopes: k.scopes }));
  return { wallet, keys };
});

// Revoke key
app.post('/agent-keys/:id/revoke', async (req) => {
  const wallet = requireHumanSession(req);
  const id = (req as any).params.id as string;
  const keys = loadAgentKeys();
  const rec = keys.find((k) => k.id === id && k.wallet === wallet);
  if (!rec) return { ok: false, error: 'not_found' };
  rec.revokedAt = new Date().toISOString();
  saveAgentKeys(keys);
  return { ok: true };
});

// --- Mock ledger admin (local-only MVP) ---
app.post('/__admin/mock-ledger/set', async (req) => {
  const body = z.object({ address: z.string(), balance: z.string() }).parse((req as any).body);
  const address = getAddress(body.address) as Address;
  const ledger = loadJson<Record<string, string>>(ledgerPath);
  ledger[address] = BigInt(body.balance).toString();
  saveJson(ledgerPath, ledger);
  return { ok: true, address, balance: ledger[address] };
});

const port = Number(process.env.PORT ?? 4242);
app.listen({ port, host: '127.0.0.1' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
