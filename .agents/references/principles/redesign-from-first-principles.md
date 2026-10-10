# Redesign from first principles

Read when a new requirement fits poorly into the existing design. Ask what the
design would have been if that requirement had existed from the start rather
than automatically adding another special case.

## Pattern

- Read affected files and understand the current design and constraints.
- Sketch the minimal fitting shape if building with the new requirement today.
- Propagate approved changes through real consumers, types, docs, examples,
  and rationale where they are affected; do not leave inconsistent references.
- Think about the coherent target, then deliver it incrementally through
  [Sequence verifiable units](sequence-verifiable-units.md).

This preserves design options without granting a wholesale rewrite. Keep the
approved scope, purpose, action outcomes, invariants, synchronizations, and
external compatibility intact. Ask before changing consequential undecided
behavior or a contract rather than treating architecture cleanliness as permission.

A sketch can show that the present design already fits. In that case, prefer the
small direct change over an unnecessary new abstraction. This differs from
[Attack the premise](attack-the-premise.md), which questions an assumption behind
repeated failed fixes rather than integrating a new requirement.

Adapted from pstack's `principle-redesign-from-first-principles` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
