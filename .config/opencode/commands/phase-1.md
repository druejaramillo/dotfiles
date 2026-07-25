---
description: Phase 1: discover the work, audit the plan, and submit it for Plannotator approval.
agent: phase-planner
---

Run only Phase 1, Discovery, for `$ARGUMENTS`. If no argument is provided, use
the current conversation as the raw request. Read `~/.config/opencode/WORKFLOW.md`
and follow the phase-planner role. Do not make source edits or begin Phase 2.

First verify the Plannotator plugin is available (`plannotator --version` when
read-only shell access permits it) and record any unexpected version or command
failure as a workflow blocker. Resolve an attached issue if supplied; otherwise
investigate the request and repository. Inventory relevant project instructions
and skills, establish the baseline commit when Git is available, produce the
complete plan, run the adversarial review and one recheck, then call
`submit_plan`. Wait for approval or requested revisions.
