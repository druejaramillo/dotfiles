# Subtract before you add

Read when sequencing an addition, refactor, or rewrite. Remove unnecessary
complexity before building on it; this often reveals the actual next design.

## Pattern

- Remove dead code, obsolete references, and genuinely redundant validation
  before adding new structure within the requested scope.
- Cut to the useful minimum before polishing. Do not perfect a surface whose
  removal would better solve the problem.
- Design for observed use and the approved spec, not speculative edge cases.
- Preserve necessary parsers, error handling, security/invariant guards, and
  external compatibility. Their purpose is not erased by calling them redundant.
- Simplify prompts by removing duplicate instructions and excessive templates.
  Remove a reference with no unique role instead of leaving an empty stub.

Make simplification a continual investment behind a coherent same-or-smaller
surface. Adding to accidental complexity compounds it; subtraction can expose
which foundations matter under [Foundational thinking](foundational-thinking.md).

Removal still respects product direction, concept contracts, resource ownership,
and compatibility obligations. Do not broaden a small task into unrelated cleanup
or delete required behavior to improve a code-size metric.

Adapted from pstack's `principle-subtract-before-you-add` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
