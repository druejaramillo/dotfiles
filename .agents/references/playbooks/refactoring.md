# Refactoring

Change structure while preserving approved observable behavior. A discovered bug
or missing feature is separate work, not permission to redefine the contract.

## Pin, reshape, compare

1. Read repository instructions and the approved behavioral contract. For concept
   work, read `~/.pi/agent/references/concept-integrity.md`. Inventory relevant
   callers and external compatibility obligations.
2. Pin current behavior before moving structure: use existing tests, a public
   characterization check, a recorded baseline, or an equivalence harness. Read
   the existing [TDD](../../skills/tdd/SKILL.md) before choosing/changing its test
   seam. Type checking and lint alone are not the behavioral pin.
3. Name the target structure and the reader effort it removes. Read
   [Model the domain](../principles/model-the-domain.md),
   [Redesign from first principles](../principles/redesign-from-first-principles.md),
   and [Minimize reader load](../principles/minimize-reader-load.md) where relevant.
   Already clear, local code need not gain another abstraction.
4. [Subtract before adding](../principles/subtract-before-you-add.md). Move in
   coherent behavior-preserving units, keeping the pin green. Recheck actual
   symbols, strings, docs, examples, and back-references during renames.
5. For internal APIs, read
   [Migrate callers then delete legacy APIs](../principles/migrate-callers-then-delete-legacy-apis.md).
   Use a coordinated wave only when compatibility and the approved plan permit
   it; preserve expand-contract delivery where required.
6. Run applicable static/project checks and compare actual before/after outputs
   or real-surface behavior. Record what changed structurally and what establishes
   equivalence. If reader load did not improve, explain the tradeoff or safely
   undo only your own unhelpful changes.

Larger unsettled work routes to the existing planning owner before execution.
Declared intermediate breakage requires an approved integration boundary; normal
incremental delivery stays stable. No mandatory fan-out or unsolicited rebase.

## Report

State the structure changed, pinned contract, equivalence evidence, reader-load
improvement or tradeoff, and any gaps. Newly requested behavior routes to Feature
or Bug fix. Publication follows separate authority and the existing PR format.

Adapted from pstack's Refactoring playbook at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`.
See [the license](../PSTACK-LICENSE) and
[the manifest](../../pstack-integration/manifest.json).
