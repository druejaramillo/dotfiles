# Seven-Phase Workflow

Use this workflow only through `/phase-1` through `/phase-7`. Complete one
phase and its human gate before starting the next one.

## Work Item Resolution

- A tracker reference supplied to a phase command takes precedence.
- Otherwise, use the active conversation to identify the current work item.
- `/phase-1` may start from a raw request. It must not create an issue unless
  the user explicitly asks after the plan is approved.
- If the work item is incomplete, identify missing acceptance criteria,
  constraints, blockers, or Agent Brief details. Do not conceal the gap. The
  user must resolve it or explicitly approve continuing despite it.

## Project Guidance

Before working, read the repository's `AGENTS.md`, tracker instructions,
relevant code, tests, docs, ADRs, and local configuration. Inventory available
project skills in Phase 1. Load a local skill only when its documented trigger
applies, and record the skill in the phase packet.

## Tracker Rules

GitHub Issues are preferred when the repository provides a GitHub tracker.
Read issues with `gh`. Any remote write, including issue creation, assignment,
label changes, comments, closure, or PR creation, requires confirmation.

For an attached GitHub issue, write append-only phase packets. A provisional
packet records the phase outcome, assumptions, local skills used, adversarial
findings and responses, and verification evidence before the human gate. A
post-approval packet records the checkpoint commit SHA when one exists.

When a repository uses `ISSUES.md`, append equivalent dated comments to the
matching issue block. Retain its existing lifecycle. After final verification,
leave the item `ready-for-human`.

## Review Loop

Every phase follows this sequence:

1. Produce only the artifact assigned to the current phase.
2. Delegate an independent audit to `phase-adversarial-reviewer`.
3. Resolve each valid finding or document a concrete reason it is rejected.
4. Request one reviewer recheck.
5. State any unresolved disagreement plainly for the human gate.
6. Post the provisional tracker packet after confirmation when a tracker is attached.
7. Open the phase's Plannotator gate and wait for approval, corrections, or rejection.

Do not retry the reviewer indefinitely. A human resolves remaining disagreement.

## Commits And Completion

Create a local checkpoint commit only after a code phase passes its Plannotator
gate and the user confirms the Git mutation. Include `(#<issue>)` in the commit
message only for an attached GitHub issue. Never push automatically.

After Phase 7, post final verification evidence and ask whether to close the
issue directly or create/link a PR containing `Closes #<issue>`. Do neither
without confirmation.

## Plannotator Gates

- Phase 1: call `submit_plan` with the complete plan after the adversarial plan
  review has been resolved.
- Phases 2, 3, 4, and 6: run `plannotator review --git` and deliberately select
  the uncommitted phase diff against the latest approved checkpoint. Do not
  accept the default `since-base` scope without verifying it is correct.
- Phase 5: run `plannotator annotate <findings-report> --gate` only after the
  spike has been fully restored and the findings have been reviewed.
- Phase 7: run `plannotator review --git` for both the Phase 7 diff and the full
  feature branch against the Phase 1 baseline.

## Phase 5 Safety

Phase 5 runs in the current branch and must begin from a clean, committed
Phase 4 checkpoint. Refuse to start if tracked or untracked work would be put
at risk. Capture `HEAD` and `git status`, perform the temporary implementation,
write a transient findings report, then request confirmation before restoring
the recorded baseline and cleaning temporary spike files. Verify the final
status exactly matches the captured baseline. Never carry spike code or tests
into Phases 6 or 7.

## Phase 7 Testing

Do not use coverage as a target. Classify work before implementation.

- Use test-first red-to-green work for regressions, business rules, state or
  data changes, security-sensitive behavior, concurrency, integrations, and
  complex algorithms.
- Simple wiring or presentation work may proceed directly with targeted
  verification.
- Ask the user when the classification is unclear.
- Test observable behavior through appropriate public seams. Record exact
  commands and concise results for high-risk slices and final verification.
