---
description: Run a one-command, audited deep-research brief with up to three parallel evidence workstreams.
agent: research-orchestrator
---

Run the autonomous narrative deep-research workflow for `$ARGUMENTS`. If no
argument is supplied, use the active conversation as the research request. Load
the `deep-research` skill and create all artifacts beneath
`research/<topic-slug>/` in the active project.

Do not request a preliminary plan approval. Ask at most two focused questions
only if a missing decision-relevant constraint makes responsible research
impossible. Create the strategy and workstream skeletons, launch up to three
non-overlapping research workers in parallel, audit their artifacts, resolve
valid audit findings once, and write the cited final brief. Stop after reporting
the final artifact paths, the answer, and material limitations.
