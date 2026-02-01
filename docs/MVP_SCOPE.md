# FarmBot Platform — MVP scope (v0.1)

Goal: a **distributed, fractionalised farm automation platform** where token holders can allocate their pro‑rata share of “farm capacity” to autonomous agents ("Clawdbots") that plan and (later) execute tasks on real farm plots.

Important: MVP focuses on **rights accounting + scheduling + simulation + safe control plane**, because CCTV/asset control is not yet available.

---

## MVP definition (what “done” means)
### User-facing
- Wallet login (SIWE / wallet signature).
- Show token balance + **computed entitlement** (pro‑rata).
- Show a simple farm map with plots (MVP: image-overlay grid; later: real polygons/GIS).
- User can:
  - allocate their entitlement to one or more plots
  - submit a "work request" (e.g., irrigation plan, harvest plan, scouting route)
  - see an execution log + artifacts (plans, checklists, schedules)

### Platform
- Entitlement engine: converts token balances → quotas (e.g., plot‑hours/week, compute‑hours/week, or kWh/month).
- Scheduler: resolves conflicts across holders (time slicing, queues, priority rules).
- Agent runtime (simulated): spins up an “agent worker” per request, with guardrails.
- Audit log: immutable-ish event log of actions (who requested what, when, what was produced).

### Farm integration (MVP)
- **Mock connectors** for:
  - CCTV stream (placeholder video or image snapshots)
  - assets (irrigation valves/pumps/robots) returning simulated state
- Edge gateway stub that can:
  - receive tasks
  - ack/deny
  - report status heartbeats

---

## What is explicitly NOT in MVP
- No autonomous actuation of pumps/robots without an explicit safety layer + on‑site acceptance.
- No promise of physical access to the land via token alone (handled by separate legal agreement).
- No mainnet token launch before legal review.

---

## Core data model (MVP)
- Farm
- Plot (polygon + metadata)
- WalletUser
- TokenBalanceSnapshot
- Entitlement (quota per epoch)
- Allocation (user → plots)
- WorkRequest
- Execution
- Artifact (files produced)
- Event (append-only)

---

## MVP milestones (practical)
### Milestone 0 — Decisions
- Chain choice (EVM L2 vs Solana), token type (ERC‑20 vs ERC‑1155), and what entitlement measures (plot‑hours vs kWh vs “ops credits”).

### Milestone 1 — Token gating + entitlement
- Basic token contract (testnet).
- Index balances (or use on-chain RPC reads) + compute entitlement.

### Milestone 2 — Map + allocation UI
- Minimal web UI: connect wallet, view entitlement, assign to plots.

### Milestone 3 — Work request → agent output
- Work requests create agent runs; outputs are plans/checklists.

### Milestone 4 — Edge gateway stub
- Gateway accepts tasks, returns simulated state, produces logs.

### Milestone 5 — CCTV read-only
- Integrate RTSP ingest once credentials are available (read-only first).
