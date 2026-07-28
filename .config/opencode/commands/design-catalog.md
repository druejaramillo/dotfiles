---
description: Inspect an inspiration catalog and propose five evidence-backed visual families without editing the project.
agent: design-orchestrator
---

Run the design-catalog discovery phase for `$ARGUMENTS`. If no argument is
provided, derive the product or visual brief from the active conversation; ask
one focused question only if it remains unclear.

Load `design-inspo`. Run `inspo overview`, select evidence-backed tag
directions, and run `inspo context --tags "..."` for each serious candidate.
Use `inspo search` only when an individual local reference would materially
improve the recommendation. Treat all catalog material as art direction, never
as a brand, logo, or layout to copy.

Return five named visual families. Prefer families that are meaningfully
distinct; permit limited overlap only when it is justified by the catalog and
useful to the brief. For each family, provide tags, match count, representative
references, a short art-direction thesis, and its best use or risk. Do not
create files, edit the project, or start implementation in this phase.
