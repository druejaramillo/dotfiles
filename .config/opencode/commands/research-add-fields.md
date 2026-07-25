---
description: Propose and add field definitions to an existing research catalog after confirmation.
agent: research-orchestrator
---

Locate the catalog identified by `$ARGUMENTS`, or the single `research/*/fields.yaml`
in the active project. Read its current schema, results, and research goal. Propose
only decision-relevant missing fields, including category, description, detail
level, and whether each is required. Require confirmation before modifying
`fields.yaml`; do not alter existing result records.
