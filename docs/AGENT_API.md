# Agent API (MVP) — quickstart

This MVP is **agent-first**. Humans sign in (SIWE) to mint **agent API keys**; Clawdbot agents then use those keys to call the platform.

## Auth modes
- **Human session**: SIWE → session token (Bearer).
- **Agent key**: `Bearer ak_...` (created by a human session). Keys can be revoked.

## Create an agent key (human session)
1) SIWE sign in via the web UI (local API) to obtain a session token.
2) Call:

```bash
curl -s -X POST http://127.0.0.1:4242/agent-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -d '{"name":"clawdbot-operator","scopes":["read","plan"]}'
```

Response includes `agentKey` **once**. Save it.

## Use the agent key
```bash
curl -s http://127.0.0.1:4242/me/entitlement \
  -H "Authorization: Bearer <AGENT_KEY>"
```

Submit a work request:
```bash
curl -s -X POST http://127.0.0.1:4242/work-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AGENT_KEY>" \
  -d '{"plotIds":["plot_042"],"type":"irrigation_plan","prompt":"Plan irrigation for the next 7 days."}'
```

## Revoke an agent key (human session)
```bash
curl -s -X POST http://127.0.0.1:4242/agent-keys/<ID>/revoke \
  -H "Authorization: Bearer <SESSION_TOKEN>"
```

## Notes
- MVP is **testnet / demo mode** and does not actuate physical assets.
- Next step: add scopes like `actuate:irrigation` and enforce them at the edge policy gate.
