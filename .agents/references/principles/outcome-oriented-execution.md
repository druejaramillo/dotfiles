# Outcome-oriented execution

Read during an approved rewrite/migration with explicit phase boundaries. Aim
for the intended verified end state without accumulating throwaway compatibility
code solely to make every intermediate edit look finished.

## Guardrails

- Declare where intermediate breakage is acceptable before relying on it.
- Keep that breakage scoped, reversible, isolated, and compatible with the
  approved integration/delivery boundary.
- Keep high-signal checks on actively touched areas while migrating.
- Run applicable full static/project and real-behavior checks at the agreed
  integration boundary before calling the target complete.

Stable intermediate states remain the default for normal delivery and shared
branches. This principle cannot approve breakage retroactively, relax an approved
concept contract, bypass external compatibility, or leave an unverified target.
Use [Sequence verifiable units](sequence-verifiable-units.md) for coherent phases
that can each be checked under the agreed migration contract.

Applicable verification depends on the real output. Documentation/setup work
gets structural checks; it does not require unrelated application runs or
post-setup behavioral trials. An application migration still needs behavioral
proof before claiming the application works.

Adapted from pstack's `principle-outcome-oriented-execution` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
