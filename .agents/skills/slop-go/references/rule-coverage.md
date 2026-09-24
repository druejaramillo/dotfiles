# Go rule and metric coverage

This is an independent Go adaptation of the
[SlopCodeBench paper][paper] and MIT-licensed [`scb-check` rules][rules]
(examined at v0.2.0), not the same scorer. Of 197 Python rule definitions,
most have no sound direct translation: Go has no truthy strings, ternary,
comprehensions, `None`, or Python exceptions. Go error returns and explicit
`len` tests are normal. Version 0.2 adds identity rules and shorter clones;
its verbosity scores cannot be compared directly with version 0.1.

## Scored Go rules

The Go rule IDs below emit line-level suspects. Source SCB rule IDs are shown
in parentheses where a meaningful adaptation exists.

- `bool-comparison` (`bool-comparison`): compare with `true` or `false`.
- `pointless-bool-cast` (`pointless-bool-cast`,
  `redundant-bool-in-condition`): `bool(x)` inside an `if`, except files
  with a shadowing `bool` declaration.
- `boolean-identity` (Go-specific): `true && x`, `x && true`,
  `false || x`, `x || false`.
- `empty-string-concat` (Go-specific): concatenate an empty string literal.
- `numeric-identity` (Go-specific): add/subtract literal `0`, or multiply
  by literal `1`.
- `duplicated-if-condition` (`duplicated-if-condition`): pure identical
  `if` and `else if` conditions without initializers.
- `boolean-return-if-else` (`boolean-return-if-else`,
  `if-return-bool-else`): branches return `true` and `false`.
- `identical-return-branches` (`redundant-guard-same-return`): pure guard;
  branches return the same expression.
- `nested-if-no-else` (`nested-if-no-else`): only child is another `if`,
  without initializers or else branches.
- `empty-if-else` (`if-pass-else-action`): empty `if` branch.
- `manual-min-max` (`manual-min-max`): compare two identifiers and assign
  one to a third variable in both branches. Requires Go 1.21+.
- `manual-min-max-return` (`manual-min-max`): compare two identifiers and
  return one from `if`/`else` or a guard and fallthrough. Requires Go 1.21+.
- `repeated-if-continue` (`repeated-if-continue`): adjacent guards with
  unlabeled `continue` as their only statement.
- `repeated-if-return` (`repeated-if-return-error`): adjacent guards
  returning the same expression.
- `redundant-guard-same-return` (`redundant-guard-same-return`): pure guard
  and fallthrough return the same expression.
- `boolean-return-guard` (`verbose-and-return`, `verbose-or-return`):
  boolean guard return followed by the opposite return. Impure conditions
  are still evaluated once; review named boolean types before changing code.
- `consecutive-append-calls` (`consecutive-append-calls`): two adjacent
  `slice = append(slice, value)` calls; the second value does not read slice.
- `redundant-continue` (`redundant-continue`): unlabeled `continue`
  directly at the end of a `for`/`range` body.
- `pointless-lambda-call` (`pointless-lambda-call`): immediately invoked
  zero-argument function literal with one returned expression.
- `self-assignment` (Go-specific): plain `x = x`.

All hits are suspects, not automatic refactoring instructions. Concision
can harm readability. The analyzer uses only the host Go toolchain's standard
library: no `sg`, Python, network, external module or project compilation.

## Clone and denominator definitions

Clones are equal pairs of adjacent statements after `go/format` normalization,
with at least **three** source lines and two statements (four in version 0.1).
Lines at every clone location count. Repeated/overlapping rule and clone hits
count once per file and line before dividing by authored Go SLOC. This is
**exact syntax matching**, not SCB's hashed structural clone algorithm;
renamed-but-similar blocks can be missed. SLOC is lexical non-comment,
non-blank, non-delimiter-only lines, with each line counted once.

Go erosion uses the same `CC × sqrt(SLOC)` mass form and `CC > 10` threshold
as SCB, but Go branches and SLOC differ from Python. Closures are counted
separately as callables.

## Halstead and maintainability

The analyzer uses its own Go AST classification. It does **not** claim numeric
parity with Radon or [`maintidx`][maintidx]. Each named function, method and
function literal has a JSON `callables` record with location, CC, SLOC,
Halstead and MI. Nested closures have separate operator/operand counts.

**Operators** include Go operations and control constructs such as `+`,
`:=`, `if`, `return`, calls, selectors, indexing and loops. **Operands**
are identifiers (except `_`) and literal spellings. Signature names/types
count; some structural punctuation counts as operators; whitespace and
comments do not. This is syntax analysis without type information.

- `distinct_operators` = n1; `distinct_operands` = n2.
- `total_operators` = N1; `total_operands` = N2.
- `vocabulary` = n1 + n2; `length` = N1 + N2.
- `estimated_length` = n1 log2(n1) + n2 log2(n2), omitting zero terms.
- `volume` = length × log2(vocabulary), for vocabulary > 1.
- `difficulty` = (n1 / 2) × (N2 / n2), for n2 > 0.
- `effort` = difficulty × volume.

We omit speculative development-time and delivered-bug estimates. The
project-level Halstead record **merges raw counts across callables** and
recomputes vocabulary and volume; individual volumes cannot be summed.
Declarations outside callables are absent from that aggregate.

**MI** uses the [Visual Studio-style formula described by Radon][radon],
evaluated per Go callable:

```text
MI = clamp(100 × (171 − 5.2 ln(V) − 0.23 CC − 16.2 ln(SLOC)) / 171, 0, 100)
```

These are natural logs and authored source lines; there is no comment bonus.
MI is `null` when volume or SLOC is zero. JSON `maintainability` gives the
**count, minimum and median of measurable callables**, not a project MI.
Low MI and high volume invite inspection; neither proves a defect.

## Boundary and limitations

- Scans authored `.go` under the scope, including files disabled by current
  build tags. Tests are excluded by default. `.gitignore` is not interpreted.
  The report lists the scope and exclusions; generated Go and `.templ` are
  omitted.
- Parsing is not type-checking. Shadowed builtins other than `bool` and
  dynamic conditions can yield false positives. Validate suggestions with
  human judgment and tests.
- A subtree scan misses clones shared with files outside it. Scores for
  overlapping subtrees cannot be averaged to recover the root score.
- MI and Halstead are separate measurements, not components of verbosity
  or erosion. Version 0.2 changes the clone cutoff and rules: start a new
  comparison baseline.
- No cross-language percentage combines Go with `.templ`, htmx or Tailwind.
  These diagnostics are not benchmark-comparable SCBench results.

[paper]: https://arxiv.org/html/2603.24755v1#S2.SS3
[rules]: https://github.com/gabeorlanski/scb-check/tree/main/src/scb_check/resources/slop_rules
[maintidx]: https://github.com/yagipy/maintidx
[radon]: https://radon.readthedocs.io/en/latest/intro.html#maintainability-index
