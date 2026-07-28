---
description: Create independent hero studies for a selected prototype and present them in a floating-picker hero lab.
agent: design-orchestrator
---

Run the hero-lab phase for `$ARGUMENTS`. Require a resolvable full-page
prototype; default to four hero studies unless the argument provides a count.
Inspect the selected prototype, its product facts, visual system, and relevant
inspiration evidence before writing. Preserve the prototype unchanged.

Load the applicable design skill and `design-inspo`. Launch one isolated
`general` subagent per hero study. Each study must own its directory, generate
or use its own original local visual asset, fill a viewport as a standalone
hero, and be intentionally distinct in composition, image crop, hierarchy, or
information treatment while staying in the chosen family.

Create a self-contained hero-lab route that swaps studies in a full-viewport
frame through an accessible floating picker centered near the bottom. Do not
add individual hero trials to the main comparison header. Add a discreet link
to the preserved full-page draft, verify all embedded paths and picker keyboard
behavior, and run the active project build.
