# Separate before serializing shared state

Read when concurrent actors may write the same file, branch, key, or object.
First ask whether they really need one mutable target. Remove unnecessary sharing
before introducing locks; serialize real shared invariants structurally.

## Pattern

1. Identify shared mutable state: writable files, branches, keys, definitions,
   or an invariant more than one actor can change.
2. Default to exclusive outputs. Independent facts can live in per-owner files,
   keys, branches, data directories, or worktrees and be combined at a read/report
   boundary. Two fields in one shared `state.json` are still shared mutation;
   two independently owned state files need not be.
3. When a canonical shared target is a genuine invariant, enforce single-writer
   ownership, sequential phases, a lock, or an appropriate atomic transaction or
   compare-and-swap. Choose the mechanism the environment actually supports.

Instructions and conventions alone are not concurrency control. Ask what shared
invariant requires a lock before treating locking as the default design.

Preserve approved concept state owners and authorized writers. Herdr helpers or
worktree isolation require their existing authority and lifecycle rules; this
principle does not authorize fan-out, checkout restructuring, or resource spend.
Separate workers cannot quietly edit the shared contract they are following.

Adapted from pstack's `principle-separate-before-serializing-shared-state` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
