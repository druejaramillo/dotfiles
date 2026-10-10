# Bug fix

Fix the reproduced defect, not a guessed neighboring problem. Keep the existing
diagnosis workflow, public test seams, and granted implementation scope.

## Work from evidence

1. Read [Diagnosing bugs](../../skills/diagnosing-bugs/SKILL.md) and the relevant
   repository/language guidance. Reproduce the reported symptom on its affected
   interface using an existing driver or public entry point. Record the actual
   command/action, conditions, and failing result.
2. Trace candidate mechanisms with source and runtime evidence. Inspect scoped
   history when a regression calls for it. Instrument within authorized scope
   rather than repeatedly guessing. Read [Fix root causes](../principles/fix-root-causes.md).
   After repeated failed fixes sharing a premise, read
   [Attack the premise](../principles/attack-the-premise.md) before another attempt.
3. Read the existing [TDD](../../skills/tdd/SKILL.md) before establishing/changing
   its public test seam. Preserve its approval requirements. When a cheap,
   appropriate regression check exists, capture red before the fix and green
   after. If another real check is necessary, state its coverage limits.
4. Make the smallest fix the evidence justifies. Safely discard only your own
   refuted changes. Report related out-of-scope defects instead of enlarging the
   task. Use direct implementation unless helpers are explicitly authorized.
5. Run relevant checks after a coherent edit batch, then reproduce on the same
   affected surface. Read the project driver's matching feature recipe when one
   exists. A unit test, build, wrong-surface check, or inconclusive result does
   not establish that the original symptom is gone.
6. Retain the before/after evidence and clean owned diagnostic/drive residue.
   A blocked reproduction or missing prerequisite remains a reported gap.

Use [Test behavior](../principles/test-behavior-not-implementation.md) and
[Sequence verifiable units](../principles/sequence-verifiable-units.md) at the
relevant decision points. Red/green evidence does not require a separately
landable failing-test commit or an unsolicited rebase.

## Report

State the symptom, demonstrated root cause, narrow fix, exact failing/passing
checks, evidence paths, and limits. Commits, pushes, PR creation, and other
publication are separate authorized work; a requested PR body uses the existing
[PR](../../skills/pr/SKILL.md) format.

Adapted from pstack's Bug fix playbook at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`.
See [the license](../PSTACK-LICENSE) and
[the manifest](../../pstack-integration/manifest.json).
