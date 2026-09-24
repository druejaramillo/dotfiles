---
name: deep-research
description: Method for an explicitly requested comprehensive, multi-source investigation on any topic; used by /deepresearch.
disable-model-invocation: true
---
# Deep Research

Read `references/evidence.md` (relative to this file) before beginning. This is a general-purpose method: academic, market, product, regulatory, and technical questions are all in scope. Use the Pi agent that received the command; no specialized agent process is necessary.

## Plan and approval gate

1. Interpret the user's question, intended use, relevant time/geography, exclusions, and assumptions. Ask at most two focused questions if missing constraints would materially change the answer. Do not assume a company-focused or academic framework for every task.
2. Choose the smallest useful scale. A narrow but explicitly deep request may need direct research, not parallel helpers; a disputed or broad topic merits multiple source families and perspectives.
3. Save a short plan to `outputs/.plans/<topic-slug>.md`: question, key subquestions, source strategy, how claims will be checked, report shape, and likely blockers. Use a safe lowercase slug; do not overwrite a finished prior plan or report without checking the user's intent.
4. **Stop before searches, source fetches, drafting, or delegation.** Tell the user what the plan covers and ask for explicit approval. If they revise it, update the plan and ask again. Only continue on approval.

## After approval

1. Search from genuinely different angles; use direct source text, record relevant dates, and keep brief evidence notes in `outputs/.notes/` when they prevent lost context. Do not impose a fixed worker count or mandatory note files.
2. Distinguish primary evidence, independent checks, practitioner experience, conflicting evidence, and unsupported gaps. For substantial or high-risk conclusions, test alternative explanations and the strongest opposing case.
3. Draft `outputs/<topic-slug>.md` yourself, organized by the user's decision or questions: direct answer, method and scope, key findings, tradeoffs, opposing evidence, open questions or action points, inline sources, and what was actually verified.
4. Make a separate verification pass after drafting: check important numeric claims and direct quotations against exact passages, inspect cited URLs where possible, remove overclaims, and identify checks not run. Optionally use the `herdr` skill for an independent *read-only* review of a fixed draft; if unavailable, self-review honestly rather than claiming independence.
5. Verify the final artifact exists and report its path. If a tool or source fails after approval, save a useful partial artifact labeled `Verification: BLOCKED` with the failed checks instead of ending with chat-only explanation.

Ask for confirmation only at the plan gate or when an additional action would execute code, incur cost, or cross a material permission boundary.
