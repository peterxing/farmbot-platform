# TaskBounty Solver-Market Hygiene Readback

Buyer-specific fixed-scope packet for TaskBounty / Eliott Reich.

- **Audit/readback:** A$690 fixed
- **Implementation room:** A$2,400 one week, tests and PR follow-through
- **Contact:** info@transhumanism.com.au
- **Settlement after scope confirmation:** invoice or USDC on Base/Polygon to `0x17D7251A8a8d60ab74d7D2B2d20D2a0389871729`
- **Boundary:** no wallet signing, transfers, paid calls, signup, private token use, or legal/payment-term acceptance without Peter approval.

## Why this exists

TaskBounty already exposes useful paid work to autonomous solvers. The failure mode is duplicate effort: a feed can still show an opportunity as open while the upstream GitHub issue is awarded, competing, stale, closed, or already has PR/comment attempts.

The readback turns TaskBounty MCP issue #61 and Peter's proof PR #63 into a buyer-ready market hygiene contract for the public task feed and MCP/API response shape.

## Proof links

- Source issue: https://github.com/eliottreich/taskbounty-mcp-server/issues/61
- Proof PR: https://github.com/eliottreich/taskbounty-mcp-server/pull/63
- Public browse: https://www.task-bounty.com/browse

Observed again on 2026-06-06 UTC: the public TaskBounty browse page still shows five visible tasks and no clean first-attempt candidate. The feed lists `eliottreich/taskbounty-mcp-server` issues #18, #17, and #16 as `AWARDED` with `1 competing` after their 2026-06-01 deadlines, the Langflow issue #8476 task is also `AWARDED`, and the remaining issue-path task is `CLOSED` while still carrying stale first-submission copy. Solver agents should receive that lifecycle, deadline, and competition state directly through the tool/feed layer before spending time cloning, reading comments, and opening duplicate work.

## Audit deliverables

1. Duplicate-risk truth table for `low`, `medium`, `high`, and `unknown` states, including awarded/closed/stale task handling.
2. MCP/API response contract for `_solver_hygiene` with backwards-compatible client display copy.
3. Parser fixture set for upstream GitHub comments containing PR URLs, "Submitted PR #", "Opened PR #", claim/attempt text, maintainer awards, and closed-state signals.
4. Solver-agent ranking rules: `good_to_attempt`, `inspect_first`, `likely_saturated`, and `manual_blocker`.
5. Maintainer-facing copy explaining why a bounty can remain visible while no longer being a clean first attempt.
6. Concise GitHub appendix for issue #61 or README adoption notes.

## Implementation-room add-on

The A$2,400 implementation room covers the full MCP server implementation, unit tests, public feed copy, review iteration, and a short post-merge adoption checklist for agent clients.

## Verification anchor

PR #63 was opened with:

- `node_modules\\.bin\\tsc.cmd`
- `node_modules\\.bin\\tsc.cmd -p tsconfig.test.json`
- `node --test .test-build/**/*.test.js` - 10 passed
- `git diff --check`

Current observed state on 2026-06-02 UTC: PR #63 remains open and the latest GitHub PR metadata reports it is mergeable against `main`. Peter added a 2026-05-29 readback comment noting the public feed exposed one open funded task at that time and revalidated the Windows-safe TypeScript/test path with 10 Node tests passing; the fresh 2026-06-02 browse check now shows that task is no longer a clean open candidate. Recommended next buyer action: review the unchanged `_solver_hygiene` feed contract and merge or request the narrowest remaining adjustment.

2026-06-03 UTC follow-up: authenticated GitHub metadata still shows PR #63 open and mergeable, with no maintainer review comments requiring code changes. This keeps the buyer action unchanged: review the `_solver_hygiene` contract as a low-risk feed-safety patch, or request a smaller split between runtime/test code and buyer-facing documentation.

2026-06-06 UTC follow-up: the public browse page still presents the same awarded/closed queue, so the buyer problem has not expired. The current safe ask remains A$690 for a lifecycle/duplicate-risk readback or A$2,400 to carry the MCP/feed implementation and review follow-through. No TaskBounty claim, submit, signup, wallet signing, paid call, or payment-term acceptance was performed.
