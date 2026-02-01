# FarmBot Platform — implementation requirements & MVP build plan (v0.1)

## What you’re building (one sentence)
A token-gated platform that converts **token balances → pro‑rata farm capacity entitlements**, lets holders allocate that entitlement to plots, and runs AI agents to plan (and later safely execute) work via an on-farm gateway.

---

## Implementation requirements (end-to-end)

### 1) Product + governance
- Entitlement unit (chosen): **ops credits / week** (can later be priced into plot-hours and kWh).
- Define what “access to land” means in practice (recommend: **platform-managed scheduling**, not free physical entry).
- Define safety policy: what actions are allowed remotely, what requires on-site approval.
- Area model (chosen for display/accounting): **242,800 m²** total; conceptual mapping **1,000 tokens = 1 m²** (see `docs/TOKEN_AREA_MAPPING.md`).

### 2) Legal/compliance (must do before a public token sale)
- AU solicitor review for:
  - financial product / MIS risk
  - marketing claims
  - KYC/AML needs
  - property law interaction
- Separate HoldCo/OpCo from token.

### 3) On-chain
- Chain (chosen): **Base (EVM L2)** — **testnet only** for MVP (Base Sepolia recommended).
- Token contract with max supply.
- Admin controls: preferably 2-of-3 multisig for treasury/admin.
- Testnet deployment for MVP.

### 4) Identity + auth
- Wallet-based login (SIWE).
- Signed requests for sensitive actions.
- Optional: 2FA for commands that could cause physical harm.

### 5) Entitlement + scheduling
- Balance snapshot → entitlement per epoch.
- Allocation across plots.
- Scheduler for conflicts + fairness.

### 6) Agent runtime (“Clawdbots”)
- Agent workers that:
  - read farm state (simulated first)
  - produce plans/checklists
  - propose actions (not execute directly)
- Guardrails:
  - tool allowlist per plot
  - rate limits
  - mandatory audit logs

### 7) Edge gateway (on-farm)
- Secure connectivity (WireGuard/Tailscale).
- Connectors: CCTV, sensors, irrigation, robots.
- Policy gate + asset locks + human approvals.

### 8) Observability
- Event log, metrics, alerts.
- Replayable history (“who did what, why”).

---

## Real-life edge + physical assets requirements
See: `farmbot-platform/docs/EDGE_ASSETS.md`

## MVP build (while CCTV/assets are pending)

### MVP1 — Token-gated entitlement + map + work requests
- Wallet connect + SIWE auth.
- Token balance read (testnet; allowlist wallets).
- Entitlement calculation.
- Plot map + allocations (**MVP: 243 plot grid overlay on brochure map**).
- Work request → agent output (plans only).

### MVP2 — Simulation + edge gateway stub
- Mock camera provider.
- Mock irrigation/robot providers.
- Gateway receives tasks and reports state.

### MVP3 — Read-only CCTV
- RTSP ingest to view inside the platform.

### MVP4 — Safe actuation (later)
- Start with low-risk actions (e.g., turning on/off a single irrigation zone) behind human approval.

---

## What I need from you to proceed next
1) Chain preference (EVM L2 vs Solana) and whether this is **testnet-only** for now.
2) Entitlement unit for MVP (recommend **ops credits** first).
3) A rough plot model: how you want to subdivide the farm (e.g., 10–50 plots).
4) First real-world assets to integrate (even if not yet accessible): pumps/valves, cameras (RTSP?), any ROS2 robots.
