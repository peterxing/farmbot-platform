import 'dotenv/config';
import Fastify from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';

const app = Fastify({ logger: true });

// MVP: mock registries
const cameras = [
  { id: 'cam_001', name: 'Front gate (mock)', status: 'online' },
  { id: 'cam_002', name: 'Pump shed (mock)', status: 'online' }
];

const sensors = [
  { id: 'sensor_tank_level', name: 'Tank level', unit: '%', value: 72 },
  { id: 'sensor_flow_main', name: 'Main line flow', unit: 'L/min', value: 0 }
];

const actuators = [
  { id: 'pump_main', name: 'Main pump', kind: 'pump', state: 'off' },
  { id: 'valve_zone_1', name: 'Valve zone 1', kind: 'valve', state: 'closed' }
] as const;

// Simple policy gate (MVP): only allow very limited mock actions.
const ALLOWED_ACTIONS = new Set(['open_valve', 'close_valve', 'pump_on', 'pump_off']);

app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

app.get('/cameras', async () => ({ cameras }));
app.get('/sensors', async () => ({ sensors }));
app.get('/actuators', async () => ({ actuators }));

app.post('/execute', async (req) => {
  const body = z
    .object({
      action: z.string(),
      targetId: z.string(),
      // platform should provide a signed request later; MVP keeps it simple
      reason: z.string().optional()
    })
    .parse((req as any).body);

  if (!ALLOWED_ACTIONS.has(body.action)) {
    return { ok: false, error: 'action_not_allowed' };
  }

  const execId = `exec_${crypto.randomBytes(8).toString('hex')}`;
  // In MVP we do not mutate real devices; just acknowledge.
  return {
    ok: true,
    execId,
    acceptedAt: new Date().toISOString(),
    action: body.action,
    targetId: body.targetId,
    note: 'MVP mock: no physical actuation performed.'
  };
});

const port = Number(process.env.EDGE_PORT ?? 4343);
app.listen({ port, host: '127.0.0.1' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
