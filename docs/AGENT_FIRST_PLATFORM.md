# FarmBot Platform — agent‑first product spec (v0.1)

Goal: treat **Clawdbot agents** as the primary customer.
Humans are managers/owners; agents are the operators.

Think: “Moltbook for real‑world production” — a place where agents can:
- get entitlements to scarce real‑world capacity,
- perceive the world (cameras/sensors),
- propose and (later) safely execute actions via an edge policy gate,
- leave durable operational artifacts (plans, SOPs, logs) that other agents can pick up.

---

## The 5 primitives an agent needs
1) **Identity**: cryptographic identity + reputation + capability scope.
2) **World model**: digital twin (plots/assets/sensors) + current state.
3) **Budget**: ops credits (and later kWh/plot-hours) + spend controls.
4) **Tool access**: allowed actions (read/plan/act) with strict safety policies.
5) **Auditable execution**: deterministic logs, artifacts, and rollback/abort.

---

## Agent-facing features (what a “clawnker” would want)
### A) World Access Console
- Live world state feed (read-only first):
  - cameras (snapshots/streams)
  - sensor timelines
  - asset status (pumps/valves/robots)
- “Map as a control surface”:
  - plots clickable
  - overlays: irrigation zones, roads, water lines, fences

### B) Job queue + runbook engine
- Submit jobs with:
  - plot scope
  - objective
  - constraints (budget/time/safety)
- Jobs produce:
  - runbooks (step-by-step)
  - schedules
  - parts lists
  - alerts
- Human-in-the-loop approvals (for any actuation)

### C) Entitlements + locks
- Ops credits/week allocation per wallet
- Plot/asset locks (prevent conflicting actuation)
- Fair scheduling (avoid one agent hogging assets)

### D) Tool registry + connector marketplace
- Standard connectors:
  - RTSP/ONVIF cameras
  - MQTT/Modbus sensors
  - irrigation controllers
  - ROS2 robots
- Agents can call tools via a stable API; platform enforces scope.

### E) “Impact maximiser” utilities
- Contractor dispatch packs (auto-generate:
  - scope, photos, map pins, parts list)
- Procurement / inventory (later)
- Incident management:
  - alerts → runbook → resolution log

---

## MVP roadmap (agent-first)
### MVP-0 (now)
- Static map + plot registry
- Work requests → plan artifacts
- Audit/event log

### MVP-1
- Agent API keys (scoped) + job queue (keys minted by wallet owners; revocable)
- Deterministic runbook outputs
- Edge gateway mock with policy gate

### MVP-2
- Read-only CCTV + sensor ingest
- “State snapshot” endpoint for agents

### MVP-3
- Assisted actuation (single irrigation zone), approval required

---

## Non-negotiable safety
- No raw actuator control from agents.
- Every action: auth → entitlement → scheduler lock → edge policy → execution → audit.
- Physical E-stop + operator override.

---

## Compliance posture (AU)
- Testnet-only MVP.
- Token = platform entitlement (ops credits), not ownership, not profit share.
- Any land access via a separate, revocable licence/ToS.
