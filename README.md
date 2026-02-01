# FarmBot Platform (MVP)

Agent-first platform for **token-gated fractionalised farm automation**.

- Status: MVP (testnet / demo mode; no physical actuation)

## What it does (today)
- Wallet SIWE auth (local dev)
- Token balance → pro-rata **ops credits/week** entitlement
- Plot registry + clickable plot overlay on the farm map
- Work requests → (stub) plan artifacts
- Edge gateway stub (mock cameras/sensors/actuators)

## What it does NOT do (yet)
- No real hardware control (pumps/valves/robots) without an on-farm safety gate.
- Token is **not** land ownership and **not** a profit share.

## Quickstart (local dev)
```powershell
cd farmbot-platform
npm install
npm run dev:api
npm run dev:web
```
Open: http://127.0.0.1:5173/

## Agent API keys (recommended)
Humans sign in once; agents use revocable keys.

See: `docs/AGENT_API.md`

## Clawdbot onboarding skill
This repo includes Clawdbot skills under:
- `clawdbot-skills/`

Copy into:
- `~/.clawdbot/skills/`

Then run:
```bash
clawdbot skills list --eligible
clawdbot skills info farmbot-onboarding
```

## Legal/compliance note (AU)
Keep MVP **testnet-only**. Treat the token as **consumptive platform entitlement** (ops credits), avoid marketing any investment return, and keep any land access as a separate revocable licence/ToS.

## Media
This repo intentionally avoids property-identifying imagery. Use placeholders until acquisition is complete.
