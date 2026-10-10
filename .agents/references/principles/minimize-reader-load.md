# Minimize reader load

Read when code is hard to trace or depends on hidden mutable context. Maintenance
cost has two independent axes: layers between a question and its answer, and
state the reader must keep in mind.

A flat file with many globals can be as difficult as a deep adapter stack. Line
count and complexity scores are indicators, not substitutes for understanding.
This complements [Guard the context window](guard-the-context-window.md).

## Pattern

- Collapse layers that cost more than they hide: unnecessary one-caller wrappers,
  adapters without a real alternate implementation, and speculative indirection.
- Make adjacent layers change the abstraction. Repeating the same methods and
  arguments adds a second surface without compressing meaningful decisions.
- Prefer interfaces that hide actual complexity. A broad surface exposing every
  representation requires the reader to learn both the interface and internals.
- Shrink mutable scope: prefer pure transformations and locals where fitting;
  derive state instead of synchronizing another copy. Ownership matters as well
  as whether the value is a field, module variable, or global.
- Name a shared invariant at its authoritative boundary, not as repeated advice
  in each consumer. Preserve that owner through refactoring.
- Before adding indirection or state, identify the reader work it removes and
  compare that benefit to the new work it introduces.

Ask whether a new reader can quickly answer where a value comes from and what
can change it. Use source searches and concrete examples to find the burden,
not a hard thirty-second/file-count mandate. Keep useful repository boundaries,
public contracts, and searchable identifiers rather than flattening everything.

Adapted from pstack's `principle-minimize-reader-load` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
