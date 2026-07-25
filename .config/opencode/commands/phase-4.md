---
description: Phase 4: map integration TODOs and dependencies, then open the human diff gate.
agent: phase-builder
---

Run only Phase 4, Integration Map, for `$ARGUMENTS`, or infer the approved work
item from the current conversation. Read `~/.config/opencode/WORKFLOW.md` and
confirm Phases 1 through 3 are approved.

Add ordered, observable TODOs at every affected runtime touchpoint. State their
dependencies and the recommended first slice. Do not implement the feature or
quietly perform exploratory work. Complete the shared adversarial review loop,
post a provisional tracker packet after confirmation when attached, then open
`plannotator review --git` on the current phase diff. Wait for human approval.
Only then request the checkpoint commit confirmation, record its SHA, and stop.
