# Tweak lab

Require a resolvable prototype and a scope of `body`, `hero`, or `page`; infer
it from the request if possible, otherwise ask. Inspect its tokens, hierarchy,
and responsive behavior. Keep the prototype and other routes intact.

Add a collapsible, accessible floating control surface with semantic CSS
variables for **choices that actually exist** on the target: for example
typeface, scale, density, measure, accent, surface, composition, image
treatment, or motion. Apply choices live and label any controls whose effect is
outside the current viewport. Expose only decisions relevant to the selected
scope. State the scope in both UI and documentation: `body` excludes hero;
`page` explicitly propagates across both.

Check keyboard and mobile use, reduced motion, and the project build. Use
`web_screenshot` to compare default and modified desktop/mobile states. Stop
before promoting lab-only controls to a public route.
