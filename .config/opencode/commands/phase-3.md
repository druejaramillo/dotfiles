---
description: Phase 3: define approved contracts and stubs, then open the human diff gate.
agent: phase-builder
---

Run only Phase 3, Contracts, for `$ARGUMENTS`, or infer the approved work item
from the current conversation. Read `~/.config/opencode/WORKFLOW.md` and confirm
Phases 1 and 2 are approved.

Add only public seams, signatures, module boundaries, stubs, constants, and
module state. Identify behavior-facing test seams. Do not implement real feature
behavior or integration wiring. Complete the shared adversarial review loop,
post a provisional tracker packet after confirmation when attached, then open
`plannotator review --git` on the current phase diff. Wait for human approval.
Only then request the checkpoint commit confirmation, record its SHA, and stop.
