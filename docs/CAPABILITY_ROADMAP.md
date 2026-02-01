# Capability roadmap (agent-first)

These are the first real-world capabilities, in increasing risk order:

## 1) Pump monitoring (observe → alert)
**Inputs needed:** pump inventory, CT clamp sensor IDs, flow/pressure sensors, thresholds.
- MVP: dashboard + alerts + runbooks.
- Later: automated safe shutdown suggestions; actuation only via edge gate.

## 2) Irrigation scheduling (plan → assisted control)
**Inputs needed:** irrigation zones, valve mapping, water source/tank levels, crop water needs.
- MVP: weekly schedule generator + conflict checks (water/energy).
- Assisted: “propose actions” + human approval.

## 3) Security patrol via cameras (observe → anomaly detection)
**Inputs needed:** camera registry + RTSP URLs, patrol routes (virtual), alert rules.
- MVP: patrol runbook + snapshot checklist.
- Later: motion events + anomaly detection; no facial ID.

## 4) Contractor dispatch (human-in-the-loop execution)
**Inputs needed:** contractor contacts, preferred vendors, standard job templates.
- MVP: generate dispatch packs (scope, map pins, photos, parts list).

## 5) Plant seeding + harvesting (plan → track)
**Inputs needed:** beds/rows map, crop calendar, SOPs, tools, yield targets.
- MVP: planting/harvest runbooks + inventory and task tracking.

## 6) Drone deployment (high safety/compliance)
**Inputs needed:** drone platform, safety policy, geofence, CASA compliance plan, on-site E-stop/override.
- MVP: mission plan generator + preflight checklist.
- Later: on-site supervised execution only; integrate logs/telemetry.

## 7) Vehicle sentry / telemetry (observe → incident runbooks)
**Inputs needed:** Fleet API access, vehicle list, what counts as an incident.
- MVP: sentry event triage + runbooks; alerts.
- Hard rule: **no remote driving** via platform.

## 8) Humanoid deployment (supervised execution only)
**Inputs needed:** actual robot interface, on-site safety policy, geofence, E-stop.
- MVP: task plan generator + checklists.
- Later: supervised teleop; never raw motor control over the internet.

---

## Data templates
Fill these in when available:
- `apps/api/data/irrigation.json`
- `apps/api/data/pumps.json`
- `apps/api/data/cameras.json`
- `apps/api/data/contractors.json`
- `apps/api/data/crops.json`
- `apps/api/data/drones.json`
- `apps/api/data/vehicles.json`
- `apps/api/data/robots.json`

See also:
- `docs/TESLA_AND_HUMANOID.md`
