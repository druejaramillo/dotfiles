---
name: bdfl-mode
description: Opt-in engineering workflow for an investigation, bug fix, feature, refactor, performance issue, or UI migration using the existing stack.
disable-model-invocation: true
license: MIT
metadata:
  upstream: https://github.com/backnotprop/pstack
  upstream-revision: 3a604672c46cd8187d2b19980eae0a34f9f91138
---

# BDFL mode

Coordinate the requested engineering task: understand the actual system, choose
the simplest viable path, make progress within scope, and check the real result.
Apply this workflow to that task and its follow-ups, not unrelated conversation.
If no task was supplied, ask for the task rather than starting a general audit.

## Authority first

Read repository instructions and the originating issue, approved pitch, or spec.
Keep existing product, language, testing, research, and permission owners in
charge of their decisions. For approved work naming concepts or synchronizations,
read `~/.pi/agent/references/concept-integrity.md` before changing behavior.

- An explanation or investigation is read-only. A plan stops before implementation.
- Local implementation follows the requested scope and existing public-test-seam
  approvals. Reversibility is not permission to expand that scope.
- Experiments keep their own plan approval, environment, files, cap, and budget.
- Commits, pushes, PR creation, tracker writes, review replies, merges, deployments,
  destructive cleanup, and paid work require the corresponding authorization.
  Writing a PR body or reporting merge readiness does not grant that authority.
- Make ordinary implementation choices within approved scope without needless
  questions. Ask about product direction, undecided consequential behavior, or
  a missing required approval; report an actual access/prerequisite blocker.

## Choose one path

Paths below are relative to this skill directory. Read the selected playbook or
existing owner before following it. Use one primary path, adding specialists only
when the task calls for them.

<!-- Routing pointers are intentionally kept together in table rows. -->
<!-- markdownlint-disable MD013 -->

| Request | Read |
| --- | --- |
| Explain code, investigate evidence, or recommend an approach | [Investigation](../../references/playbooks/investigation.md) |
| Reproduce and fix a reported defect | [Bug fix](../../references/playbooks/bug-fix.md) |
| Implement approved new behavior | [Feature](../../references/playbooks/feature.md) |
| Reshape code while preserving behavior | [Refactoring](../../references/playbooks/refactoring.md) |
| Diagnose a measured performance problem | [Performance issue](../../references/playbooks/perf-issue.md) |
| Migrate UI while preserving its agreed visual behavior | [Visual parity](../../references/playbooks/visual-parity.md) |
| Explicitly evaluate a skill or prompt variant | [Eval](../../references/playbooks/eval.md); never a setup requirement |
| Frame or shape product scope | `~/.pi/agent/skills/feature-framing/SKILL.md` or `~/.pi/agent/skills/feature-shaping/SKILL.md` |
| Resolve an unsettled implementation plan | [Wayfinder](../wayfinder/SKILL.md) |
| Slice an approved plan into delivery work | [To tickets](../to-tickets/SKILL.md); publication stays explicit |
| Build a throwaway design artifact | [Prototype](../prototype/SKILL.md), then relevant design specialists |
| Run an approved optimization loop | `~/.pi/agent/skills/autoresearch/SKILL.md`; no second experiment ledger |
| Author a skill | [Skill creator](../skill-creator/SKILL.md) and [Writing for agents](../writing-for-agents/SKILL.md) |
| Resume a prior task | `~/.pi/agent/skills/session-search/SKILL.md` and [Handoff](../handoff/SKILL.md) |
| Pause safely | [Handoff](../handoff/SKILL.md); checkpoint only processes this task owns |
| Review a fixed diff | [Code review](../code-review/SKILL.md); keep Standards and Spec separate |
| Write a PR body | [PR](../pr/SKILL.md); preserve Summary/Evidence/Merge Danger |
| Create or clean up a worktree | [Worktrees](../worktrees/SKILL.md); do not normalize another checkout incidentally |
| Improve the environment after a recurring correction | [Retro](../retro/SKILL.md); propose changes before applying them |

<!-- markdownlint-enable MD013 -->

Research, marketing, calendar, desktop customization, and other non-engineering
requests stay with their existing owners. `/review` remains the research command;
code review uses the owner above. No PR watcher, shipping, autonomous-run, or
orchestration workflow is installed by this mode.

## Apply relevant principles

Read [the shared principle index](../../references/principles/README.md) at the
start of the engineering task, then read the full leaves whose conditions apply
before making those decisions. Return to the index if the task changes shape.
The 24 principles are plain references, not skills or a second mode. Other
workflows can read the same index and leaves without activating this router.
Do not load every leaf or recite principle names in the reply.

## Work and check completion

1. State the observable completion check. For a behavior change, identify its
   state owner, user-facing action, and important blocked outcomes/invariants.
2. Read relevant language/domain skills. Use `diagnosing-bugs` for diagnosis and
   the existing `tdd` for agreed public seams; do not substitute another process.
3. Work in coherent, bounded units. Run relevant static/project checks after an
   edit batch, then the appropriate real-surface recipe. Small work stays direct.
4. Use an existing project `verify-<app>` when available. Read its feature index
   and matching recipe. If none exists, use the closest real check and state the
   limits; generating a driver is separate requested work, not an automatic gate.
5. Inspect the actual result and retain evidence. A build, cached screenshot,
   worker summary, wrong-surface check, or incomplete run is not behavioral proof.
6. Report what changed or was learned, what ran and passed, what is blocked or
   unverified, and artifact paths. Publish only within the granted authority.

When project driving needs a reusable owner, explicitly read
[Create a verification skill](../create-verification-skill/SKILL.md) or
[Maintain a verification skill](../maintain-verification-skill/SKILL.md).

## Helpers and tools

Prefer repository harnesses, search/navigation, and deterministic checks. Read
the installed specialist before using its browser, language, Sentry, or CLI tools.
No new model-role file, scheduler, or upstream executable is required.

Use Herdr only when delegation is requested or required by an authorized
workflow. Read [Herdr](../herdr/SKILL.md), require `HERDR_ENV=1`, and establish
worker count, budget, topology, and exclusive writable outputs. Each brief names
the goal, authoritative contract, scope, completion check, prohibited actions,
and report shape. The coordinator owns synthesis and final live driving.
A sequential self-review is not independent review; a missing required reviewer
is a gap or blocked gate. A foreground loop is not a persistent scheduler.

## Provenance

Adapted from pstack's router at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. Local dependencies and deliberate
policy changes are recorded in [the manifest](../../pstack-integration/manifest.json).
Upstream licensing is preserved in [LICENSE](LICENSE).
