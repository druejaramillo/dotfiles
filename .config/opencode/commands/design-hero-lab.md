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
or use its own original local image or video asset, fill a viewport as a
standalone hero, and be intentionally distinct in composition, image crop,
hierarchy, or information treatment while staying in the chosen family.

Create a self-contained hero-lab route that swaps studies in a full-viewport
frame through an accessible floating picker centered near the bottom. Do not
add individual hero trials to the main comparison header. Add a discreet link
to the preserved full-page draft, verify all embedded paths and picker keyboard
behavior, and run the active project build.

## Lab visibility and discovery contract

Add one discreet generic `Hero lab` entry point from the selected family's
variant controls or equivalent family-local control area. Do not add individual
hero-trial links to the main comparison header.

The hero-lab route must open with its picker visibly present by default: a
high-contrast, bottom-center floating native control above the hero frame. The
picker needs a deliberate stacking layer, safe viewport insets, visible focus
state, and a mobile max-height/overflow treatment so it cannot be hidden,
occluded, or pushed off-screen. Its selected value, accessible label, URL
state when used, and loaded iframe source must stay synchronized.

Validate the actual Vite route at desktop and mobile widths. Keyboard-focus
the picker, change an option with the keyboard, and confirm the frame source
and rendered hero update. Also verify the built preview contains the lab,
preserved full-page draft, all hero routes, and their local assets.
