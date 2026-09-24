---
name: pptx
description: Read, review, create, or edit PowerPoint .pptx presentations. Use for deck planning, extracting slide content, programmatic creation with PptxGenJS, and visual quality checks of rendered slides.
---

# PowerPoint Presentations

Choose the task before loading a guide:

1. **Read or review an existing deck:** use a compatible available extractor,
   or inspect PPTX OOXML when needed. Read
   [deck workflow and QA](references/pptx-workflow.md). Text extraction alone
   does not capture visuals, notes, animations, or layout.
2. **Edit an existing deck:** inspect the source and tooling, make a copy, and
   confirm preservation of required templates, notes, and animations. This
   skill has no safe generic XML/template editor. If rebuilding a deck
   programmatically, follow step 3 instead.
3. **Create or programmatically edit with PptxGenJS:** read the
   [PptxGenJS guide](references/pptxgenjs/guide.md) and its
   [common pitfalls](references/pptxgenjs/references/common-pitfalls.md).
   Load other references selectively for text/shapes, media/backgrounds, or
   tables/charts/masters. Confirm `pptxgenjs` is installed before running code.

For every changed deck, inspect text **and** rendered slides using available
tools (such as LibreOffice and Poppler). Check missing content, overflow,
collisions, contrast, and template regressions; fix and recheck affected
slides. State what could not be visually verified if a renderer is unavailable.
Do not launch subagents merely because the archived guide suggests them; only
do so if explicitly requested and available.

Source guides: `druejaramillo/skills/tools/{pptx,pptxgenjs}` at `123bd0f`.
References to a sibling `pptxgenjs` skill in the archived guide now refer to
the bundled guide above.
