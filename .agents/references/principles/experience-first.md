# Experience first

Read when product, UX, API, feature-scope, or maintenance tradeoffs arise. Optimize
for the consumer's experience rather than only implementation convenience.

- Justify each feature, control, and option by the workflow it serves.
- Prefer a smaller polished scope to a larger rough scope.
- Use a throwaway prototype to explore unsettled experience before expensive
  production work when that is the appropriate authorized design step.
- Attend to feedback, error states, transitions, alignment, spacing, and the
  details that affect the core interaction.
- Tighten the central workflow instead of adding options that distract from it.

The consumer can be an end user, a colleague importing a library/internal API, or
the next engineer maintaining the code. Explain consequences from their point of
view, not merely as implementation savings.

Existing framing/shaping, UI specialists, prototypes, and approved behavioral
contracts remain authoritative. A scope cut narrows the use case or defers whole
behavior; it does not silently break an approved concept's purpose or invariants.

Foundations should serve the experience.
[Foundational thinking](foundational-thinking.md) governs work order; this
principle governs the target the work serves.

Adapted from pstack's `principle-experience-first` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
