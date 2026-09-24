---
name: pptxgenjs
description: 'Guidance for creating PowerPoint presentations with PptxGenJS, including layouts, text, shapes, images, icons, tables, charts, slide masters, and common pitfalls. Use when generating or editing .pptx files with PptxGenJS or troubleshooting PowerPoint output issues.'
---

# PptxGenJS Tutorial

## Setup and Basic Structure

```javascript
const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // Or LAYOUT_16x10, LAYOUT_4x3, or LAYOUT_WIDE.
pres.author = "Your Name";
pres.title = "Presentation Title";

let slide = pres.addSlide();
slide.addText("Hello World!", {
  x: 0.5,
  y: 0.5,
  fontSize: 36,
  color: "363636",
});

pres.writeFile({ fileName: "Presentation.pptx" });
```

All coordinates are in inches. Layout dimensions:

- `LAYOUT_16x9`: 10 x 5.625 inches (default)
- `LAYOUT_16x10`: 10 x 6.25 inches
- `LAYOUT_4x3`: 10 x 7.5 inches
- `LAYOUT_WIDE`: 13.3 x 7.5 inches

## Execution Contract

1. Create a fresh `pptxgen()` instance for every presentation and choose its layout before positioning elements.
2. Use six-character hex colors without `#`; set transparency with a separate `transparency` or `opacity` property.
3. Use fresh option objects for every PptxGenJS call because the library mutates them in place.
4. Use `bullet: true` for bullets and `breakLine: true` between text-array items. Do not use Unicode bullet characters or bullet `lineSpacing`.
5. Do not use a rounded rectangle with a rectangular accent overlay; use a rectangle where clean alignment matters.
6. Use a gradient image, not a native gradient fill.

Read [common pitfalls](references/common-pitfalls.md) before writing any deck and whenever output is corrupt, visually incorrect, or inconsistent. It gives the complete failure modes and corrective examples.

## Conditional References

- Before adding or modifying text, bullets, lists, lines, or shapes, read [text, lists, and shapes](references/text-and-shapes.md).
- Before adding an image, icon, or slide background, read [images, icons, and backgrounds](references/media-and-backgrounds.md).
- Before adding a table, chart, or slide master, read [tables, charts, and slide masters](references/tables-charts-and-masters.md).

## Quick Reference

- **Shapes:** `RECTANGLE`, `OVAL`, `LINE`, `ROUNDED_RECTANGLE`
- **Charts:** `BAR`, `LINE`, `PIE`, `DOUGHNUT`, `SCATTER`, `BUBBLE`, `RADAR`
- **Alignment:** `"left"`, `"center"`, `"right"`
- **Chart data labels:** `"outEnd"`, `"inEnd"`, `"center"`
