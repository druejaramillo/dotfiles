# Migrate callers then delete legacy APIs

Read when introducing a replacement internal API with inventoried callers. When
a safe coordinated wave is possible, migrate callers and remove the old path in
that wave rather than keeping two permanent APIs.

## Pattern

- Inventory actual consumers, including tests, strings, docs, examples, and
  indirect references. Internal callers alone do not justify a permanent shim.
- Migrate those callers to the approved new contract and delete the legacy path.
- Treat temporary adapters as deliberate, time-boxed exceptions with an owner
  and removal condition, not default append-only architecture.
- Update behavior checks to the intended contract; remove tests that only pin
  discarded implementation details, not legitimate compatibility obligations.

## Conditions

Apply the coordinated deletion when no external consumer needs backward
compatibility, the project can absorb the wave, and it is part of the approved
simplification/refactor. Dual paths otherwise create extra decisions and slow
cleanup.

Preserve expand-contract delivery when external consumers, deployed versions,
migrations, or the approved plan require it. Use the existing planning/delivery
owner for that sequencing. A local inventory does not prove every external
consumer is absent, and this principle cannot override compatibility policy.

Adapted from pstack's `principle-migrate-callers-then-delete-legacy-apis` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
