# FarmBot Platform — architecture (v0.1)

## System overview
Three planes:
1) **On-chain**: token ledger (max supply) + optional governance.
2) **Off-chain platform**: identity, entitlement, scheduling, agent orchestration, audit logs.
3) **Edge (on-farm)**: gateway that interfaces with cameras/sensors/robots and enforces safety.

---

## Key principle
Token holders get **pro‑rata platform capacity allocation**, not raw, direct control of physical assets.
All physical actions flow through a **policy + safety gate** at the edge.

---

## Components
### A) Smart contracts
- **Token contract** (max supply fixed).
- Optional: **Entitlement registry** (epoch parameters, plot catalog hashes).
- Optional: **Governance** (separate from token if you want safety).

### B) Platform (cloud)
- **Auth**: SIWE (wallet signature) + optional email/2FA for risky actions.
- **Entitlement service**: balance snapshot → quota per epoch.
- **Allocation service**: user assigns quota to plots.
- **Scheduler**: merges all allocations into a time/asset schedule.
- **Agent orchestration**:
  - spawns “agent workers” for each work request
  - tool access scoped to the plot + permitted operations
- **Artifact store**: plans, generated SOPs, maps, schedules.
- **Event log**: append-only events (audit + replay).

### C) Edge gateway (on-farm)
- **Connectors**:
  - Cameras (RTSP)
  - Sensors (MQTT/Modbus)
  - Irrigation controllers
  - Robots (ROS2)
- **Policy engine**:
  - allowlist actions
  - preconditions (weather, tank level, pump status)
  - rate limiting + conflict locks
  - human-in-the-loop approvals
- **Command bus**:
  - signed requests
  - idempotent execution
  - status reporting

---

## Multi-tenant “Clawdbot” model
Two workable patterns:
1) **Central farm brain** (one Clawdbot instance orchestrates tasks for all users) — simplest MVP.
2) **Bring-your-own-Clawdbot**: each user’s Clawdbot connects to the platform API using their wallet identity. Platform enforces entitlements; edge enforces safety.

MVP should start with (1) and expose a clean API for (2).

---

## Safety / security requirements (non-negotiable)
- No direct actuator control from user agents; only via edge policy engine.
- Per-asset locking and concurrency control.
- Strong auth for any action that could damage property.
- Audit trails + tamper-evidence.
- Network isolation: VPN (WireGuard/Tailscale), not open ports.
- Physical E‑stop and on-site override.
