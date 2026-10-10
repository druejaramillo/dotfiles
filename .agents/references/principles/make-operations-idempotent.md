# Make operations idempotent

Read when commands, startup, cleanup, migrations, or processing may retry after
partial failure. Re-execution should converge to the intended state rather than
depend on the last run's accident of interruption.

## Pattern

- Reconcile owned state during startup: recognize existing valid resources and
  stale residue instead of blindly creating a second instance.
- Base cleanup decisions on identity/content and ownership, not creation order
  or a process name that might also match the user's session.
- Recover stale locks using reliable ownership/liveness evidence. Do not delete
  a lock whose owner is still active merely to make the command proceed.
- Make supported scheduling/processing retries regenerate valid input and recover
  safely. This principle does not create a scheduler or authorize respawning work
  after a stop request.

For every mutation, ask:

1. What happens if the operation runs twice?
2. What happens if the preceding run stopped partway through each meaningful step?
3. Does another run reconcile that partial state to the same intended outcome?

If recovery depends on unexplained leftovers, add a fitting reconciliation step.
Verification launch/cleanup should leave surviving evidence and avoid shared
instance/data corruption. Preserve user data, external compatibility, and the
actual environment's lifecycle rules; self-healing applies only to owned scope.

Adapted from pstack's `principle-make-operations-idempotent` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
