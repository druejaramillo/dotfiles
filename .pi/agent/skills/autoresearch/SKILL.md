---
name: autoresearch
description: Method for an approved, bounded change-and-benchmark loop over a measurable research objective; used by /autoresearch.
disable-model-invocation: true
---
# Autoresearch

Read `../deep-research/references/evidence.md`. This changes code or configuration and runs benchmarks; it is **not** a web-research command. An example is trying search-ranking changes against a fixed set of known-relevant documents and retaining changes only when a prespecified retrieval metric improves.

## Control requests

- `off`: stop after the current safe measurement/iteration, preserve the experiment and logs, and report where resumption would start. If no loop is active, say so; there is no background daemon to shut down.
- `clear`: identify the specific experiment, list only its own state files, obtain explicit confirmation, and then remove only those files. Never delete user data or unrelated experiments.

## Before any benchmark or edit

If an experiment exists, ask whether to resume or start a *distinct* fresh experiment. Otherwise obtain the measurable objective, exact benchmark command, metric/units/direction, files allowed to change, dataset/seed strategy, iteration cap (offer 20 as a default), resource budget, and execution environment (local, branch, venv, Docker, or an available remote service). Check for existing uncommitted changes; never revert a user's prior work. Write `experiments/<slug>/plan.md` with these choices and the baseline/stop criteria. **Show the plan and require explicit confirmation before running or modifying code.** Ask again before paid compute, credentials, or new risky actions.

## Approved foreground loop

Save an initial baseline and an append-only `experiments/<slug>/runs.jsonl` with timestamp, configuration, command, raw artifact path, metric, error/seed, and keep/revert decision for *every* trial. Work within the approved files/environment. Each iteration proposes one testable change, runs the same benchmark, compares it to the baseline and prior trials, logs failures as well as wins, then keeps or safely reverts only its own change. Stop at the iteration cap, budget, interruption, or user request. Do not treat one favorable seed as proof; show all configurations tried and variability when available.

Write `experiments/<slug>/report.md` with the baseline, full trial table, best reproducible result, failures, raw artifact links, and limitations. Never say a benchmark was run unless raw output was saved. The default Pi agent owns the loop; a Herdr helper is optional for independent review, not for simultaneous edits to benchmark files.
