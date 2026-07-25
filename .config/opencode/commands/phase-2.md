---
description: Phase 2: add only approved data structures and structural scaffolding, then open the human diff gate.
agent: phase-builder
---

Run only Phase 2, Structures, for `$ARGUMENTS`, or infer the approved work item
from the current conversation. Read `~/.config/opencode/WORKFLOW.md`. Confirm
the approved Phase 1 plan before changing files.

Define only the needed types, schemas, state shapes, payloads, error/result
shapes, and structural shells. Do not implement feature behavior, public
contracts, integration wiring, or tests for future phases. Complete the shared
adversarial review loop, post a provisional tracker packet after confirmation
when attached, then open `plannotator review --git` on the current phase diff.
Wait for human approval. Only then request the checkpoint commit confirmation,
record its SHA, and stop.
