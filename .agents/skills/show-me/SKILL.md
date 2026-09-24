---
name: show-me
description: Explain the current topic visually. Use when the user asks to see a flow, code shape, architecture, implementation plan, PR walkthrough, or diagram; choose a concise inline sketch first, or make a Plannotator-themed HTML explainer when a visual artifact is needed.
---

# Show Me

Start with the **smallest view** that answers the question. Skip the preamble;
keep prose brief and place each visual next to what it explains.

- Logic/algorithm: pseudocode. Runtime behavior: a call tree or sequence.
- Component boundaries or ownership: a shallow component or file tree with
  real paths and significant state.
- An existing shape changing: a small `diff`, not a new full diagram.
- Relationships or data flow: Mermaid when a compact inline diagram suffices.
- Dense architecture, a visual comparison, plan, or PR walkthrough: one
  focused, self-contained HTML artifact when an inline sketch would be cramped
  or hard to annotate.

## HTML explainer routes

For every HTML route, read [theme override](references/theme-override.md) and add
its host-theme `<meta>` opt-in and standalone tokens. Then read the relevant
references **before** producing the artifact:

- **Implementation plan, design doc, or proposal:** read
  [design system](references/design-system.md) and
  [SVG patterns](references/svg-patterns.md). Show a brief, compact summary,
  and only useful sections: dependency-ordered milestones, data flow,
  mockups, significant interfaces, risks, and open decisions. No estimates,
  filler sections, or exhaustive file lists.
- **PR, diff, or change walkthrough:** read
  [design system](references/design-system.md) and
  [PR components](references/pr-components.md). Lead with what changed and why;
  include before/after, a concise file tour, evidence, risks, review focus,
  and verification. Expand only risky files.
- **Other visual explainers:** if `nicobailon/visual-explainer` is already
  installed, use its workflow with the theme override. Otherwise make focused
  HTML yourself. Do **not** install third-party skills without permission.

Use real labels and data, generous whitespace, readable contrast, responsive
layouts, and one idea per viewport. If Mermaid is used inside HTML,
**render every diagram with Mermaid 11** in light and dark before delivery.
An exception, empty SVG, `aria-roledescription="error"`, or
`Syntax error in text` means **the explainer is not deliverable**. Fix and
re-render. The Mermaid rules in `references/theme-override.md` use literal
colors, not CSS functions or variables, for themeVariables.

## Deliver the artifact

Use Plannotator, not `open` or `xdg-open`, for generated HTML. For a saved
plan/spec **when the user must approve or gate it**, run
`plannotator annotate <file> --gate --json` and handle the decision/feedback.
For informational artifacts, run `plannotator annotate <file>` and handle the
feedback. The CLI blocks until the reviewer acts; if unavailable, report the
file path and limitation. Do not launch an approval gate for an informal
explanation or when the host's plan flow already opens one automatically.

Inline sketches need no file, CLI, or approval gate. Never invent paths,
system behavior, or evidence just to make a diagram appear complete.

Sources: `dmmulroy/.dotfiles/home/.agents/skills/show-me` at `fcdf060`,
merged with the former local `plannotator-visual-explainer` and its references.
