# Cloudflare Pages deployment (MVP)

Goal: publish the **web UI** as a public link.

## What gets deployed
- Static Vite build from: `apps/web/dist`

Note: This public demo should run without needing the local API.

## One-time login
From `C:\Users\peter\clawd\farmbot-platform`:

```powershell
npx wrangler login
```

## Create the Pages project (once)
```powershell
npx wrangler pages project create farmbot-platform-mvp --production-branch main
```

## Deploy
```powershell
npm run deploy:pages
```

(Private until acquisition is complete.)
