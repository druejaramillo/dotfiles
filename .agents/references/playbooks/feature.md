# Feature

Implement the approved user behavior. Product scope, behavioral contracts, and
language/repository standards remain with their existing owners.

## Establish the contract

Read the originating issue/spec/pitch and repository instructions. If product
scope or the build decision is unsettled, use the existing framing/shaping owner
and stop at its approval boundary. Routine approved maintenance does not acquire
an unnecessary Shape Up ceremony.

For approved work naming concepts or synchronizations, read
`~/.pi/agent/references/concept-integrity.md`. Preserve purpose, action outcomes,
invariants, state ownership, and named synchronization behavior. Ask before
changing undecided consequential behavior or an approved contract.

## Implement in checkable units

1. Trace the existing subsystem and consumer-facing usage. Identify state owners
   and the public seam where the promised behavior will be observed.
2. Choose fitting types/data structures before spreading logic across callers.
   Read [Foundational thinking](../principles/foundational-thinking.md) and
   [Model the domain](../principles/model-the-domain.md) when those choices apply.
3. Reuse established patterns and the relevant language/web/design specialists.
   For a consequential novel choice with multiple viable shapes, read
   [Exhaust the design space](../principles/exhaust-the-design-space.md) and use
   the existing prototype/design owner. Routine work stays direct.
4. Read the existing [TDD](../../skills/tdd/SKILL.md) for agreed public test seams.
   Implement coherent slices, checking each before building on it. Helpers are
   optional and require authorized count, budget, and exclusive writable scope;
   shared primitives and genuinely shared state keep a clear owner.
5. Review the actual diff against repository standards and the originating
   requirements. Use [Code review](../../skills/code-review/SKILL.md) when a
   fixed-diff review is requested/appropriate; preserve Standards and Spec as
   separate axes. Do not commit merely to manufacture a reviewable artifact.
6. Run applicable static/project checks and the real user-facing path. Exercise
   important blocked outcomes and invariants; use the project verification map
   when available. Capture actual side effects and surviving proof artifacts.

## Report

Give the behavior delivered, important implementation choices, checks/evidence,
and unresolved gaps. A missing or wrong-surface proof is not a pass. Use the
existing [PR](../../skills/pr/SKILL.md) for a requested body; no automatic
commit, push, PR, tracker write, or merge follows from implementation.

Adapted from pstack's Feature playbook at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`.
See [the license](../PSTACK-LICENSE) and
[the manifest](../../pstack-integration/manifest.json).
