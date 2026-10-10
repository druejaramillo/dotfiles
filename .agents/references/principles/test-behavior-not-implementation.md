# Test behavior, not implementation

Read when writing, changing, or retaining a test. Use the agreed public seam and
assert the consumer-visible result against an independently known expectation,
not merely how the implementation was arranged.

## Check defect sensitivity

Ask what realistic defect the assertion would catch. Returning no result,
skipping the action, writing a wrong value, or mishandling a branch should make
an appropriate behavior check fail. The exact mutation depends on the language
and required contract; `undefined` is an illustrative case, not a universal test.

Common shapes that may miss the defect:

- **Weak/no assertion:** only truthiness, existence, type, no throw, or a count
  greater than zero instead of the relevant expected result.
- **Mock/absence only:** only that a call happened/did not happen, or an empty or
  absent value without demonstrating the intended branch and contrast.
- **Self-referential:** computing the expected value through the same subject or
  shared implementation whose mistake the test should detect.
- **Constant pin:** restating a hand-maintained default, prompt string, or config
  value without exercising the mechanism that uses it.
- **Fixture checks fixture:** asserting only data assembled by the fixture while
  the subject never runs in the checked behavior.

These are review prompts, not blanket bans. An absence, error, no-write outcome,
or empty collection can be the exact user contract. Exercise that branch with
an independent expectation and useful contrast/sensitivity; do not delete a
legitimate blocked-outcome assertion merely because it checks absence.

## Strengthen the check

Call the subject through its public behavior with a concrete input and assert
its independently expected result or observable side effect. Prefer explicit
values for simple examples; an independent oracle, approved snapshot, relation,
or compile-time assertion can fit more complex behavior.

For a boundary fake/mock, inspect the payload or resulting effect where that
establishes the contract, not only the fact a call occurred. Keep meaningful
relations across authoritative tables and language type checks. Remove only a
truly unhelpful check when no required behavior is lost.

Read the existing [TDD](../../skills/tdd/SKILL.md) before choosing/changing public
test seams and preserve its approvals. This is test-quality guidance, not another
TDD workflow or a mandate to run integration acceptance trials during setup.

Adapted from pstack's `principle-test-behavior-not-implementation` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
