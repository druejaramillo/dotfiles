# Attack the premise

Read when two or more fixes sharing one premise fail the same gate. Suspect the
premise before trying another fix that assumes it.

## Pattern

- **Write the premise down.** State the sentence every failed fix assumed.
- **Take a census before the next fix.** For an imbalance across actors, count
  which actors hold it, not only its aggregate size. Make the census rerunnable
  following [Build the lever](build-the-lever.md).
- **Read the skew.** If the same few actors hold most of the imbalance on each
  run, find what assigns that role. That assignment is the next mechanism to
  investigate under [Fix root causes](fix-root-causes.md).
- **Remove the asymmetry instead of compensating for it.** Rotate, randomize, or
  move the assignment so one actor does not repeatedly hold the role. A shared
  pool, return path, batched handoff, or periodic rebalance may leave the
  assignment in place while adding recurring work. Apply
  [Laziness](laziness-protocol.md) to that tradeoff.

Do not start another fix under the same premise before recording it and the
relevant evidence. If the census is even across actors, that premise does not
explain the imbalance: look elsewhere and retain the census. For a different
kind of premise, use the corresponding discriminating observation rather than
forcing an unrelated actor census.

Repeated failure is evidence about an assumption, not proof of an alternative.
This differs from [Redesign from first principles](redesign-from-first-principles.md),
which integrates a new requirement into a design.

Adapted from pstack's `principle-attack-the-premise` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
