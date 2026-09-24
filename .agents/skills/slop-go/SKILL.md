---
name: slop-go
description: Audit authored Go code for SlopCodeBench-inspired verbosity, structural erosion, maintainability index (MI), and Halstead metrics, showing source-level suspects without changing code. Use when the user requests /slop-go, a Go code-health check, unnecessary verbosity or duplication analysis, complexity hotspots, or a before/after review in a Go project (including templ/htmx/Tailwind stacks).
compatibility: Requires a local Go toolchain (Go 1.22+). The analyzer has no external package dependencies.
---

# Slop Go

Review aid, not a benchmark, quality gate, or instruction to optimize scores.

1. From the **project root**, resolve `scripts/slop-go.sh` relative to this
   skill's `SKILL.md`. Run `bash <skill-dir>/scripts/slop-go.sh -scope .` for
   the whole project, or `-scope path/to/part` for a file/subtree. The wrapper
   takes the current directory as the project root; a nested Go module can be
   selected as a scope. Use `-json` for the full report. Use `-include-tests`
   only when deliberately mixing tests into both scores. The analyzer uses
   the Go standard library; it neither installs dependencies nor executes
   project code.
2. Report exact scope, version, included Go files, SLOC, callables, exclusions,
   and `.templ` files not scored. Treat no authored `.go` files or a parse error
   as unavailable, not zero. By default, tests, symlinks, vendored/build
   folders, `*_templ.go`, and standard generated-code headers are excluded.
   Check whether the project's source layout needs a different scope.
3. Report verbosity as **deduplicated flagged source lines / authored Go source
   lines**. These lines combine cloned blocks and Go redundancy rules. Quote
   2–5 `file:line` examples, separating rule and clone findings. Read the
   source before claiming the flagged lines are unnecessary. Read
   `references/rule-coverage.md` if asked about adapted rules or comparability.
4. Report erosion as **mass in callables with CC > 10 / total callable mass**,
   where mass is `CC × sqrt(function SLOC)`. List the largest contributors with
   CC, SLOC, and mass. Domain complexity may be justified.
5. Report **MI** as per-callable median and minimum (0–100), with the lowest
   `file:line` callables; do not invent a project MI. Report **Halstead**
   operator/operand counts, vocabulary, length, volume, difficulty and effort
   across selected callables, plus high-volume individual callables. High volume
   can just mean a large function. If none are measurable, say MI is unavailable.
   For formulas and token definitions, read `references/rule-coverage.md`.
6. For before/after comparisons, require identical scope, exclusions and
   analyzer version. Version 0.2 changes verbosity coverage from 0.1. Scan
   two actual snapshots; a single snapshot cannot prove deterioration. Leave
   project files untouched and ask which suspects the user wants to investigate.

`.templ` source, htmx attributes, Tailwind classes, JavaScript and CSS are not
included in Go scores. Generated templ Go is excluded to avoid scoring compiler
output. Inspect `.templ` source separately for template-specific review.

After changing the analyzer, run from `<skill-dir>/scripts`:
`go test ./... && go vet ./...`. Run `/reload` in Pi after editing the skill.
The direct skill invocation is `/skill:slop-go`; the personal `/slop-go` prompt
alias requests this same skill.
