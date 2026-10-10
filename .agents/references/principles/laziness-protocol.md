# Laziness protocol

Read when a diff, abstraction, layer, or new signal path is growing. Aim for the
most useful result with the least code and maintenance complexity.

- **Prefer deletion.** During a refactor/improvement, look for unnecessary
  structure before adding more.
- **Keep the path understandable.** A useful interface that hides meaningful
  complexity is not pointless depth. If answering one question requires tracing
  several thin layers/files, examine whether flattening helps; a three-file
  heuristic is not a hard architecture limit.
- **Consolidate decisions.** Make a repeated choice in one authoritative place
  and pass its result rather than rediscovering it in each caller.
- **Minimize the diff.** Make the smallest sufficient change, not elegant-looking
  boilerplate or an unrelated cleanup sweep.
- **Question signal threading.** Before carrying another signal through types,
  schemas, and pipelines, look for a simpler path that preserves the contract.
- **Notice small leaks.** Pass-through wrappers, representation leaks, and
  duplicated choices can compound into permanent coordination costs.

Ask whether the next maintainer would find the result exhausting to understand.
[Minimize reader load](minimize-reader-load.md) examines both indirection and
hidden state. Preserve boundaries that hide real decisions, language conventions,
and approved behavior rather than cutting them to satisfy a line/file count.

Deletion and simplification remain inside the task's authority and compatibility
obligations. Saving code is not a reason to change a product or concept contract.

Adapted from pstack's `principle-laziness-protocol` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
