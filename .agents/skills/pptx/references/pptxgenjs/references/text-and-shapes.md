# Text, Lists, and Shapes

Read this reference before adding or modifying text, bullets, lists, lines, or shapes. It documents the required PptxGenJS options and visual-alignment constraints for those elements.

## Text and Formatting

```javascript
// Basic text
slide.addText("Simple Text", {
  x: 1,
  y: 1,
  w: 8,
  h: 2,
  fontSize: 24,
  fontFace: "Arial",
  color: "363636",
  bold: true,
  align: "center",
  valign: "middle",
});

// Character spacing: use charSpacing, not letterSpacing, which is silently ignored.
slide.addText("SPACED TEXT", { x: 1, y: 1, w: 8, h: 1, charSpacing: 6 });

// Rich text arrays
slide.addText(
  [
    { text: "Bold ", options: { bold: true } },
    { text: "Italic ", options: { italic: true } },
  ],
  { x: 1, y: 3, w: 8, h: 1 },
);

// Multi-line text requires breakLine: true.
slide.addText(
  [
    { text: "Line 1", options: { breakLine: true } },
    { text: "Line 2", options: { breakLine: true } },
    { text: "Line 3" }, // Last item does not need breakLine.
  ],
  { x: 0.5, y: 0.5, w: 8, h: 2 },
);

// Text-box margin is internal padding.
slide.addText("Title", {
  x: 0.5,
  y: 0.3,
  w: 9,
  h: 0.6,
  margin: 0, // Align text precisely with shapes or icons at the same x-position.
});
```

Text boxes have an internal margin by default. Set `margin: 0` when text must align precisely with shapes, lines, or icons at the same x-position.

## Lists and Bullets

```javascript
// Correct: multiple bullets
slide.addText(
  [
    { text: "First item", options: { bullet: true, breakLine: true } },
    { text: "Second item", options: { bullet: true, breakLine: true } },
    { text: "Third item", options: { bullet: true } },
  ],
  { x: 0.5, y: 0.5, w: 8, h: 3 },
);

// Wrong: do not use Unicode bullets; they create double bullets.
slide.addText("• First item", { ... });

// Sub-items and numbered lists
{ text: "Sub-item", options: { bullet: true, indentLevel: 1 } }
{ text: "First", options: { bullet: { type: "number" }, breakLine: true } }
```

## Shapes

```javascript
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.5,
  y: 0.8,
  w: 1.5,
  h: 3.0,
  fill: { color: "FF0000" },
  line: { color: "000000", width: 2 },
});

slide.addShape(pres.shapes.OVAL, {
  x: 4,
  y: 1,
  w: 2,
  h: 2,
  fill: { color: "0000FF" },
});

slide.addShape(pres.shapes.LINE, {
  x: 1,
  y: 3,
  w: 5,
  h: 0,
  line: { color: "FF0000", width: 3, dashType: "dash" },
});

// With transparency
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1,
  y: 1,
  w: 3,
  h: 2,
  fill: { color: "0088CC", transparency: 50 },
});

// rectRadius works with ROUNDED_RECTANGLE, not RECTANGLE.
// Do not pair it with rectangular accent overlays: they will not cover rounded corners.
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 1,
  y: 1,
  w: 3,
  h: 2,
  fill: { color: "FFFFFF" },
  rectRadius: 0.1,
});

// With shadow
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1,
  y: 1,
  w: 3,
  h: 2,
  fill: { color: "FFFFFF" },
  shadow: {
    type: "outer",
    color: "000000",
    blur: 6,
    offset: 2,
    angle: 135,
    opacity: 0.15,
  },
});
```

Shadow options:

| Property | Type | Range | Notes |
|----------|------|-------|-------|
| `type` | string | `"outer"`, `"inner"` | |
| `color` | string | 6-character hex, for example `"000000"` | No `#` prefix or 8-character hex |
| `blur` | number | 0-100 pt | |
| `offset` | number | 0-200 pt | Must be non-negative; negative values corrupt the file |
| `angle` | number | 0-359 degrees | Direction the shadow falls; 135 is bottom-right and 270 is upward |
| `opacity` | number | 0.0-1.0 | Use this for transparency; never encode it in the color string |

To cast a shadow upward, for example on a footer bar, use `angle: 270` with a positive offset. Do not use a negative offset.

Gradient fills are not natively supported. Use a gradient image as a background instead.
