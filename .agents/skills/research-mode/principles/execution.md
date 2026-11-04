# Research execution

Read before planning or running a reproduction, benchmark or research-code
check. Shared authorization and privacy rules remain in
`~/.agents/references/operating-boundaries.md`.

## Establish the oracle and scope

Name the exact claim, code/data versions, inputs, metric, baseline and success
or failure criterion. Separate verified details from inferred or missing ones.
Choose the smallest decisive check and explain what it cannot establish.

Researching prerequisites and writing a plan need no preliminary approval.
Before executable experiment files, installation, repository code, training or
provisioning, require the user's explicit execution-environment choice and
authorization for the code, data, output scope and resources. Respect existing
wall-time, iteration, compute and spending caps; ask only for missing bounds
needed for the proposed run. Never invent an approved budget.

An already authorized environment/run does not need a second ritual approval.
Additional cost, credentials, destructive actions or materially expanded scope
still require their corresponding authorization.

## Run and report

Keep commands/scripts, dependency and environment versions, inputs, seeds or
other relevant nondeterminism, exit status and raw outputs with the experiment.
Use a separate writable result location and protect unrelated work. Stop at the
agreed bounds; a wait timeout does not prove a background process stopped.

Check the stated oracle before saying replicated. An unrun plan, unavailable
dataset, failed install or partial result is not replication. Label deviations,
pilot runs and parameter searches as distinct conditions. Report failures as
well as successful approved runs; do not tune until a published score appears
and present that as an unchanged reproduction.

## Bounded optimization

Before an optimization loop edits code or runs benchmarks, establish the
objective, exact benchmark command, metric/units/direction, editable files,
data/seed strategy, execution environment, resource budget and iteration cap.
If a cap is missing, 20 iterations is an offer from the former local method,
not an approved budget. Check existing work and whether the user intends to
resume an experiment or start a distinct one. Show the plan and obtain its
execution confirmation unless that plan/run is already approved.

P Stack hillclimb owns the loop and its one decision log. Read its upstream
`~/.agents/skills/pstack/benchmark-checklist/SKILL.md` and
`~/.agents/skills/pstack/principle-explain-the-number/SKILL.md` for measurement
checks. Reuse an existing experiment record when resuming; do not add a second
research-mode ledger. Retain commands, configurations, raw artifacts, metrics,
seeds/errors and keep/revert decisions for every trial, including failures.
Keep or revert only the experiment's own change and stop at the agreed bounds.

A stop/off request ends at the current safe measurement boundary and preserves
logs and a resumption point; there is no extra daemon to stop. A request to
clear an experiment first identifies its exact state files and requires
confirmation before removing only those files, never user data or other runs.

Use [containers](../references/containers.md) only when Docker/container
execution was chosen. Routine authorized project build/test checks are not a
request to start this optimization workflow.
