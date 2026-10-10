# Engineering principles

<!-- The trigger table is intentionally wider than prose. -->
<!-- markdownlint-disable MD013 -->

All 24 principles are shared plain references, not skills or a mode. Read this
index independently at `~/.agents/references/principles/README.md`, or through an
existing workflow's pointer. No `SKILL.md`, automatic activation, or principles
slash command is required.

Select the conditions relevant to the task, then read the full matching leaves
before those decisions. Return here if the task changes shape. This index is not
a substitute for their operational guidance; do not load or cite all 24 by rote.

## Authority

Existing user scope, repository instructions, approved pitch/concept contracts,
language semantics, public-test-seam and experiment approvals, permissions, and
resource limits remain authoritative. Reading a principle does not authorize
edits, delegation, spending, publication, or irreversible actions. Applicability
and compatibility caveats live with each leaf.

## Trigger index

| Principle | Read when |
| --- | --- |
| [Laziness protocol](laziness-protocol.md) | A diff, abstraction, layer, or signal path is growing. |
| [Foundational thinking](foundational-thinking.md) | Choosing core data structures, shared state, or work order before logic. |
| [Redesign from first principles](redesign-from-first-principles.md) | A new requirement fits poorly into the existing design. |
| [Attack the premise](attack-the-premise.md) | Two or more fixes sharing one premise fail the same gate. |
| [Subtract before adding](subtract-before-you-add.md) | Sequencing an addition, refactor, or rewrite. |
| [Minimize reader load](minimize-reader-load.md) | Code is hard to trace or depends on hidden mutable context. |
| [Outcome-oriented execution](outcome-oriented-execution.md) | An approved rewrite/migration has declared integration boundaries. |
| [Experience first](experience-first.md) | Product, UX, API, or maintenance tradeoffs arise. |
| [Exhaust the design space](exhaust-the-design-space.md) | A consequential novel choice has multiple viable shapes and no precedent. |
| [Build the lever](build-the-lever.md) | Nontrivial work needs a repeatable transformation or proof. |
| [Model the domain](model-the-domain.md) | Stateful logic grows scattered booleans, branches, or shape assumptions. |
| [Boundary discipline](boundary-discipline.md) | Parsing external data or wiring adapters, validation, and errors. |
| [Type-system discipline](type-system-discipline.md) | Designing types, signatures, variants, or schemas. |
| [Make operations idempotent](make-operations-idempotent.md) | Commands, lifecycle steps, or processing may retry after partial failure. |
| [Migrate callers then delete legacy APIs](migrate-callers-then-delete-legacy-apis.md) | Replacing an internal API with inventoried callers and no external compatibility obligation. |
| [Separate shared state](separate-before-serializing-shared-state.md) | Concurrent actors might write the same file, branch, key, or object. |
| [Prove it works](prove-it-works.md) | Before declaring an output or task complete. |
| [Fix root causes](fix-root-causes.md) | Debugging a reproduced symptom or restart failure. |
| [Sequence verifiable units](sequence-verifiable-units.md) | A sweep, migration, or delivery has multiple coherent steps. |
| [Test behavior](test-behavior-not-implementation.md) | Writing, changing, or retaining a test. |
| [Explain the number](explain-the-number.md) | Trusting/reporting speed, latency, throughput, regressions, or evaluation results. |
| [Guard the context window](guard-the-context-window.md) | Bulk output, long files, repeated reads, or phase size threaten useful context. |
| [Never block on the human](never-block-on-the-human.md) | A reversible implementation choice inside approved scope invites an unnecessary question. |
| [Encode lessons in structure](encode-lessons-in-structure.md) | A correction recurs or the same instruction is being added again. |

## Provenance

Adapted from pstack's 24 `principle-*` documents at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. The local application preserves existing
owners and approvals instead of importing the cut skill stack. See
[the upstream license](../PSTACK-LICENSE) and
[the integration manifest](../../pstack-integration/manifest.json).
