---
description: Propose and add deduplicated entities to an existing research catalog after confirmation.
agent: research-orchestrator
---

Locate the catalog identified by `$ARGUMENTS`, or the single `research/*/outline.yaml`
in the active project. Read its current schema and results, determine what items
are missing or explicitly requested, and propose deduplicated additions with a
short reason for each. Search only when needed to ground the proposal. Require
confirmation before modifying `outline.yaml`; do not begin deep research.
