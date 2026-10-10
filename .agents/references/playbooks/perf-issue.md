# Performance issue

Diagnose the measured limiting work, then make the smallest justified change.
Source inspection supplies hypotheses, not a measured ceiling.

## Establish a credible baseline

Read [Diagnosing bugs](../../skills/diagnosing-bugs/SKILL.md) and
[Explain the number](../principles/explain-the-number.md). Establish the workload,
metric/units/direction, execution environment, permitted files/actions, and
resource limits before measuring. Preserve existing user changes.

Capture raw baseline output plus the relevant profile/counters and environment,
build, dataset, and seed conditions. Verify successful requests/work, actual
execution rather than skipped/cached paths, comparable tuning, and run-to-run
spread within the authorized budget. Name the observed limiter and map it to
source. A plausible printed number alone does not establish a baseline.

## Try cheaper work first

Consider these in order, stopping when an earlier option meets the goal:

1. Do not do work whose result is unused.
2. Avoid doing the same work again.
3. Do it less.
4. Do it later when that preserves required behavior.
5. Move it off the critical path.
6. Do it concurrently when state ownership and the actual limiter permit.
7. Make the remaining work cheaper.

Keep approved semantics, side effects, and consumer experience intact; reducing
measured work by skipping a required result is not an optimization.

## Compare actual artifacts

Form one falsifiable hypothesis, change within scope, run applicable checks, and
capture a comparable treatment measurement. Use bounded local artifact analysis;
retain raw outputs, trial configurations, failures, spread, and relevant profiles.
Read [Sequence verifiable units](../principles/sequence-verifiable-units.md) so
each coherent attempt is checked before the next.

For repeated change-and-benchmark trials, read
`~/.pi/agent/skills/autoresearch/SKILL.md` and preserve its explicit plan approval,
frozen objective/method, iteration cap, resource budget, keep/revert decisions,
and existing run ledger. Do not start a second experimental workflow or execute
an unapproved benchmark loop because this playbook was selected.

## Report

Give the baseline, treatment, units, delta, observed mechanism/limiter, variability,
raw artifact paths, and coverage/measurement limits. An inconclusive comparison
is inconclusive, not a pass. PR writing links the evidence; publication is
separately authorized.

Adapted from pstack's Perf issue playbook at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`.
See [the license](../PSTACK-LICENSE) and
[the manifest](../../pstack-integration/manifest.json).
