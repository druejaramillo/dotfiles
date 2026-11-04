# Replicate

Read [execution](../principles/execution.md) before preparing the run.

1. Gather the original claim, stable source, data/code versions, environment,
   metric, baselines, parameters, resource needs and success/failure oracle.
   Mark verified, inferred, missing and blocked details.
2. Write the smallest decisive plan at the requested location or
   `experiments/<slug>/plan.md`. Include prerequisites, procedure, oracle,
   known resource estimates, risks, limits and missing details.
3. If execution has not already been explicitly authorized, ask for the
   environment: plan-only, local, isolated virtual environment, Docker or a
   specifically available remote environment. Do not install packages, create
   executable experiment files, run repository code, train or provision
   resources before that choice and its resource authorization.
4. For an authorized run, keep the agreed scripts/commands, versions, inputs,
   raw outputs, exit statuses and outcomes under `experiments/<slug>/` or
   the chosen output scope. Read the container reference if Docker was chosen.
5. Evaluate the oracle and distinguish replication, partial evidence, failure
   and an unrun/blocked plan. Link what actually ran and the raw artifacts.

A request for a replication plan authorizes researching and writing that plan,
not its execution. There is no preliminary gate before researching the plan.
