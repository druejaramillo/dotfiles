# Build the lever

Read when nontrivial work needs a repeatable transformation or proof. Build the
smallest tool that does or proves the work instead of a manual process a reviewer
must repeat from scratch.

## Pattern

- Do the first unit by hand to learn the recipe when needed. Run the tool against
  that unit and compare with the hand-checked result. Make it safe to rerun.
- Use a codemod/script for edits, a generator for repetitive files, a bounded local
  query for analysis, or a deterministic check for verification.
- Prefer a deterministic pass over fan-out that manually repeats the same recipe.
  Reuse existing tools and harnesses before creating another one.
- When helpers are authorized, provide one shared recipe, verification contract,
  and write fences outside their writable outputs. Workers cannot silently edit
  the contract they are meant to follow.
- Applying this principle produces an inspectable artifact: a codemod, generator,
  script, check, or shared worker recipe. A name in the reply is not an artifact.
- Retain the tool when the work outlives the session. Commit it only when commits
  are authorized; saving a useful artifact does not itself grant publication.

The payoff is both throughput and reviewability: the same operation can be rerun
without trusting an account of hand edits. A one-off can warrant a tool when that
is what makes its result checkable. A couple of obvious edits need not become a
tooling project; consider the existing tool and real cost, not repetition alone.

Keep it small under [Laziness](laziness-protocol.md), never a speculative framework.
This differs from [Encode lessons](encode-lessons-in-structure.md), which turns
recurring corrections into a durable guard, and complements
[Prove it works](prove-it-works.md), which keeps the observation real.

Adapted from pstack's `principle-build-the-lever` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
