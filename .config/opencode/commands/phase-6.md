---
description: Phase 6: add narrow invariants and spike-discovered gaps, then open the human diff gate.
agent: phase-builder
---

Run only Phase 6, Invariants, for `$ARGUMENTS`, or infer the approved work item
from the current conversation. Read `~/.config/opencode/WORKFLOW.md` and confirm
the approved Phase 5 findings.

Add narrowly scoped assertions, validation, and contract gaps discovered by the
spike. Do not implement the full feature behavior. Complete the shared
adversarial review loop, post a provisional tracker packet after confirmation
when attached, then open `plannotator review --git` on the current phase diff.
Wait for human approval. Only then request the checkpoint commit confirmation,
record its SHA, and stop.
