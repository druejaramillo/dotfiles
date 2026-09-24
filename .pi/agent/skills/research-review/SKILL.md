---
name: research-review
description: Method for skeptical, constructive review of papers, reports, proposals, or other research artifacts; used by /review.
disable-model-invocation: true
---
# Research Review

Read `../deep-research/references/evidence.md`. Inspect the *actual artifact* first, then linked data, code, references, or regulatory material when they affect central claims. If access or parsing fails, review what is visible and mark unseen sections blocked rather than imagining them.

Assess argument clarity, evidence quality, missing alternatives, reproducibility/traceability, mismatched metrics, stale sources, quantitative claims, tables/figures, and unsupported certainty. For an empirical paper also inspect baselines, ablations, leakage, sample size, and implementation detail. For a decision report inspect assumptions, incentives, implementation reality, costs, and omitted stakeholders. Separate a flaw in the artifact from a check you could not perform.

Save `outputs/<slug>-review.md`: short assessment; evidence-backed strengths; FATAL / MAJOR / MINOR issues with exact passages or section references; questions; concrete revision order; inspected sources and blocked checks. Do not predict publication acceptance or claim independent review if you reviewed your own draft. The Herdr skill can request an optional independent, read-only pass when available and useful. Proceed without preliminary approval unless the user asks for one.
