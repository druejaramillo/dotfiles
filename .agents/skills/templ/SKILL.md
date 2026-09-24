---
name: templ
description: Build, review, or troubleshoot Go templ components and server-rendered HTML. Use for .templ syntax, templ generate, component composition, context and HTTP integration, safe attributes, testing, JavaScript or htmx interop, and templ CLI workflows.
---

# Go templ

The [bundled templ reference](references/templ-guide.md) is a long documentation
snapshot. Search its headings or terms first; read only relevant sections. It
covers components, generation, rendering, escaping, content security policy,
testing, CLI and editor support, HTTP, JavaScript, and htmx integration.

1. Check the project's templ module and CLI version. Identify the affected
   component, generated-code workflow, and call site.
2. Read the matching reference section rather than loading the whole file.
   Prefer the project's correct established patterns.
3. Change `.templ` source files, not generated `_templ.go` output by hand.
   Run `templ generate`, relevant Go tests, and available project checks.
4. Treat the guide as a snapshot. Verify version-dependent APIs against
   installed tooling or current official templ documentation.

This skill is about Go templ. Tailwind `@theme`, CSS utility classes, and
Tailwind v4 optimization are **not** templ triggers.

Source: `druejaramillo/skills/tools/templ/SKILL.md` at `123bd0f`.
The source's Tailwind-derived trigger description was replaced.
