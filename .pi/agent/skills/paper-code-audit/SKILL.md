---
name: paper-code-audit
description: Method for auditing a claim against source code, data, documentation, or other underlying evidence; used by /audit.
disable-model-invocation: true
---
# Claims-to-Evidence Audit

Read `../deep-research/references/evidence.md`. The name is historical: this covers paper versus code, report versus data, product claim versus docs, and other claim/evidence pairs.

Identify the claim-maker, the precise claim and date/version, the authoritative underlying artifact, and the comparison dimensions before concluding anything. Obtain exact code paths, settings, tables, methodology, or quoted passages rather than relying on summaries. Compare defaults, data processing, excluded cases, metrics/units, test conditions, release/version differences, and missing artifacts. Label each finding `matches`, `mismatch`, `unverifiable`, or `interpretation`; absence of public code is not proof of a contradiction.

Write `outputs/<slug>-audit.md` with a claim-by-claim table (claimed, observed, evidence URL/path and locator, severity, consequence), reproduction limits, and concrete follow-ups. Do not run untrusted code simply to inspect it. To execute a check, get the user's environment authorization first and use the replication method. No preliminary plan-approval stop unless requested.
