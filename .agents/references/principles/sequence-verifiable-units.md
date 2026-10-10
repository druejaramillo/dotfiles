# Sequence verifiable units

Read for multi-step changes, migrations, sweeps, or delivery slices. Work in
coherent units with a checkable boundary before building more work on them.

## Execution

Record the real baseline and preserve existing user changes. A unit brackets one
meaningful change with its before/after checks. Run applicable checks after that
coherent batch, not after every individual line edit. A rerunnable lever makes
per-unit checking cheap; do not wait until an entire sweep hides the failing unit.

Choose the unit to match the contract: a behavior slice, baseline capture before
a treatment, scaffolding before dependent work, or a subtraction before a reshape.
A planned migration can use explicitly approved integration boundaries under
[Outcome-oriented execution](outcome-oriented-execution.md).

Do not rebase merely to satisfy a recipe. Record the actual base/head, establish
a suitable baseline, and perform rebases or history changes only within authority.

## Delivery evidence

For a bug with the agreed test seam, preserve failing-before/passing-after evidence
under the existing [TDD](../../skills/tdd/SKILL.md) owner. Arrange authorized
commits/PRs to tell that story when appropriate, while keeping landing/CI policy.
A separately landable failing-test commit is not mandatory, and preserving red
proof does not authorize a commit or broken shared branch.

A reviewer should be able to follow the evidence from known baseline to checked
change. [Prove it works](prove-it-works.md) keeps each observation real;
[Build the lever](build-the-lever.md) makes checks/transforms repeatable.

Adapted from pstack's `principle-sequence-verifiable-units` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
