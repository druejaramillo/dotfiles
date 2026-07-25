---
description: Generate a cited Markdown report from validated structured research results.
agent: research-orchestrator
---

Generate a Markdown report for the catalog identified by `$ARGUMENTS`, or the
single `research/*/outline.yaml` in the active project. Load `deep-research`,
validate each JSON result, and pass only valid records to `research-synthesizer`.
Write `report.md` under the catalog directory. Omit uncertain values, preserve
source links, include comparable decision-relevant fields, and state coverage
and evidence limitations. Do not generate or execute a report script.
