# Encode lessons in structure

Read when a correction recurs or the same instruction is being added again.
Capture the failure class and prefer a mechanism that prevents it over another
paragraph the next reader must remember.

## Pattern

1. Identify the observed failure and whether it is a one-off or recurring pattern.
2. Check existing guardrails before proposing another. Can a data construction,
   type, lint/CI rule, canonical helper, runtime check, or script express the rule?
3. Choose the strongest fitting mechanism: an impossible state, then an enforced
   lint/banned API, helper, or runtime check as appropriate. Agents copy existing
   structure; a weak workaround can become the next template.
4. For a judgment call no mechanism can express, keep one clear instruction with
   an example of the failure rather than duplicating a rulebook.
5. For an approved new guard, demonstrate that it catches a representative old
   failure and permits intended behavior. Retain that negative example where
   useful. A guard that cannot catch the error has not closed the loop.

## Feedback loop

Capture corrections; route one-offs to the relevant task note, recurring issues
to their skill/tool owner, and systemic issues to the appropriate principle or
structure. Close the loop with an in-scope fix or concrete proposed follow-up.
Use the existing `retro` owner when an environment retrospective is requested.

Acknowledging without recording, recording without routing, and fixing one
instance while leaving the class intact all lose the lesson. Once a structural
mechanism owns the rule, remove redundant instructions while preserving necessary
user-facing explanation and approval gates.

This is not permission to rewrite global skills, CI, permissions, or trackers
mid-task. Propose environment changes first and apply them only when authorized.
External ticket creation is publication, not a free substitute for a local note.

Adapted from pstack's `principle-encode-lessons-in-structure` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
