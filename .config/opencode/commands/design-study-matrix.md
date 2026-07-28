---
description: Build an independent Impeccable and Taste one-page study for each selected design family, then create a comparison host.
agent: design-orchestrator
---

Run the broad design-study matrix phase for `$ARGUMENTS`. Interpret arguments
as the product brief and, when supplied, named visual families. Discover the
project's approved content sources, visual implementation, package setup, and
existing study structure before writing.

Load `design-inspo`, `impeccable`, and `design-taste-frontend`. If the user did
not supply families, run the catalog phase internally and establish five
evidence-backed families before implementation. Use distinct families where
possible rather than manufacturing superficial differences.

For each family, create an isolated output folder with two self-contained,
responsive one-page studies: one designed through Impeccable and one through
Taste. Launch every individual study through a separate `general` subagent.
Each subagent must own only its folder and receive the family tags, inspiration
evidence, approved content boundary, image-asset requirements, and a request
to verify desktop and mobile behavior.

Create or extend an exploration-only comparison host with a family switcher and
side-by-side frames. Do not replace an existing production route. Verify every
frame path, the host interactions, generated assets, syntax, formatting, and
the active project build. Report the study paths and any design directions that
lack catalog matches.
