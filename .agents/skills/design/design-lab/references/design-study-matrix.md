# Design study matrix

Build a five-family comparison by default, or one family per explicitly supplied
family. Each family gets **two independently art-directed, self-contained
responsive Impeccable studies**, not an Impeccable-vs-Taste comparison. Make A
and B materially different in composition, typography, spacing, imagery, or
information hierarchy while keeping the family's catalog-backed direction and
approved content. Inspect product facts, existing UI, routes, packages, and
study structure first. Load `design-inspo` and `impeccable`; if no families are
supplied, carry out the catalog phase internally to establish five
evidence-backed families.

Use separate Herdr subagents for the individual studies when available, one
folder and brief per study; otherwise create them sequentially in separate
folders. Each brief needs the family tags, inspiration evidence, content
boundary, original image-asset requirements, and desktop/mobile verification. Do
not replace the production route.

Serve the studies from the **project root**. If there is no usable root app
server or `package.json`, create root-owned Vite setup with `npm run dev`,
`npm run build`, and production preview scripts. A nested study-only package or
Python static server is not the default. The production output must contain
every study, local asset, host path, and iframe target.

Create or extend a compact exploration-only comparison host: small header,
exactly five named keyboard-accessible family tabs in the default run (one per
family when explicitly supplied), then two frames immediately below. Label the
two studies by their **art-direction difference**, not by different design
skills. Selecting a tab updates both frames and their separate-open links; stack
them intentionally on mobile. No large host hero or explanatory preamble unless
requested.

Use `web_screenshot` on the actual Vite development route and production preview
at desktop and mobile sizes. Also browser-check every tab, both frame paths, and
built assets. Check syntax, formatting, and the root build. Report paths and any
catalog gaps; stop before promoting a study.
