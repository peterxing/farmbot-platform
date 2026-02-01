# Edge + physical assets requirements (v0.1)

This doc specifies what you need **in real life** so the platform can safely observe and (later) control farm assets.

Core principle: **all physical control happens on-farm** through an edge gateway with a policy/safety gate. Token holders and their Clawdbots never talk directly to pumps/valves/robots.

---

## 0) Phased rollout (safe and realistic)

### Phase A — Observe (MVP-compatible)
- Read-only cameras (RTSP/ONVIF)
- Read-only sensors (weather, soil moisture, tank level)
- Asset inventory + mapping (digital twin)

### Phase B — Advise
- Agents generate plans + schedules + alerts (no actuation)

### Phase C — Assisted control
- Low-risk actions behind human approval (e.g., irrigation zone ON for 15 min)

### Phase D — Autonomous control
- Pre-approved playbooks + hard safety constraints + audit, plus on-site override

---

## 1) On-farm edge “gateway” hardware
Minimum recommended stack:
- **Edge server**: Intel NUC / small x86 box (i7-class) or a mini server
  - runs: gateway service, video proxy, MQTT broker (optional), local database/cache
- **Router**: supports WireGuard/Tailscale and VLANs (MikroTik/Ubiquiti/OPNsense)
- **PoE switch**: for cameras and any PoE sensors
- **UPS**: keep router + edge server + core switch alive
- **Backhaul**:
  - Primary: Starlink
  - Secondary (optional): 4G/5G failover

Network segmentation (important):
- VLAN 10: Cameras
- VLAN 20: IoT/Sensors
- VLAN 30: Actuators/Controls
- VLAN 40: Admin

---

## 2) Cameras (CCTV) requirements
To integrate cleanly:
- Cameras must support **RTSP** (stream) and ideally **ONVIF** (discovery/control).
- Ensure NVR (if present) can expose RTSP per camera and snapshots.
- For MVP: read-only streams are enough.

Implementation requirements:
- A camera registry: `camera_id`, location, orientation, RTSP URL, credentials vault reference.
- A snapshot endpoint: `GET /cameras/{id}/snapshot` (edge-served).
- Optional: motion events via ONVIF or NVR webhook.

---

## 3) Sensors (recommended first set)
You want sensors that connect reliably and are easy to reason about.

### Water system
- Tank level (ultrasonic or pressure)
- Pump power draw (CT clamp) and runtime
- Flow meters on main lines
- Pressure sensors before/after filters

### Irrigation + soil
- Soil moisture per zone (start with 1–2 per zone; calibrate)
- Soil temp (optional)

### Weather
- Rain gauge
- Wind (for spraying constraints)
- Temp/humidity

Protocols / integration:
- Prefer **MQTT** from sensor gateways, or **Modbus TCP** for industrial gear.
- Every sensor reading must include:
  - timestamp (edge time)
  - units
  - quality (ok/bad/missing)

---

## 4) Actuators (irrigation/pumps/valves) requirements

### Irrigation control
- A controllable irrigation controller with:
  - zone ON/OFF
  - runtime limits
  - state feedback (what’s actually ON)

Options:
- Commercial irrigation controller with API
- PLC/RTU (industrial) controlling relays/solenoids
- ESP32-based relay boards (OK for prototypes; harden later)

Minimum implementation requirements:
- Unique IDs for each actuator: `valve_id`, `pump_id`, `zone_id`
- A state model:
  - desired_state vs reported_state
  - last_changed_at
- Safety constraints:
  - max runtime per command
  - interlocks (don’t run pump if tank low; don’t open incompatible zones)
  - rate limits

---

## 5) Robotics (optional in MVP; design now)
If you want real robots later (mower, rover, sprayer):
- Prefer **ROS2** compatible platforms.
- Needs:
  - charging/parking station
  - geofencing
  - human E-stop
  - reliable localisation (often **RTK GNSS** base station on-site)

Integration requirements:
- Robot registry: `robot_id`, capabilities, safety envelope
- Command model: high-level missions (not raw motor commands)
- Telemetry topics: position, battery, faults, camera feeds

---

## 6) Digital twin (the glue between token plots and hardware)
You must map:
- Plot polygons (token allocations) ↔ irrigation zones ↔ physical assets.

Data you need:
- A farm base map (satellite + surveyed points if possible)
- Plot boundaries (initially manual)
- Irrigation layout (pipes, valves, zone coverage)
- Asset locations (GPS pins)

---

## 7) Edge software requirements (gateway)
Functions:
- Securely receive **signed** task requests from the platform
- Verify:
  - request signature
  - entitlement quota (platform)
  - asset locks + schedule
  - safety policy (edge)
- Execute idempotently and report progress

Must-have features:
- Policy engine (allowlist actions + preconditions)
- Concurrency/locking per asset
- Local fallback (if internet down): keep safe state
- Append-only audit log (edge + cloud)

---

## 8) Security + safety requirements (non-negotiable)
- No inbound ports exposed to the internet; use VPN.
- Secrets stored in a vault (even a local encrypted store initially).
- Strong separation between:
  - “view” (cameras)
  - “plan” (agents)
  - “actuate” (edge)
- Physical overrides:
  - manual valves
  - pump kill switch
  - robot E-stop

---

## 9) MVP mapping (what to build while access is pending)
While you don’t yet have CCTV credentials or actuator access:
- Define the registries and APIs now (cameras, sensors, actuators, plots).
- Implement **mock providers** that return plausible state.
- Implement the scheduler + policy engine against those mocks.
- When you get access, swap mock connectors for real ones (RTSP, MQTT/Modbus).
