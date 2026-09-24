---
name: replication
description: Method to design reproducible checks of a paper, benchmark, product claim, or empirical result; used by /replicate.
disable-model-invocation: true
---
# Replication

Read `../deep-research/references/evidence.md`. Reproduction includes non-ML claims when a test oracle can be specified. Gather the original claim, data/version, environment, metric, baselines, parameters, code paths, compute/cost, and what would count as success or failure. Mark details verified, inferred, unavailable, or blocked. Prefer the smallest decisive check; explain when complete replication is infeasible.

Write `experiments/<slug>/plan.md` with the claim, source URLs, data and environment prerequisites, procedure, success criteria, estimated resources if known, safety risks, and missing details. Then ask the user to choose: **plan only, local, isolated virtual environment, Docker, or a specifically available remote environment**. Do not install packages, execute repository code, run training, provision paid compute, or write executable experiment files before an execution environment is explicitly chosen. Obtain further approval for costs, credentials, or destructive commands.

If executing, confine edits and outputs to the agreed scope, save commands/scripts, dependency versions, raw outputs, and outcomes under `experiments/<slug>/`. Check the planned test oracle before saying `replicated`; an unrun or blocked plan is not a replication. Report what actually ran and link the saved artifacts. Use `../docker/SKILL.md` if Docker was chosen. No preliminary approval to *research and write the plan*.
