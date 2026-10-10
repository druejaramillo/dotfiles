# Model the domain

Read when stateful logic grows scattered booleans, branches, or repeated shape
assumptions. Choose a fitting structure that gathers the domain's knowledge and
invariants instead of distributing them across execution steps.

## Structures to consider

- A state machine instead of loosely synchronized lifecycle flags/phases.
- A typed model instead of loose parameters and repeated shape assumptions.
- A map, registry, lookup table, or variant instead of branching spread across
  several consumers.
- A reducer or command/event model instead of ad hoc mutation.
- A module centered on one body of knowledge or invariant, rather than generic
  load/validate/transform/save modules that repeat domain decisions.
- A queue, cache, index, graph, tree, or normalized collection suited to the real
  access pattern.
- Another minimal structure that captures what must never be allowed and how
  the data is read, when the standard shapes do not fit.

A second boolean that must stay synchronized with the first, or one more branch
added to a distributed if/else chain, is a prompt to inspect the model. Temporal
module names can conceal repeated knowledge across phases; execution order is
not ownership.

Do not force an abstraction. Keep boring local code when its shape is already
clear and unlikely to grow. An abstraction earns its cost by removing invalid
states, duplicate rules, branches, or lifecycle risk, not by naming a pattern.

Use [Domain modeling](../../skills/domain-modeling/SKILL.md) for vocabulary and
approved concept guidance for behavioral boundaries. Preserve logical state and
invariant owners; this implementation complement does not prescribe a package
per concept or replace approved action/synchronization contracts.

Adapted from pstack's `principle-model-the-domain` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
