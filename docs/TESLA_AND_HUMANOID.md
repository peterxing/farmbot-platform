# Tesla vehicle sentry + humanoid robot (agent-first requirements)

## Guiding safety rule
- The platform must never allow an internet user/agent to directly drive a vehicle or directly move a humanoid in an uncontrolled way.
- Start with **observe → plan → supervised execution**.

---

## A) Tesla “Sentry” (and fleet telemetry)
### MVP capabilities
- Read-only vehicle telemetry (battery, location, state)
- Sentry event ingestion (timestamps, event types)
- Camera snapshots/clips *only if available through supported, user-authorised interfaces*
- Alerting + runbooks:
  - suspicious activity → notify operator
  - repeated events → dispatch contractor/security patrol

### Implementation requirements
- Tesla **Fleet API** integration (OAuth)
- Token storage and revocation
- Rate limits and privacy controls
- Clear policy: **no remote driving** (ever via platform)

### Key agent tools
- `vehicle.get_state()`
- `vehicle.get_sentry_events()`
- `vehicle.create_incident_runbook()`

---

## B) Humanoid robot (Optimus) deployment
### MVP posture
Treat humanoid as a **task executor** behind an on-site safety perimeter:
- Agents can create *task plans* and *teleop scripts*
- Execution requires:
  - on-site supervisor
  - physical E-stop
  - geofence
  - activity logging

### Implementation requirements
- Robot interface abstraction (likely via ROS2 bridge or vendor SDK when available)
- Telemetry:
  - joint state, battery, faults
  - live video stream
  - pose/localisation
- Command model:
  - high-level tasks ("carry", "inspect", "pick", "place")
  - never raw motor control over the internet

### Key agent tools
- `robot.get_state()`
- `robot.propose_task_plan()`
- `robot.request_supervised_execution()`
- `robot.log_outcome()`

---

## Suggested phased rollout
1) Vehicle: telemetry + sentry event runbooks
2) Humanoid: checklists + supervised teleop
3) Add connectors once hardware + credentials exist
