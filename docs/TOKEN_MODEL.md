# Token model (v0.1) — max supply & entitlement

## What the token represents (recommendation)
Represent **platform entitlement** (capacity rights), not “profit share” and not legal ownership.

Since you described “right to access the land pro‑rata”, treat this as:
- pro‑rata **booking priority / allocation** of platform-managed farm capacity, and
- access mediated by platform rules + safety.

Anything that looks like “fractional land ownership / investment return” increases regulatory risk.

---

## Supply
- Fixed **max supply** minted at genesis.
- Token decimals + symbol chosen later.

---

## Entitlement unit (choose 1 for MVP)
Pick one measurable unit that can later map to real constraints:
1) **Plot-hours/week**: (m² × hours) per epoch.
2) **Ops credits**: abstract unit for tasks (simplest; less precise).
3) **Energy quota**: kWh/month (matches microgrid reality).

Recommendation for MVP: **Ops credits** (easiest), but design the schema so you can switch to plot-hours/kWh.

---

## Entitlement calculation
For epoch E:
- balance_i(E) = token balance of wallet i at snapshot
- supply(E) = total supply
- entitlement_i(E) = balance_i(E) / supply(E) * total_capacity(E)

Where total_capacity(E) is configured (e.g., 10,000 ops credits/week).

---

## Scheduling rule (baseline)
- Each wallet can allocate its entitlement across plots.
- Scheduler uses:
  - earliest-deadline-first + fairness
  - per-plot and per-asset locks
  - safety blocks at edge

---

## Governance (separate from token)
Strong recommendation: keep governance separate (e.g., 2-of-3 multisig for now) so token holders can’t vote unsafe physical actions into existence.
