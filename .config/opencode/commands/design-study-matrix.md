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
evidence, approved content boundary, image- or video-asset requirements, and a request
to verify desktop and mobile behavior.

Create or extend an exploration-only comparison host with a family switcher and
side-by-side frames. Do not replace an existing production route. Verify every
frame path, the host interactions, generated assets, syntax, formatting, and
the active project build. Report the study paths and any design directions that
lack catalog matches.

## Delivery contract

Before implementation, establish how the studies are served from the project
root. If no root `package.json` or usable app server exists, create a
root-owned Vite setup with root `npm run dev`, `npm run build`, and production
preview scripts. Do not make a nested study-only package the project's only
entry point and do not use Python's static server as the default. Ensure the
Vite production output contains every study, asset, comparison-host path, and
iframe target.

For the default five-family run, the comparison host must render exactly five
visible, named, keyboard-accessible family tabs. For an explicit family set,
render one tab per supplied family. A tab selection must update both skill
frames and their separate-open links; desktop presents the two studies
side-by-side and mobile uses an intentional stacked fallback.

Keep the host compact by default: a small brand/control header with the family
tabs and the comparison frames immediately below. Do not add a large hero,
catalog summary, explanatory panel, or other preamble above the frames unless
the user explicitly requests it.

Validate in a browser through the actual Vite development route and production
preview, not only from source files: select each family tab, confirm both frame
paths load, and confirm all generated assets resolve in the built output.
