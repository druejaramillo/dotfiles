# Guard the context window

Read when bulk output, long files, repeated reads, or phase size threaten useful
context. Keep the coordinating conversation focused on what the decision needs.

## Pattern

- Bound reads and use local search/queries before loading entire logs or documents.
  Keep bulky raw evidence in artifacts with exact pointers and useful summaries.
- Delegate a large payload only when a helper is authorized and worthwhile.
  Give it a bounded question and expected evidence-backed return; do not create
  agent fan-out as a substitute for a cheap deterministic query.
- Keep material genuinely needed on every invocation near the steps using it.
  Disclose branch-specific detail through precise conditional file pointers.
- Size phases and cap scope according to file/payload size, turn/resource limits,
  and the mechanism's cost. End phases with sufficient state for a cold resume.

Summaries are navigation aids, not proof. Retain original outputs and inspect the
real artifact when a claim depends on it. Load full relevant principle/playbook
leaves when needed rather than trusting a slogan in an index.

Use only task-relevant authorized sessions and sources. A context problem does
not justify reading unrelated private chats or escaping task/model budgets.

Adapted from pstack's `principle-guard-the-context-window` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
