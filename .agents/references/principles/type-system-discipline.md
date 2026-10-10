# Type-system discipline

Read when designing types/signatures, variants, or authoritative schemas. Use the
language's actual type system to construct valid states and expose cases callers
must handle; do not claim the compiler proves a runtime fact it cannot establish.

## Patterns

- **Make invalid combinations unrepresentable.** Model meaningful variants rather
  than a bag of flags/optional fields that admit contradictions. For example, a
  completed flag plus optional completion time can disagree; derive the flag
  or use explicit open/done variants. Use discriminated unions, payload enums,
  sealed classes, or the fitting idiom available in the language.
- **Construct rather than restrict.** A nonempty list can be a head plus rest;
  a valid time range can be a start plus a nonnegative duration instead of two
  independently ordered timestamps. Choose the valid construction and expose
  the interface consumers need. Constructor validation still matters where the
  type cannot represent every constraint.
- **Distinguish semantic identities.** IDs sharing a primitive representation
  need not be interchangeable. Use a fitting defined type, newtype, opaque type,
  or brand, and respect the actual guarantees of conversions/zero values.
- **Parse external data.** JSON, RPC, IPC, CLI/config, environment values, and
  persisted rows cross boundaries. Construct typed domain data at those points
  under [Boundary discipline](boundary-discipline.md).
- **Do not lie to the compiler.** Trace unsafe casts/assertions to their boundary.
  Validate/narrow, improve the representation, or state the remaining hazard.
  Silencing the compiler is not proof of a valid value.
- **Exhaust variants where supported.** Prefer compiler-enforced handling of new
  cases when the language provides it. When it does not, retain an appropriate
  explicit guard/test rather than claiming exhaustive proof.
- **Derive from authority.** Generate/reuse shapes from protocol, API, database,
  or design-system schemas instead of hand-maintaining a parallel definition.
  [Encode lessons](encode-lessons-in-structure.md) keeps that relationship durable.
- **Strengthen where partiality appears.** A check or impossible-case failure
  identifies where an operation needs a stronger input or better construction.
  Do not model extra precision with no consumer benefit. Sum can handle an empty
  list; head needs a nonempty input or an explicit missing-result contract.

## Review questions

Which field combinations require a comment to explain validity? Which arguments
share a primitive but mean different things? Where did an unsafe cast arise?
Will a new variant identify its unhandled consumers? Which schema owns this shape?
Does strengthening the type keep an operation total, or only add unused precision?

Follow language/repository skills, including Go's real type semantics. Preserve
approved opaque external identities and behavioral invariants; a notation does
not require a stronger type-system feature or a package for every concept.

Adapted from pstack's `principle-type-system-discipline` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
