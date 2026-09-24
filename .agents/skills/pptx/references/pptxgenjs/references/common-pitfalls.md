# PptxGenJS Common Pitfalls

Read this reference before writing a deck and whenever output is corrupt, visually incorrect, or unexpectedly inconsistent. These issues cause file corruption, visual bugs, or broken output.

## 1. Hex Colors

Never use `#` with hex colors; it causes file corruption.

```javascript
color: "FF0000"; // Correct
color: "#FF0000"; // Wrong
```

Never encode opacity in hex strings. Eight-character colors such as `"00000020"` corrupt the file; use `opacity` instead.

```javascript
shadow: { type: "outer", blur: 6, offset: 2, color: "00000020" }; // Corrupts the file
shadow: { type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.12 }; // Correct
```

## 2. Bullets and Text Runs

Use `bullet: true`, never Unicode bullet symbols, which create double bullets.

Use `breakLine: true` between text-array items or the text runs together.

Avoid `lineSpacing` with bullets because it causes excessive gaps; use `paraSpaceAfter` instead.

## 3. Fresh Objects

Each presentation needs a fresh `pptxgen()` instance. Do not reuse presentation instances.

Never reuse option objects across calls. PptxGenJS mutates objects in place, for example converting shadow values to EMU. Sharing an object across calls corrupts the second shape.

```javascript
const shadow = { type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.15 };
slide.addShape(pres.shapes.RECTANGLE, { shadow, ... }); // The second call gets converted values.
slide.addShape(pres.shapes.RECTANGLE, { shadow, ... });

const makeShadow = () => ({
  type: "outer",
  blur: 6,
  offset: 2,
  color: "000000",
  opacity: 0.15,
});
slide.addShape(pres.shapes.RECTANGLE, { shadow: makeShadow(), ... }); // Fresh object each time.
slide.addShape(pres.shapes.RECTANGLE, { shadow: makeShadow(), ... });
```

## 4. Rounded Rectangles and Accent Borders

Do not use `ROUNDED_RECTANGLE` with rectangular accent borders: the overlay bar cannot cover rounded corners. Use `RECTANGLE` instead.

```javascript
// Wrong: accent bar does not cover rounded corners.
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 1,
  y: 1,
  w: 3,
  h: 1.5,
  fill: { color: "FFFFFF" },
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1,
  y: 1,
  w: 0.08,
  h: 1.5,
  fill: { color: "0891B2" },
});

// Correct: use RECTANGLE for clean alignment.
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1,
  y: 1,
  w: 3,
  h: 1.5,
  fill: { color: "FFFFFF" },
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1,
  y: 1,
  w: 0.08,
  h: 1.5,
  fill: { color: "0891B2" },
});
```
