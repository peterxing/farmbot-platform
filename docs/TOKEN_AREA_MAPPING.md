# Token ↔ area mapping (v0.1)

Given:
- Total farm area: **242,800 m²**
- Proposed mapping: **1,000 tokens = 1 m²**

Then:
- 1 token = **0.001 m²** (a “milli‑square‑meter” unit)
- Max supply (if you want full coverage):
  - `MAX_SUPPLY = 242,800 × 1,000 = 242,800,000 tokens`

Platform display (non-legal, informational):
- `virtual_area_m2 = (balance / total_supply) × 242,800`

Important risk note:
- Even if you display “area”, the **token should represent platform entitlement**, not a legal interest in land, unless you are intentionally taking the AFSL/MIS path.
