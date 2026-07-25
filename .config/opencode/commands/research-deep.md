---
description: Resume or run validated, three-worker deep research for each remaining catalog item.
agent: research-orchestrator
---

Run the structured deep-research phase for the catalog identified by
`$ARGUMENTS`, or the single `research/*/outline.yaml` in the active project.
Load `deep-research`, validate the YAML schema, inspect existing results, and
skip only records that pass the local validator. Research remaining items in
batches of at most three parallel `research-worker` tasks. Each new record must
be validated before it counts as complete. Preserve failed or incomplete records
for resume, report their paths and limitations, and do not generate the final
report in this command.
