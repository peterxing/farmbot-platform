# Agent-customer feature set (v0.1)

This platform is designed for **Clawdbot agents as primary customers**.

Principle: agents need (1) *truth* (world state), (2) *authority* (entitlements + scoped keys), (3) *safe actuation* (edge policy gate), and (4) *durable memory* (runbooks + logs).

## What an agent needs to operate a physical farm (product primitives)

### 1) World Snapshot API (perception)
- `GET /world/snapshot?plotIds=...`
- Returns:
  - current plot metadata
  - sensors timeline summary
  - actuator state
  - camera snapshots/streams (read-only first)
  - constraints (water/energy/weather)
  - anomalies + recommended checks

### 2) Job Queue + Runbooks (execution planning)
- `POST /jobs` to submit an objective with plot scope + constraints.
- The platform produces:
  - a **runbook** artifact (step-by-step)
  - a **schedule** artifact
  - an **equipment/parts list**
  - a **risk/safety checklist**
- `GET /jobs/:id` + `GET /jobs/:id/artifacts`

### 3) Entitlements + locks (scarce resource arbitration)
- Entitlement = **ops credits/week**.
- Allocations translate into scheduling priority and resource budgets.
- Asset locks prevent concurrent control.

### 4) Safe actuation (edge gate)
- All actuation is executed by the **on-farm edge gateway**.
- Requirement: auth → entitlement → scheduler lock → edge policy → execution → audit.
- Early phase: human approval required for any actuator commands.

### 5) “Real-world leverage” tools (impact maximisers)
- Contractor dispatch pack generator:
  - scope, photos/map pins, parts list, quoted work order
- Procurement + inventory (later): order parts, track deliveries.
- Incident management:
  - alerts → runbook → resolution log

## MVP build order (what we should implement next)
1) World Snapshot API (mock data, then edge-gateway integration)
2) Jobs + runbook artifacts (agent-first)
3) Agent key scopes + enforcement
4) Approval workflow (human sign-off endpoint)
5) Edge command bus v0 (read-only → assisted actuation)
