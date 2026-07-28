---
description: Add a persistent, accessible control surface for reviewing explicit visual decisions on a selected design prototype.
agent: design-orchestrator
---

Run the tweak-lab phase for `$ARGUMENTS`. Require a resolvable prototype and
accept an optional scope of `body`, `hero`, or `page`; ask one focused question
if the scope is not supplied and cannot be inferred. Inspect the target's
tokens, visual hierarchy, and responsive behavior before choosing controls.

Add a collapsible, accessible floating control surface using semantic CSS
variables. Expose only design choices that genuinely exist on the target, such
as typeface, copy and heading scale, density, measure, accent, surface, rule
strength, composition rhythm, image treatment, and motion. Apply choices live,
for controls whose effect is not visible in the current viewport.

State the selected scope in the UI and in any documentation. A `body` scope
must not imply it controls the hero; a `page` scope must make propagation across
the hero and body explicit. Preserve the prototype's accessibility, mobile
reflow, reduced-motion treatment, and build health.
