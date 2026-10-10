# Explain the number

Read before trusting, reporting, or acting on a measured speedup, regression,
latency, throughput, or evaluation result. A plausible number may describe failed
requests, cached/skipped work, code that never ran, untuned conditions, or noise.

## Pattern

- **Ask why not double.** Identify the resource or path bounding the result: a
  core, lock, disk, network, load generator, or other observed constraint. Use a
  profile or counters captured during the run and map the limiter to source.
  A guess from reading code is not a measured limiter.
- **Rule out alternative measurements.** Check errors, actual completed work,
  skipped/cache paths, comparable input and tuning, and run-to-run noise. A local
  improvement must matter to the relevant end-to-end outcome.
- **Keep evidence with the claim.** Retain the command/configuration, units,
  dataset/seed/environment/build, raw artifact, run count, spread when available,
  limiter, and limits. Failed trials stay visible alongside successful ones.

For performance diagnosis, use the shared
[Performance issue](../playbooks/perf-issue.md) path. For repeated approved trials,
read `~/.pi/agent/skills/autoresearch/SKILL.md` and keep its plan approval, frozen
method, run ledger, cap, and budget. No separate measurement skill or ledger is
required. Do not spend beyond the authorized budget to obtain stronger evidence.

For evaluation, check that each trial did the intended task, comparisons share
meaningful conditions, and the scenario matters. Report small or noisy samples
as limited/inconclusive rather than a general productivity claim.

Missing run count, spread, or a defensible limiter limits the conclusion. A
claimed time saving greater than the time the changed piece took needs a new
explanation, not celebratory arithmetic. Preserve raw results when a hypothesis
fails or a number is inconclusive.

[Prove it works](prove-it-works.md) establishes that an output is real; this
principle establishes what a measured number means.

Adapted from pstack's `principle-explain-the-number` at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`. [License](../PSTACK-LICENSE).
