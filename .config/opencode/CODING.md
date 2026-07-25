# Coding Workflow

This directory defines a global, human-gated coding workflow for OpenCode. It
uses Prime Agent's incremental design sequence, a separate adversarial reviewer,
Plannotator approval gates, and risk-based testing. It is process guidance, not
a replacement for a repository's `AGENTS.md`, documentation, or local skills.

## Start Here

Run each phase explicitly and complete its approval gate before starting the
next one:

```text
/phase-1 #123
/phase-2
/phase-3
/phase-4
/phase-5
/phase-6
/phase-7
```

Pass a GitHub issue number or `ISSUES.md` identifier when available. The
reference takes precedence over chat context. Without a reference, commands use
the current conversation; `/phase-1` may start from a raw request. It never
creates an issue unless asked after plan approval.

Start only after reading the active project's `AGENTS.md`, tracker instructions,
and relevant local skills. The workflow loads a project skill only when its
documented trigger applies.

## Roles

| Role | Responsibility | Authority |
| --- | --- | --- |
| `phase-planner` | Runs Phase 1 discovery and submits the plan. | Cannot edit source files. |
| `phase-builder` | Runs exactly one approved code-oriented phase. | May edit locally and run normal build/test commands. |
| `phase-adversarial-reviewer` | Audits each phase independently. | Read/search and Git inspection only; cannot edit or delegate. |

The planner and builder use the configured default model in separate contexts.
The reviewer is not a human approval substitute.

## The Seven Phases

| Command | Phase | Deliverable |
| --- | --- | --- |
| `/phase-1` | Discovery | Code map, constraints, risks, test seams, baseline, and implementation plan. |
| `/phase-2` | Structures | Types, schemas, state shapes, and structural scaffolding only. |
| `/phase-3` | Contracts | Public seams, signatures, stubs, constants, and module boundaries only. |
| `/phase-4` | Integration Map | Ordered observable TODOs at affected runtime touchpoints. |
| `/phase-5` | Exploratory Audit and Restore | Disposable full-path spike, validation evidence, and restored findings report. |
| `/phase-6` | Invariants | Narrow assertions, validation, and gaps revealed by the spike. |
| `/phase-7` | Final Implementation and Verification | Complete behavior, risk-based tests, acceptance evidence, and final review. |

Do not pull work forward. For example, Phase 2 does not implement behavior,
Phase 4 does not perform the spike, and Phase 6 does not complete the feature.

## Review And Approval

Every phase follows the same sequence:

1. Produce only the current phase's artifact.
2. Delegate an independent audit to `phase-adversarial-reviewer`.
3. Fix supported findings or document evidence for rejecting them.
4. Request exactly one reviewer recheck.
5. Surface unresolved disagreement to the human reviewer.
6. Record a provisional tracker packet when a tracker is attached and the
   remote write is approved.
7. Open the required Plannotator gate and stop.

The required human gates are:

| Phase | Plannotator gate |
| --- | --- |
| 1 | `submit_plan` |
| 2, 3, 4, 6 | `plannotator review --git` scoped to the uncommitted phase diff |
| 5 | `plannotator annotate <findings-report> --gate` after restoration |
| 7 | `plannotator review --git` for the final diff and the full feature diff from the Phase 1 baseline |

Do not accept Plannotator's default `since-base` scope without verifying it is
the intended diff. Plannotator approval is a hard stop, not a suggestion to
continue automatically.

## Tracker And Commit Policy

GitHub Issues are the preferred durable ledger. Use `gh` to read the complete
issue and comments. Tracker writes require confirmation. For every phase,
append a packet that records the artifact, assumptions, relevant local skills,
review findings and responses, verification evidence, and checkpoint SHA.

`ISSUES.md` is the fallback. Append equivalent dated comments to the matching
block. After final verification, leave it in `ready-for-human`.

After a code-producing phase is approved, request confirmation before creating
a local checkpoint commit. Include the GitHub issue reference when one exists:

```text
feat: add inventory contracts (#123)
```

Never push automatically. After Phase 7, ask whether to close the issue or
create/link a PR using `Closes #123`.

## Phase 5 Safety

Phase 5 runs in the current branch but must start from a clean, committed Phase
4 checkpoint. It captures `HEAD` and `git status`, makes the exploratory
implementation only at mapped TODO sites, validates it, and writes a transient
findings report. It then asks before restoring the baseline and cleaning the
spike files.

The final worktree status must match the captured baseline exactly. Do not carry
spike implementation or tests into Phases 6 or 7. Carry only the reviewed
findings forward.

## Testing Policy

Coverage is not a target. Phase 7 classifies work by risk:

- Work test-first for regressions, business rules, state or data changes,
  security-sensitive behavior, concurrency, integrations, and complex
  algorithms.
- Use targeted verification for simple wiring or presentation work.
- Ask for a decision when the classification is unclear.
- Test observable behavior through public seams rather than private internals.
- Record the exact commands and concise results for high-risk slices and final
  verification.

## Permissions

The workflow does not override global permissions. OpenCode's built-in `plan`
and `build` agents retain their normal permissions and can be selected whenever
the seven-phase process is not appropriate.

Restrictions belong only to the workflow agents. The builder may make local
edits and run ordinary project commands, but it asks before destructive
operations, checkpoint commits, pushes, and GitHub writes. The planner cannot
edit source files. The adversarial reviewer is read-only.

Use no automatic pipeline runner, custom workflow tool, MCP server, or PR
automation for this process. The commands, agents, OpenCode permissions,
Plannotator, and explicit human approvals are the control system.

## Configuration Map

| Path | Purpose |
| --- | --- |
| `opencode.json` | Global model, plugin, default-agent, and permission configuration. |
| `WORKFLOW.md` | Agent-facing canonical process rules. |
| `agents/phase-planner.md` | Phase 1 role and permissions. |
| `agents/phase-builder.md` | Code-phase role and permissions. |
| `agents/phase-adversarial-reviewer.md` | Read-only independent reviewer. |
| `commands/phase-1.md` through `commands/phase-7.md` | Explicit phase entry points. |

OpenCode loads this configuration only at startup. Quit and restart OpenCode
after changing `opencode.json`, agents, commands, plugins, or this workflow
documentation.
