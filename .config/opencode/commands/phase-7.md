---
description: Phase 7: implement and verify the approved feature with risk-based test-first work.
agent: phase-builder
---

Run only Phase 7, Final Implementation and Verification, for `$ARGUMENTS`, or
infer the approved work item from the current conversation. Read
`~/.config/opencode/WORKFLOW.md` and confirm the approved outputs of all earlier
phases.

Classify each behavior using the workflow's risk rubric. Use test-first
red-to-green work for high-risk behavior, use targeted verification for simple
wiring or presentation changes, and ask the user if classification is unclear.
Do not target coverage percentages. Complete acceptance-criteria evidence,
perform the shared adversarial review loop, and post a provisional tracker packet
after confirmation when attached.

Open `plannotator review --git` for both the final phase diff and the complete
feature diff from the recorded Phase 1 baseline. Wait for human approval. Only
then request the final checkpoint commit confirmation, record its SHA and final
verification, and ask whether to close the issue or create/link a PR. Stop.
