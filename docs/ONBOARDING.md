# Onboarding (CLI)

This project is designed to be **agent-first**: humans mint revocable agent keys; Clawdbot agents do the work.

## Local dev
```powershell
cd C:\Users\peter\clawd\farmbot-platform
npm install
npm run dev:api
npm run dev:web
```
Open:
- http://127.0.0.1:5173/

## Agent keys
See `docs/AGENT_API.md`.

## Deploy demo
See `docs/CLOUDFLARE_DEPLOY.md`.

## Clawdbot skill
A helper onboarding skill lives in `skills/farmbot-onboarding/`.
To inspect eligibility:
```bash
clawdbot skills list --eligible
clawdbot skills info farmbot-onboarding
```
