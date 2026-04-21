# Project Descriptions - A Tutorial

This tutorial covers the four ways to write a project or sub-viz description:
plain text, Markdown, raw HTML, and a custom Vue component for charts or
diagrams. Every option lives in the same `description` field - you pick the
one that fits the content.

---

**Table of contents**

- [Where descriptions appear](#where-descriptions-appear)
- [Option 1: Plain text](#option-1-plain-text)
- [Option 2: Markdown](#option-2-markdown)
- [Option 3: Raw HTML](#option-3-raw-html)
- [Option 4: Custom Vue component](#option-4-custom-vue-component)
- [Theme reactivity for figures](#theme-reactivity-for-figures)
- [Style guide](#style-guide)
- [Quick reference](#quick-reference)

---

## Where descriptions appear

Every `ProjectConfig` and `SubViz` has a `description` field. It renders in
the left-hand drawer of the project detail view, just under the title. Sub-viz
descriptions appear as scroll sections, one per entry.

Descriptions are rendered through `markdown-it` with inline HTML enabled, so
the same field accepts plain prose, Markdown syntax, or raw HTML. For
something richer (a chart, an SVG diagram), you can override `description`
with a `descriptionComponent`.

> **Security**: descriptions live in committed TS files reviewed via pull
> request, so no runtime sanitization is applied. Do not pipe
> user-submitted content through this field.

---

## Option 1: Plain text

The simplest form. Just write prose in a string.

```ts
description: "Swiss building footprints with construction year data.",
```

Good for one-sentence summaries. Line breaks and blank lines inside the
string do not produce paragraph breaks; for that, use Markdown or HTML.

---

## Option 2: Markdown

Use Markdown syntax for paragraphs, links, italics, and lists. Backticks
work, headings work, tables work - anything `markdown-it` supports.

```ts
description: `
Aggregated car road length processed from
[SwissTLM3D](https://www.swisstopo.admin.ch/en/landscape-model-swisstlm3d),
rasterised onto a 500 m² grid.

Used as input to _DAVE_ for estimating per-cell car capacities.

- light tones for quiet residential streets
- orange for mixed arterials
- dark red for dense urban cores
`,
```

Worked example: [`frontend/src/config/projects/car_road_length.ts`](../frontend/src/config/projects/car_road_length.ts).

---

## Option 3: Raw HTML

Inline HTML is valid Markdown, so you can drop `<p>`, `<a>`, `<em>` directly
into the field when you need attributes, classes, or elements Markdown does
not cover.

```ts
description: `
<p>
  Average daily traffic counts on Swiss roads, published by
  <a href="https://www.are.admin.ch/" target="_blank" rel="noopener">ARE</a>.
</p>
<p>
  At <em>URBES</em> the layer closes the loop between urban form and
  environmental exposure.
</p>
`,
```

Worked example: [`frontend/src/config/projects/roads_swiss_statistics.ts`](../frontend/src/config/projects/roads_swiss_statistics.ts).

---

## Option 4: Custom Vue component

When Markdown and HTML are not enough, point `descriptionComponent` at a Vue
single-file component. When set, it overrides the `description` string at
render time. Keep `description` filled in too - it is used as a fallback and
as the plain-text representation elsewhere (e.g. globe hover cards).

### File location

Custom description components live in
`frontend/src/config/projects/descriptions/`, one file per project or
sub-viz, named to match the config id.

```
frontend/src/config/projects/
├── buildings.ts
├── wrf.ts
└── descriptions/
    ├── buildings.vue
    ├── hourly_adult_population.vue
    ├── wrf_d02.vue                 # ECharts line chart
    ├── wrf_d03.vue                 # inline SVG schema
    ├── wrf_d04.vue                 # reuses the same schema
    └── wrf_domains_schema.vue      # shared by d03 + d04
```

### Wiring

Add a `descriptionComponent` field to your config:

```ts
{
  id: "buildings",
  description: "Swiss building footprints ...",   // still required (fallback)
  descriptionComponent: () => import("./descriptions/buildings.vue"),
  // ... rest of the config
}
```

`ProjectDetailView` wraps the loader with `defineAsyncComponent` and renders
it where the description text would normally go. The SFC's root inherits the
body styling (text size, line height) via attribute fallthrough, so
**keep the template single-root**.

### Example: ECharts chart

[`descriptions/buildings.vue`](../frontend/src/config/projects/descriptions/buildings.vue)
shows a bar histogram by construction decade, with each bar coloured from the
same red → yellow → green ramp that the map applies to the building year.

Minimal shape:

```vue
<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { useChartTheme } from "@/utils/chart-theme";

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);
const chartTheme = useChartTheme();

const option = computed(() => {
  const t = chartTheme.value;
  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      backgroundColor: t.tooltipBg,
      textStyle: { color: t.tooltipText },
      extraCssText: "box-shadow: none;",
    },
    xAxis: {
      /* ... axisLabel color: t.axis */
    },
    yAxis: {
      /* ... splitLine color: t.splitLine */
    },
    series: [
      {
        type: "bar",
        data: [
          /* ... */
        ],
      },
    ],
  };
});
</script>

<template>
  <div>
    <p>Short intro paragraph ...</p>
    <v-chart :option="option" autoresize style="width:100%; height:220px" />
    <p>Closing paragraph ...</p>
  </div>
</template>
```

Other worked examples:

- [`descriptions/wrf_d02.vue`](../frontend/src/config/projects/descriptions/wrf_d02.vue) - line chart (diurnal temperature)
- [`descriptions/hourly_adult_population.vue`](../frontend/src/config/projects/descriptions/hourly_adult_population.vue) - line chart (hourly population)

Tree-shake the ECharts imports you actually use (`LineChart`, `BarChart`,
`GridComponent`, etc.) so the bundle only carries what you draw.

### Example: inline SVG

For static schematics, inline SVG works without any chart library:

```vue
<script setup lang="ts">
import { useChartTheme } from "@/utils/chart-theme";
const chartTheme = useChartTheme();
</script>

<template>
  <svg viewBox="0 0 400 220" :style="{ color: chartTheme.axis }">
    <rect
      x="20"
      y="35"
      width="360"
      height="160"
      fill="none"
      :stroke="chartTheme.axis"
      stroke-dasharray="4 4"
    />
    <text x="28" y="28" fill="currentColor">d02 - Leman region, 1 km</text>
  </svg>
</template>
```

Worked example:
[`descriptions/wrf_domains_schema.vue`](../frontend/src/config/projects/descriptions/wrf_domains_schema.vue),
shared by `wrf_d03.vue` and `wrf_d04.vue` via a `highlight` prop. That is a
pattern worth copying when two related sub-vizzes should show the same figure
with a small variation.

---

## Theme reactivity for figures

For any "chrome" colour (axis labels, split lines, tooltip background, SVG
outlines), read from `useChartTheme()` in `src/utils/chart-theme.ts` instead
of hard-coding a value. It returns a computed that flips when the theme
store's mode changes, so the chart re-renders in sync with the rest of the
app.

```ts
import { useChartTheme } from "@/utils/chart-theme";
const chartTheme = useChartTheme();

// in option / template:
const t = chartTheme.value; // { axis, splitLine, tooltipBg, tooltipText, tooltipBorder }
```

**Data colours** (the line colour on a temperature chart, the per-bar colour
on a histogram) should stay fixed - they encode meaning, not theme. When you
can, pull them from the map layer's palette so the chart and the map speak
the same colour language.

---

## Style guide

For visual coherency across the drawer, stick to three inline styles:

- normal text
- _italic_ (`_italic_` in Markdown, `<em>italic</em>` in HTML)
- links

Avoid bold, inline code, and other distinct emphasis styles - they create
noise across the set of projects. Block-level structure (paragraphs, lists,
figures) is fine.

---

## Quick reference

| Need                              | Use                                     |
| --------------------------------- | --------------------------------------- |
| One sentence                      | Plain string                            |
| Paragraphs, links, lists          | Markdown                                |
| HTML attributes / custom elements | Raw HTML in the same field              |
| Chart                             | `descriptionComponent` + ECharts SFC    |
| Static diagram                    | `descriptionComponent` + inline SVG SFC |
| Same figure, slight variation     | Shared SFC + a prop on each wrapper     |

All four styles live in the same `description` field (the first three) or
next to it as `descriptionComponent` (the fourth). You can freely switch from
one to another as a dataset's needs evolve.
