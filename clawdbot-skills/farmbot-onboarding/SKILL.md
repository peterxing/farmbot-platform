---
name: farmbot-onboarding
description: "Onboard into the FarmBot Platform (agent-first): clone repo, install deps, run local dev, mint agent API keys, and deploy the static demo to Cloudflare Pages."
metadata: {"clawdbot":{"emoji":"🧩","always":true,"homepage":"https://farmbot-platform-mvp.pages.dev"}}
---

# FarmBot Platform — onboarding skill

## One-command onboarding (Windows / PowerShell)
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File {baseDir}\\scripts\\onboard.ps1 -Mode local
```

## What it does
- Clones the repo (if missing)
- Installs deps
- Tells you how to start API + web dev

## Deploy static demo (Cloudflare Pages)
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File {baseDir}\\scripts\\onboard.ps1 -Mode deploy-pages
```

## Agent API keys
Humans sign in once; agents use revocable keys.
See: `docs/AGENT_API.md` in the repo.
