---
name: design-lab
description:
  Run an explicitly requested phase of the visual design workflow, from catalog
  discovery through studies, hero exploration, documentation, and production
  promotion.
disable-model-invocation: true
---

# Design lab

Run **only** the phase selected by the user's `/design-*` prompt (or explicitly
named with `/skill:design-lab`). Read the matching
`references/<phase-name>.md` file in this skill directory before acting. For
example, `/design-hero-lab` loads `references/design-hero-lab.md`.

If no phase was specified, ask which one to run; do not start the entire
sequence. Resolve the target and optional count from the prompt arguments, then
the current conversation. Ask one focused question only when a missing choice
prevents a safe, usable result.

## Shared boundary

- Work in the active project. First inspect its `AGENTS.md`, approved product
  facts, visual implementation, routes, and any accepted design artifacts. Do
  not fabricate vendors, metrics, endorsements, funding, events, or operational
  claims. Catalog references inform art direction, not brands or layouts to
  copy.
- Preserve production routes and existing exploration artifacts. Use separate
  exploration routes and folders until a promotion phase is explicitly invoked.
  Do not commit, push, open a PR, or begin a later phase without a request.
- Load the installed `design-inspo` skill for catalog-backed direction. Load the
  installed `impeccable` skill and its relevant reference for design and UI
  implementation; follow its own context and verification instructions. Do not
  require `design-taste-frontend`. Use `image_generate` for original stills and
  `video_generate` only in the family-variants phase when motion actually helps,
  with a reduced-motion-safe fallback. Report a missing required capability
  rather than silently substituting a different workflow.
- For visual review use the Pi `web_screenshot` tool: pass the actual served
  page URL(s) and appropriate desktop/mobile viewports in one call, then inspect
  its attached images before revising. For interactions that screenshots cannot
  establish, run a focused browser interaction check. Verify the project build
  and affected routes using the smallest applicable checks; report what was and
  was not verified.
- Independent studies, family variants, and hero studies should use separate
  Herdr subagents **when `HERDR_ENV=1`**. Read `~/.agents/skills/herdr/SKILL.md`
  first and follow its pane/agent rules. Delegate in bounded batches so ten
  studies do not require ten simultaneous panes. Give each agent a
  non-overlapping folder, inspiration evidence, content constraints, and
  checks. Otherwise work sequentially in separate folders, maintaining
  different art directions and reporting that no independent agents ran. Never
  work on an assigned subagent's files in the parent while it is editing them.
- Stop at the selected phase boundary and list the paths or decisions it
  produced.
