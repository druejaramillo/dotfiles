# Tables, Charts, and Slide Masters

Read this reference before adding a table, chart, or slide master. It contains the supported data shapes, modern chart styling options, and master definition pattern.

## Tables

```javascript
slide.addTable(
  [
    ["Header 1", "Header 2"],
    ["Cell 1", "Cell 2"],
  ],
  {
    x: 1,
    y: 1,
    w: 8,
    h: 2,
    border: { pt: 1, color: "999999" },
    fill: { color: "F1F1F1" },
  },
);

// Advanced table with merged cells
let tableData = [
  [
    {
      text: "Header",
      options: { fill: { color: "6699CC" }, color: "FFFFFF", bold: true },
    },
    "Cell",
  ],
  [{ text: "Merged", options: { colspan: 2 } }],
];
slide.addTable(tableData, { x: 1, y: 3.5, w: 8, colW: [4, 4] });
```

## Charts

```javascript
// Bar chart
slide.addChart(
  pres.charts.BAR,
  [
    {
      name: "Sales",
      labels: ["Q1", "Q2", "Q3", "Q4"],
      values: [4500, 5500, 6200, 7100],
    },
  ],
  {
    x: 0.5,
    y: 0.6,
    w: 6,
    h: 3,
    barDir: "col",
    showTitle: true,
    title: "Quarterly Sales",
  },
);

// Line chart
slide.addChart(
  pres.charts.LINE,
  [
    {
      name: "Temp",
      labels: ["Jan", "Feb", "Mar"],
      values: [32, 35, 42],
    },
  ],
  { x: 0.5, y: 4, w: 6, h: 3, lineSize: 3, lineSmooth: true },
);

// Pie chart
slide.addChart(
  pres.charts.PIE,
  [
    {
      name: "Share",
      labels: ["A", "B", "Other"],
      values: [35, 45, 20],
    },
  ],
  { x: 7, y: 1, w: 5, h: 4, showPercent: true },
);
```

## Better-Looking Charts

Default charts look dated. Apply these options for a modern, clean appearance:

```javascript
slide.addChart(pres.charts.BAR, chartData, {
  x: 0.5,
  y: 1,
  w: 9,
  h: 4,
  barDir: "col",

  // Custom colors match the presentation palette.
  chartColors: ["0D9488", "14B8A6", "5EEAD4"],

  // Clean background
  chartArea: { fill: { color: "FFFFFF" }, roundedCorners: true },

  // Muted axis labels
  catAxisLabelColor: "64748B",
  valAxisLabelColor: "64748B",

  // Subtle grid on the value axis only
  valGridLine: { color: "E2E8F0", size: 0.5 },
  catGridLine: { style: "none" },

  // Data labels on bars
  showValue: true,
  dataLabelPosition: "outEnd",
  dataLabelColor: "1E293B",

  // Hide the legend for a single series
  showLegend: false,
});
```

**Key styling options:**

- `chartColors: [...]` - hex colors for series or segments
- `chartArea: { fill, border, roundedCorners }` - chart background
- `catGridLine/valGridLine: { color, style, size }` - grid lines; use `style: "none"` to hide them
- `lineSmooth: true` - curved lines for line charts
- `legendPos: "r"` - legend position: `"b"`, `"t"`, `"l"`, `"r"`, or `"tr"`

## Slide Masters

```javascript
pres.defineSlideMaster({
  title: "TITLE_SLIDE",
  background: { color: "283A5E" },
  objects: [
    {
      placeholder: {
        options: { name: "title", type: "title", x: 1, y: 2, w: 8, h: 2 },
      },
    },
  ],
});

let titleSlide = pres.addSlide({ masterName: "TITLE_SLIDE" });
titleSlide.addText("My Title", { placeholder: "title" });
```
