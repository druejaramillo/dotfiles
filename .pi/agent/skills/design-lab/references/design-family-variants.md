# Design family variants

Require a selected source study or family. Default to **three** variants unless
the user specifies a count. Inspect the source's design system and catalog
context; keep approved content and original assets, but do not copy its markup
as a variant.

Use separate Herdr subagents when available, one output folder per variant;
otherwise work sequentially with distinct briefs. Vary at least one major axis
per variant: body composition, typography, spacing rhythm, material, information
architecture, or image staging. Use `image_generate` for new still imagery as
needed. This is the **only phase** that permits `video_generate`: use it only if
motion materially helps, and provide a reduced-motion-safe fallback.

Extend the exploration host with compact variant entries while preserving the
source study. If a variant has no counterpart, show it full-width rather than
inventing a second skill comparison. Check the host route, variant paths,
responsive layouts with `web_screenshot`, media fallbacks, and the project
build. Report the variant paths and stop.
