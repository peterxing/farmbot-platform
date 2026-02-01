---
name: farmbot-platform
description: "Build/operate the FarmBot Platform: token-gated entitlement accounting, plot allocation, farm work requests, and safe edge execution via an on-farm gateway (CCTV/sensors/irrigation/robots)."
metadata: {"clawdbot":{"emoji":"📦","always":true,"homepage":"https://github.com/peterxing/farmbot-platform"}}
---

# FarmBot Platform skill

Use when you are:
- implementing the platform under this repo
- evolving the agent-first API (agent keys, world snapshot, job queue)
- integrating CCTV/sensors/actuators via a safe edge gateway

Hard rule: no direct actuation from agents; all actuation goes through an edge policy gate with audit logs.
