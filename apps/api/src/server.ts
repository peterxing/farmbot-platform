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

const nonces = new Map<string, string>();
const sessions = new Map<string, { wallet: Address; createdAt: number }>();

function loadJson<T>(p: string): T {
  const raw = fs.readFileSync(p, 'utf8');
  // Handle UTF-8 BOM (PowerShell Out-File writes BOM by default)
  const text = raw.replace(/^\uFEFF/, '');
  return JSON.parse(text) as T;
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

app.get('/me/allocations', async (req) => {
  const { wallet } = requireWallet(req);
  return { wallet, allocations: allocations[wallet] ?? [] };
});

app.post('/me/allocations', async (req) => {
  const { wallet } = requireWallet(req);
  const body = z
    .object({
      allocations: z.array(z.object({ plotId: z.string(), credits: z.number().nonnegative() }))
    })
    .parse((req as any).body);

  allocations[wallet] = body.allocations;
  return { ok: true };
});

// --- Work requests + artifacts (stub agent) ---
const workRequests = new Map<string, WorkRequest>();
const artifacts = new Map<string, Artifact[]>();

function renderPlan(type: WorkRequestType, plotIds: string[], prompt: string): string {
  const plots = plotIds.map((p) => `- ${p}`).join('\n');
  return `# FarmBot plan (${type})\n\n## Plots\n${plots}\n\n## Prompt\n${prompt}\n\n## Output (MVP)\nThis is a placeholder plan. Next step: wire this to a real agent worker (Clawdbot or LLM) and the edge gateway state APIs.\n\n### Checklist\n- Validate constraints (weather, water availability, labour)\n- Generate schedule\n- Produce execution steps + safety notes\n`;
}

app.post('/work-requests', async (req) => {
  const { wallet } = requireWallet(req);
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
  const { wallet } = requireWallet(req);
  const id = (req as any).params.id as string;
  const wr = workRequests.get(id);
  if (!wr || wr.wallet !== wallet) {
    return { error: 'not_found' };
  }
  return wr;
});

app.get('/work-requests/:id/artifacts', async (req) => {
  const { wallet } = requireWallet(req);
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
