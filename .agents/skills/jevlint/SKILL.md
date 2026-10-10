---
name: jevlint
description: Use jevlint to check a repository against plain-language code rules, configure rules or rule packs, interpret findings, or assess it as an automated quality guardrail.
---

# Jevlint

Jevlint uses Tree-sitter to extract code units, then evaluates configured plain-language rules with a decision provider. It is for project-specific constraints that ordinary syntax linters cannot express; it complements deterministic linters, tests, and type checks.

## Install and run

1. Check availability with `jevlint version`. Install with `go install github.com/codegirl-007/jevlint/cmd/jevlint@latest` (Go 1.26+, CGO, and a C compiler required), or use a release binary.
2. From the project root run `jevlint init`. It detects languages and writes `.jevlint.json`. Review the result. Supported presets include Go, Python, JavaScript, TypeScript/TSX, Rust, Java, C/C++, C#, Kotlin, PHP, and Ruby.
3. Add one or more rules; without at least one enabled language and rule (or pack), there is nothing to evaluate.
4. Set credentials for an approved provider in environment variables. Default TypeSafe uses `TYPESAFE_API_KEY`. Other providers and their environment variables are in the upstream README.
5. Run `jevlint doctor`, then `jevlint check .` or `jevlint check --changed .`. Use `--format json` for machine-readable output. Check exit codes: `0` no reported findings, `1` findings, `2` configuration/runtime error.

## Configure rules

Keep configuration in `.jevlint.json` at the repository root. The legacy filename `jevlint.json` is still read, but use `.jevlint.json` for new configs. A minimal config:

```json
{
  "languages": { "go": {} },
  "rules": [
    {
      "id": "join-related-records-in-query",
      "description": "Join related database records in the database query, not in application code.",
      "severity": "warning",
      "kinds": ["function"],
      "include": ["internal/**/*.go"],
      "exclude": ["**/*_test.go"],
      "exceptions": ["The records come from different databases."]
    }
  ]
}
```

Compose a rule from these fields:

- `id`: stable unique identifier, used by evals and pack overlays.
- `description`: the actual plain-language constraint. Write a direct, testable rule with a clear reason; specify the undesired behavior and relevant context. Avoid bundling unrelated constraints into one rule.
- `severity`: `info`, `warning`, or `error`; severity affects reporting, not the model's underlying decision.
- `kinds`: code-unit types to assess: `function`, `type`, `comment`, `docComment`, `field`, or `statement`. Choose the narrowest useful kind. For example, an invariant about error handling inside methods should generally use `function`, not every statement.
- `include` / `exclude`: doublestar file patterns, such as `"src/**/*.go"` and `"**/*_test.go"`. Use these to keep the first rollout targeted and to exclude generated, fixture, or test code when appropriate.
- `exceptions`: explicit legitimate cases, so the rule does not demand the behavior when it would be incorrect.
- `minConfidence`: optional `0`–`1` confidence floor. Omitted or `0` accepts all decisions; a rule-level value overrides the global setting. Raising it can reduce uncertain findings but can also hide real violations.
- `allowSkip` / `allowAbstain`: allow a model response to skip when the rule does not apply, or abstain when it applies but context is insufficient. Neither counts as a finding.
- `localize`: optional second-pass focus for failed functions/types; accepts `comment`, `docComment`, `field`, or `statement`. Omit or set `[]` to disable. Each focused region can cause another provider request (up to 24 regions per function/type), so enable only when pinpointing a violation materially helps.
- `context`: opt-in repository evidence: `callees`, `callers`, `relatedTypes`, and `imports`. This can clarify rules that depend on nearby project code. Resolution is conservative and limited; it is not full call-graph or data-flow analysis. Distinct context settings can increase requests.

Rules should be about project invariants that humans can explain, not generic preferences better handled by a deterministic formatter/linter. Example rules:

```json
{
  "id": "preserve-errors",
  "description": "Do not ignore or swallow an error returned by an operation; propagate it or handle it in a way that preserves the failure for the caller.",
  "severity": "error",
  "kinds": ["function"],
  "include": ["internal/**/*.go"],
  "exclude": ["**/*_test.go"],
  "exceptions": ["The error is explicitly documented as safe to ignore and the ignored result cannot affect correctness."]
}
```

```json
{
  "id": "accurate-public-doc-comments",
  "description": "A public function's documentation comment must describe its current observable behavior and must not promise behavior the implementation does not provide.",
  "severity": "warning",
  "kinds": ["docComment"],
  "include": ["pkg/**/*.go"],
  "localize": ["statement"]
}
```

Select rule scope based on what the rule judges. Comments, fields, and statements receive their nearest function or type as parent context. `localize` can help explain *where* a function/type violates a rule; it adds provider calls and is not enabled by default.

## Validate rules and tune rollout

Add representative cases to `jevlint-evals.json` and run `jevlint eval`. Each case points to a rule id, a fixture, and expected `pass` or `fail`. Include both violating and compliant examples, especially legitimate exceptions. An `inconclusive` case (for example, only skip/abstain or a failure below the confidence floor) does not count as a match. Fix unclear rules or scope before raising confidence thresholds.

Start with `warning` on a focused path. Review findings and false positives with maintainers before promoting to `error` or adding to CI. Use `--refresh-cache` after changing a rule/model and needing fresh decisions; `--clear-cache` clears this project's local cached evaluations.

## Rule packs

A pack is a shared set of rules (and optionally eval fixtures) pinned in project config. Inspect its source and scope before installing, then run `jevlint plugin install <github-url>` and review `.jevlint.json` changes. Use `jevlint plugin list` to inspect installed packs, `jevlint plugin update` to update, and `jevlint plugin remove <owner/name>` to remove. A local rule can overlay a pack rule by id; pack languages must be enabled in the project config.

## Data and cost

Checks send extracted source code and file metadata to the configured decision service. `jevlint doctor` makes a live provider request unless run with `--offline`. Confirm the repository's data-handling policy and provider approval before running against sensitive code. Provider requests may incur usage charges; concurrency defaults to four requests at a time. API keys belong in environment variables, never project config or command history.

## Retrospectives

When reviewing whether a project needs another automated guardrail, consider Jevlint for important plain-language constraints that are hard to encode in conventional static checks. It is one candidate, not a default recommendation: prefer a cheaper, deterministic check when it can reliably express the invariant. Follow the `retro` skill for the broader retrospective process.
