# Foundational thinking

Read before choosing core data structures, shared state, or work order. Structural
decisions preserve options; local code choices preserve simplicity.

## Data structures first

Choose the shape before spreading logic across callers. Trace meaningful access
paths and select structures that fit them. Types and domain models should
converge, but three similar statements can be cheaper than an invented abstraction:
share the structure, not every coincidental line.

Prefer explicit code. Test behavior and edge cases rather than line counts. Each
increment should establish or deepen a coherent abstraction, not distribute new
special-case coordination across consumers. Preserve approved concept state and
invariant ownership; the notation does not require a package for every concept.

## Concurrency

Before sharing state, ask what happens if another actor changes it concurrently.
If the answer matters, isolate unnecessary shared targets under
[Separate shared state](separate-before-serializing-shared-state.md). Use structural
serialization for genuine shared invariants, not instructions to be careful.

## Useful foundations first

When every later phase benefits from a fitting scaffold, place it early: actual
build/test infrastructure, CI, or shared types that the approved work needs.
Sequence setup before dependent work and capture the failing behavior before a
fix when the existing test workflow calls for it. Keep units coherent.

Subtract dead/redundant structure before scaffolding. This is not permission for
speculative infrastructure, another architecture layer, or an unsolicited CI or
product redesign. [Experience first](experience-first.md) determines the target
these foundations should serve.

Adapted from pstack's `principle-foundational-thinking` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
