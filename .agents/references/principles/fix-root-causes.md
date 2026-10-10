# Fix root causes

Read when debugging a reproduced symptom. Identify its demonstrated mechanism
instead of adding a guard that only masks the failure.

## Pattern

- Reproduce first using the existing `diagnosing-bugs` owner and affected surface.
- Ask why until a causal mechanism survives discriminating runtime evidence.
- Instrument within authorized scope when state is unclear; read the actual
  logs/error rather than guessing from a plausible code path.
- Do not add a nil check merely to silence a crash without understanding it.
  Keep legitimate boundary validation and real error handling; those are not
  symptom fixes when they enforce the intended contract.
- Investigate a workaround's constraint before adding another. Prefer a fitting
  structural fix when possible. Preserve useful API contracts, legal headers,
  directives, and non-obvious rationale; a long comment alone does not prove the
  underlying code is wrong.
- Search for the same defect pattern, not only the instance. Fix related instances
  only within granted scope; report the rest instead of expanding the task.

## Restart failures

Suspect stale persistent state as well as code: configuration, caches, lockfiles,
or serialized state. If an isolated reproduction or approved reset restores
behavior, investigate state validation and reconciliation. Do not erase a user's
state file just to test that hypothesis; use a safe copy or authorized reset.

Revert only your own disproven changes. A causal claim must connect the observed
symptom to evidence, not merely to a successful-looking workaround. The existing
diagnosis workflow remains authoritative for its steps and stop conditions.

Adapted from pstack's `principle-fix-root-causes` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
