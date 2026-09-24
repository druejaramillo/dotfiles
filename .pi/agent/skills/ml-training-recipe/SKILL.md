---
name: ml-training-recipe
description: Method for finding ranked, evidence-backed, implementable ML or other technical research recipes; used by /recipe.
disable-model-invocation: true
---
# Practical Research Recipes

Read `../deep-research/references/evidence.md`. Start with the desired result, constraints, and success metric; do not assume the answer must be ML. For each candidate, connect *an observed result* (or label it an untested proposal) to the method, required inputs/data, versions and parameters, cost/compute, code or documentation paths, limitations, and verification status.

For ML recipes specifically, inspect dataset cards for availability, access/license, splits/schema, and benchmark fit; check model checkpoints, hyperparameters, training method, evaluation, and implementation paths. Use available Hugging Face or scholarly tools when present. A cited example script does not establish the claimed score; a paper's score does not establish its dataset is still accessible.

Rank candidates by applicability and feasibility as well as measured quality. Write `outputs/<slug>-recipe.md` with a recommendation, ranked table, minimal implementation outline, prerequisites, verification state (`verified`, `unverified`, `blocked`, `inferred`) and source links. Never execute a recipe as part of finding it unless separately requested and authorized.
