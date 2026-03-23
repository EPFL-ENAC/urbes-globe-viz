# Map Legend System – A Tutorial

This tutorial will guide you through creating custom legends within the Urbes Viz Globes App.

## What is a Legend?

A legend is a small overlay shown in the bottom-left corner of the map. It acts as a key to help users understand what the colors and symbols on your map mean.

To add a legend to your project:

1. Open your project configuration file
2. Add a `legend` field with your legend definition
3. Save the file – the legend will appear automatically

## Step 1: Choose Your Legend Type

You have two options for your legend format:

### Type A: Discrete Items (Categories)

Use this when you have separate categories, like building types or age groups.

Here's an example:

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

**What each part does:**

- `title`: Displays at the top of the legend
- `items`: An array of category entries
- `color`: The hex color code for this category
- `label`: The text that appears next to the color
- `shape`: The shape of the symbol (see shape options below)

### Type B: Gradient (Continuous Scale)

Use this when you're showing a numeric scale, like population density or traffic volume.

Here's an example:

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

**What each part does:**

- `title`: Displays at the top of the legend
- `gradient`: Contains the continuous color scale
- `stops`: An array of color transitions with their values
- `value`: The numeric point where this color starts
- `color`: The hex color code for this value
- `unit`: The unit of measurement (optional)

## Step 2: Understand the Shape Options

For discrete items, you can choose from three shape values:

| Value                | SVG Element | Typical Use                     |
| -------------------- | ----------- | ------------------------------- |
| `"square"` (default) | `<rect>`    | fills, polygons, fill-extrusion |
| `"circle"`           | `<circle>`  | point data                      |
| `"line"`             | `<line>`    | roads, routes                   |

When defining your legend items, match the shape to your map layer:

- Use `square` for polygon or fill layers
- Use `circle` for point layers
- Use `line` for route or road layers

Always confirm both the shape and color before interpreting what a feature means.

## Step 3: Read and Interpret Your Legend

Now that you've created your legend, here's how to use it effectively:

### 1) Identify the Legend Type

Check whether your legend uses:

- `items` (discrete): separate categories (e.g., building types or age groups)
- `gradient` (continuous): numeric intensity/range (e.g., traffic volume)
- Both: read `items` first (categories), then `gradient` (value range)

### 2) Match Symbols to Your Map Layer

Each legend item combines a color, label, and shape. Match them to verify you're interpreting the map correctly:

- Confirm the shape matches the layer type (point, line, or polygon)
- Confirm the color matches what you see on the map

### 3) Read Values Carefully

For gradient legends:

- Read stops from low to high values
- Check the `unit` before comparing values
- Remember that values like `20 000+` are open-ended ranges, not exact counts

### 4) Compare Only Comparable Legends

When comparing results across projects or sub-visualization sections:

- Ensure variable definitions are aligned
- Verify class breaks are consistent
- Confirm units match

### 5) Understand Sub-Viz Context

If your project uses `subViz`:

- Each section can define its own legend
- As users scroll, the active legend changes with each section
- If a section has no legend, the overlay is hidden and interpretation should rely on section text and context

### 6) Follow a Suggested Analysis Workflow

1. Read the title and unit
2. Confirm the symbol type (point/line/polygon)
3. Validate your interpretation on a few known locations
4. Then proceed with spatial or quantitative comparisons

## Quick Reference

**To add a legend:** Add a `legend` field to your project config

**For discrete categories:** Use the `items` array with `color`, `label`, and `shape`

**For continuous scales:** Use the `gradient` with `stops` array and optional `unit`

**Shape options:** `"square"` for areas, `"circle"` for points, `"line"` for routes
