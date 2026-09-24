---
name: paper-writing
description: Method for writing a paper-style or general research document grounded in supplied evidence; used by /draft.
disable-model-invocation: true
---
# Evidence-Grounded Drafting

Read `../deep-research/references/evidence.md`. Establish the requested audience, form (paper, report, technical document), and existing research files. Use provided evidence first; if critical background is absent, gather it or mark the gap. Do not silently transform tentative notes into findings.

Draft in `papers/<slug>.md` for an academic paper, otherwise `outputs/<slug>-draft.md`. Adapt headings to the form: a paper typically needs abstract, problem, related work, method, results/evidence, limitations, conclusion; a decision report needs answer, evidence, options/tradeoffs, implementation implications, limitations. Add equations and diagrams only when they materially clarify source-supported content. Every quantitative table, graph, and image must link to a source, raw artifact, or reproducible calculation. Missing experiments become clearly labeled proposed work, not plausible outcomes.

Make a separate claim-and-citation pass over the finished draft, checking pivotal sources and removing unsupported overclaims. Optional Herdr independent review can critique the fixed draft, but the current Pi agent owns the final document. Do not require plan approval for writing unless the user specifically asks to review the outline.
