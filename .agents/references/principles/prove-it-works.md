# Prove it works

Read before declaring an output or task complete. Check the actual thing, not a
proxy, cached observation, compilation result, or worker's account of success.

## Check the real artifact

- Inspect process liveness/ownership directly when the claim depends on it.
- Read the actual value, file, response, or state instead of only a derived cache.
- Exercise the user path and relevant side effect for a behavioral claim.
- When a check fails unexpectedly, inspect the observation method as well as the
  system. A broken harness can create a false conclusion.
- Retain the action, conditions, output/result, and evidence path so someone else
  can understand what was actually established.

A deterministic rerunnable comparison is stronger than a one-time account. Use
the existing harness or build a small check when it makes the result materially
more reliable. Keep its output visible; temporary screenshot files need a named
surviving location if they are part of the proof.

Project `verify-<app>` recipes provide launch/doctor/drive/evidence/cleanup where
available. Generating one is separately requested work; absence of a driver does
not justify invented proof. State incomplete, wrong-surface, blocked, or unrun
checks honestly. Publication/commits require their own authority.

Match the check to the claim: inspect structure, frontmatter, and links for
installed documentation; run behavior for an actual application change. This is
not a requirement for a post-setup acceptance suite or mandatory prompt Eval.
[Explain the number](explain-the-number.md) adds measurement meaning/validity;
this principle establishes that the underlying output is real.

Adapted from pstack's `principle-prove-it-works` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
