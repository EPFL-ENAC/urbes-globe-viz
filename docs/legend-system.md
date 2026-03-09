# Map Legend System

A small overlay shown bottom-left of the map. Opt-in per project via the `legend` field in the project config. Sub-viz sections can each carry their own legend.

## JSON Format

### Discrete items (categories, building types)

```ts
legend: {
  title: "Construction year",
  items: [
    { color: "#FF0000", label: "Pre-1950",  shape: "square" },
    { color: "#FFFF00", label: "1950–2000", shape: "square" },
    { color: "#00FF00", label: "Post-2000", shape: "square" },
  ],
}
```

### Gradient (continuous scale)

```ts
legend: {
    title: "Hourly population",
    gradient: {
      stops: [
        { value: "0", color: "#00ffff" },
        { value: "500", color: "#0080FF" },
        { value: "1'000", color: "#4000FF" },
        { value: "2'000", color: "#8000FF" },
        { value: "3'000", color: "#C000FF" },
        { value: "4'000", color: "#FF00FF" },
        { value: "5'000", color: "#FF80FF" },
      ],
      unit: "adults/500m²",
    },
  },
```

Both `items` and `gradient` can coexist — items render first, gradient below.

### `shape` values for items

| Value                | SVG element | Typical use                     |
| -------------------- | ----------- | ------------------------------- |
| `"square"` (default) | `<rect>`    | fills, polygons, fill-extrusion |
| `"circle"`           | `<circle>`  | point data                      |
| `"line"`             | `<line>`    | roads, routes                   |

## TypeScript types

Defined in `frontend/src/config/projects/types.ts`:

```ts
interface LegendItem {
  color: string;
  label: string;
  shape?: "line" | "circle" | "square";
}

interface LegendGradient {
  stops: Array<{ value: string | number; color: string }>;
  unit?: string;
}

interface ProjectLegend {
  title?: string;
  items?: LegendItem[];
  gradient?: LegendGradient;
}
```

Both `ProjectConfig` and `SubViz` accept an optional `legend?: ProjectLegend` field.

## Files

| File                                                     | Role                                            |
| -------------------------------------------------------- | ----------------------------------------------- |
| `frontend/src/config/projects/types.ts`                  | Type definitions                                |
| `frontend/src/components/features/MapLegend.vue`         | Overlay component                               |
| `frontend/src/pages/ProjectDetailView.vue`               | `activeLegend` computed + renders `<MapLegend>` |
| `frontend/src/config/projects/buildings.ts`              | Example: discrete items                         |
| `frontend/src/config/projects/roads_swiss_statistics.ts` | Example: gradient                               |
| `frontend/src/config/projects/_example.ts.example`       | Commented template                              |

## Sub-viz behavior

When a project uses `subViz`, each section can define its own `legend`. The active legend updates as the user scrolls through sections. If a sub-viz has no `legend`, the overlay is hidden for that section.
