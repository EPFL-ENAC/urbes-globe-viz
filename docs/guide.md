# Adding a Dataset to Urbes Globe Viz

A step-by-step guide for researchers. No prior programming experience required.

---

**Table of contents**

- [How this project works](#how-this-project-works)
- [Part 1 — One-time setup](#part-1--one-time-setup)
  - [1.1 Install WSL2 (Windows only)](#11-install-wsl2-windows-only)
  - [1.2 Install Node.js and npm](#12-install-nodejs-and-npm)
  - [1.3 Install GDAL](#13-install-gdal)
  - [1.4 Install tippecanoe](#14-install-tippecanoe)
  - [1.5 Install Git](#15-install-git)
  - [1.6 Clone the repository](#16-clone-the-repository)
  - [1.7 Install project dependencies](#17-install-project-dependencies)
  - [1.8 Download the map data](#18-download-the-map-data)
  - [1.9 Verify everything works](#19-verify-everything-works)
- [Part 2 — Process your data](#part-2--process-your-data)
  - [2.1 Create your processing folder](#21-create-your-processing-folder)
  - [2.2 Do I need PMTiles?](#22-do-i-need-pmtiles)
  - [2.3 Pick your recipe](#23-pick-your-recipe)
  - [2.4 Choosing zoom levels](#24-choosing-zoom-levels)
  - [2.5 Understanding --layer](#25-understanding---layer)
  - [2.6 Understanding -t_srs EPSG:4326](#26-understanding--t_srs-epsg4326)
  - [2.7 Verify your output](#27-verify-your-output)
  - [2.8 Place the output file](#28-place-the-output-file)
- [Part 3 — Add your project to the frontend](#part-3--add-your-project-to-the-frontend)
  - [3.1 Find a similar existing project](#31-find-a-similar-existing-project)
  - [3.2 Copy and rename a config file](#32-copy-and-rename-a-config-file)
  - [3.3 Fill in the metadata](#33-fill-in-the-metadata)
  - [3.4 Configure the map source and layer](#34-configure-the-map-source-and-layer)
  - [3.5 Register your project](#35-register-your-project)
  - [3.6 (Optional) Add a legend](#36-optional-add-a-legend)
- [Part 4 — Test and submit](#part-4--test-and-submit)
  - [4.1 Create a branch](#41-create-a-branch)
  - [4.2 Test locally](#42-test-locally)
  - [4.3 Take a screenshot for the preview](#43-take-a-screenshot-for-the-preview)
  - [4.4 Commit your changes](#44-commit-your-changes)
  - [4.5 Push and create a pull request](#45-push-and-create-a-pull-request)
  - [4.6 Upload your data file for production](#46-upload-your-data-file-for-production)
  - [4.7 What happens next](#47-what-happens-next)
- [Appendix A — Zoom level reference](#appendix-a--zoom-level-reference)
- [Appendix B — Common layer paint styles](#appendix-b--common-layer-paint-styles)
- [Appendix C — Troubleshooting](#appendix-c--troubleshooting)

---

## How this project works

Urbes Globe Viz is a website that displays geospatial datasets on an interactive 3D globe. It is built and maintained by the EPFL URBES group and ENAC-IT4R. You can see it live at https://urbes-globe-viz.epfl.ch/.

**You do not need to understand JavaScript or web development.** Adding a dataset means:

1. Converting your data file into a web-friendly format (a few terminal commands)
2. Copying an existing configuration file and changing a few values (text editing)
3. Testing on your computer, then submitting your changes for review

Here is the full workflow:

```
Your data file (CSV, Shapefile, GeoJSON, GeoTIFF, …)
        │
        ▼
   Processing script (ogr2ogr, tippecanoe, …)
        │
        ▼
   Web-optimized file (.pmtiles or .geojson)
        │
        ▼
   Frontend config file (.ts — copy an existing one and edit it)
        │
        ▼
   Test on your computer (localhost:9000)
        │
        ▼
   Submit a pull request on GitHub → deployed to the website
```

**Local vs. deployed:** When you develop, the app runs on your own computer at `http://localhost:9000`. Nobody else can see it. Once your changes are reviewed and merged on GitHub, they appear on the public EPFL website within minutes.

### What goes where

Not everything lives in the same place. Here is a summary:

| File type                           | Where it lives                                                          | Committed to Git? |
| ----------------------------------- | ----------------------------------------------------------------------- | ----------------- |
| Raw data (Shapefile, CSV, etc.)     | `processing/my_dataset/` (your computer only)                           | No                |
| Processed data (.pmtiles, .geojson) | Shared NAS for production, `frontend/public/geodata/` for local testing | No                |
| Config file (.ts)                   | `frontend/src/config/projects/`                                         | Yes               |
| Preview image (.png)                | `frontend/public/previews/`                                             | Yes               |
| index.ts changes                    | `frontend/src/config/projects/index.ts`                                 | Yes               |

**Rule of thumb:** Git stores only small text files (config, code, images). Large data files are stored on the shared NAS and served by the website automatically.

---

## Part 1 — One-time setup

You only need to do this once. After that, skip straight to [Part 2](#part-2--process-your-data) for each new dataset.

### 1.1 Install WSL2 (Windows only)

> If you are already on Linux (e.g. a university workstation), skip to [1.2](#12-install-nodejs-and-npm).

The tools in this guide only work on Linux. **WSL2** (Windows Subsystem for Linux) gives you a Linux terminal inside Windows.

1. Open **PowerShell as Administrator** (right-click the Start menu → "Terminal (Admin)" or "PowerShell (Admin)")
2. Run:

```powershell
wsl --install
```

3. **Restart your computer** when prompted.
4. After restarting, open the **Ubuntu** app from the Start menu. It will finish setting up and ask you to create a username and password.

You now have a Linux terminal. **All commands from this point forward go in this Ubuntu terminal**, not in PowerShell.

> **Tip:** Your Windows files are accessible from Ubuntu at `/mnt/c/Users/YourName/`. Your Ubuntu files are accessible from Windows File Explorer by typing `\\wsl$\Ubuntu` in the address bar.

### 1.2 Install Node.js and npm

**What are these?** Node.js runs JavaScript outside a browser. npm is its package manager (like pip for Python). The app's user interface is built with these tools.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node --version   # should print v22.x.x or higher
npm --version    # should print 10.x.x or higher
```

### 1.3 Install GDAL

**What is this?** GDAL is a toolkit for converting between geospatial file formats. It includes `ogr2ogr` (for vector data like Shapefiles and GeoPackages) and `gdal_translate` / `gdalwarp` (for raster data like GeoTIFFs).

```bash
sudo apt update
sudo apt install -y gdal-bin
```

Verify:

```bash
ogr2ogr --version   # should print GDAL 3.x.x
```

### 1.4 Install tippecanoe

**What is this?** tippecanoe converts GeoJSON files into PMTiles — a compact tile format that web maps can load efficiently. You only need this for vector data (points, lines, polygons). If you are working with raster data (GeoTIFF images), you can skip this step.

First, check your Ubuntu version:

```bash
lsb_release -rs
```

**If 23.04 or newer** (one command):

```bash
sudo apt install -y tippecanoe
```

**If 22.04** (the WSL default — build from source, takes ~2 minutes):

```bash
sudo apt install -y build-essential libsqlite3-dev zlib1g-dev
git clone https://github.com/felt/tippecanoe.git
cd tippecanoe && make -j && sudo make install
cd .. && rm -rf tippecanoe
```

Verify:

```bash
tippecanoe --version
```

### 1.5 Install Git

**What is this?** Git tracks changes to code. GitHub is a website that hosts the code and lets you propose changes (called "pull requests"). You need a [GitHub account](https://github.com/signup) — sign up with your EPFL email if you don't have one.

```bash
sudo apt install -y git
```

Set your identity (used in commit messages):

```bash
git config --global user.name "Your Full Name"
git config --global user.email "your.email@epfl.ch"
```

### 1.6 Clone the repository

**What does this do?** "Cloning" downloads a complete copy of all the project's code to your computer.

```bash
git clone https://github.com/EPFL-ENAC/urbes-globe-viz.git
cd urbes-globe-viz
```

You are now inside the project folder. **All commands from now on assume you are in this folder** (`urbes-globe-viz/`).

### 1.7 Install project dependencies

This downloads all the JavaScript libraries the app needs. It takes 1–2 minutes.

```bash
npm install
npm install --prefix frontend
npx lefthook install
```

> **What do these do?**
>
> - `npm install` — installs shared tools (code formatter, commit message checker)
> - `npm install --prefix frontend` — installs the frontend app's libraries (Vue, MapLibre, etc.)
> - `npx lefthook install` — sets up automatic code formatting before each commit

### 1.8 Download the map data

The data files displayed on the globe are large (hundreds of MB) and are not stored in Git. This command downloads them from the EPFL server so you can test locally:

```bash
make download-geodata
```

This may take several minutes depending on your connection. The files are saved to `frontend/public/geodata/`.

### 1.9 Verify everything works

Start the local development server:

```bash
cd frontend && npm run dev
```

Open http://localhost:5173 in your browser (Chrome, Firefox, or Edge). You should see a spinning globe with project cards.
Warning : the port number may vary, check the terminal output for the correct URL.

Click on a project card to verify the maps load correctly.

Press **Ctrl+C** in the terminal to stop the server, then go back to the project root:

```bash
cd ..
```

Setup is complete. You can now add datasets.

---

## Part 2 — Process your data

This part converts your data file into a format that the web app can display.

### 2.1 Create your processing folder

Each dataset gets its own folder under `processing/`. This keeps your raw data and scripts organized.

```bash
mkdir -p processing/my_dataset_name
```

Replace `my_dataset_name` with a short, descriptive name in **snake_case** (lowercase with underscores). Examples: `building_heights_zurich`, `air_quality_lausanne`, `population_grid_europe`.

Copy your data file into this folder:

```bash
cp /path/to/your/data_file.shp processing/my_dataset_name/
```

> **WSL tip:** Your Windows files are at `/mnt/c/Users/YourName/`. For example, if your file is on your Desktop:
>
> ```bash
> cp /mnt/c/Users/YourName/Desktop/my_data.shp processing/my_dataset_name/
> ```

Move into the folder:

```bash
cd processing/my_dataset_name
```

### 2.2 Do I need PMTiles?

**PMTiles** is a compact tile format that loads quickly in the browser because it only fetches the visible area of the map. You need it when your data is large.

| Your situation                      | What to do                                                               |
| ----------------------------------- | ------------------------------------------------------------------------ |
| GeoJSON file **smaller than 50 MB** | Use it directly — copy to `frontend/public/geodata/` and skip tippecanoe |
| GeoJSON file **larger than 50 MB**  | Convert to PMTiles (see [2.3](#23-pick-your-recipe))                     |
| Shapefile, GeoPackage, or CSV       | Must convert — follow the appropriate recipe                             |
| Raster GeoTIFF                      | Convert to Cloud Optimized GeoTIFF (COG) — no PMTiles needed             |

> **How to check your file size:** run `ls -lh my_data.geojson` in the terminal. Look at the number before the date — for example `12M` means 12 MB, `340M` means 340 MB.

### 2.3 Pick your recipe

Choose the recipe that matches your input file format. Each recipe is a separate page with detailed commands — open it in a new tab and follow the steps, then come back here.

| I have…                                      | Recipe                                                                   | Notes                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| CSV with lat/lon columns                     | [CSV → PMTiles](../processing/cookbook/csv_to_pmtiles.md)                | Needs Python (install uv first: `curl -LsSf https://astral.sh/uv/install.sh \| sh`) |
| CSV + a geometry file (Shapefile/GeoPackage) | [CSV Spatial Join → PMTiles](../processing/cookbook/csv_spatial_join.md) | For zone-based data or flow arcs                                                    |
| Shapefile (.shp)                             | [Shapefile → PMTiles](../processing/cookbook/shp_to_pmtiles.md)          | Uses ogr2ogr + tippecanoe                                                           |
| GeoPackage (.gpkg)                           | [GeoPackage → PMTiles](../processing/cookbook/gpkg_to_pmtiles.md)        | Uses ogr2ogr + tippecanoe                                                           |
| GeoJSON (.geojson)                           | [GeoJSON → PMTiles](../processing/cookbook/geojson_to_pmtiles.md)        | Simplest — only needs tippecanoe                                                    |
| Raster GeoTIFF (.tif)                        | [Raster → COG](../processing/cookbook/raster_to_cog.md)                  | Uses GDAL only, no tippecanoe                                                       |
| NetCDF (WRF, PALM, climate simulations)      | [NetCDF → COG](../processing/cookbook/netcdf_to_cog.md)                  | Needs Python + uv. Multi-band COG with time slider support                          |

> **Important:** In the recipe commands, replace `my_data` with your actual dataset name (the same `my_dataset_name` you used for your folder).

> **tippecanoe tip:** When running tippecanoe, choose the right strategy for your geometry type:
>
> - **Points or lines:** use `--drop-densest-as-needed` (thins dense clusters at low zoom)
> - **Polygons:** use `--coalesce-densest-as-needed` (merges small polygons instead of dropping)
> - **Small datasets (< 10k features):** use `--no-feature-limit --no-tile-size-limit` (keeps everything)

ogr2ogr command example (Shapefile or GeoPackage to GeoJSON, with coordinate conversion):

```bash
ogr2ogr -t_srs EPSG:4326 my_dataset_name.json my_dataset_name.gpkg
```

tippecanoe command example (GeoJSON to PMTiles):

```bash
tippecanoe -zg --projection=EPSG:4326 --layer=my_dataset_name --minimum-zoom=4 --maximum-zoom=12 -o my_dataset_name.pmtiles my_dataset_name.json
```

### 2.4 Choosing zoom levels

When using tippecanoe, you must specify `--minimum-zoom` and `--maximum-zoom`. These control how far users can zoom in and out on your data.

| Your data covers…           | `--minimum-zoom` | `--maximum-zoom` | Example                |
| --------------------------- | ---------------- | ---------------- | ---------------------- |
| The whole world             | 0                | 6                | Global population grid |
| A continent or large region | 2                | 8                | European roads         |
| A single country            | 4                | 12               | Swiss buildings        |
| A city or metro area        | 8                | 14               | Lausanne bike lanes    |

**When in doubt, use `--minimum-zoom=4 --maximum-zoom=12`.** You can always regenerate with different values later.

More zoom levels = larger output file. Each additional zoom level roughly quadruples the number of tiles.

### 2.5 Understanding `--layer`

The `--layer` flag in tippecanoe names the data layer inside the PMTiles file. **You will need this exact name later** when configuring the frontend.

Use your dataset name in snake_case:

```bash
--layer=my_dataset_name
```

This name will go into the `source-layer` field in your project config file (see [Step 3.4](#34-configure-the-map-source-and-layer)). They must match exactly.

### 2.6 Understanding `-t_srs EPSG:4326`

Web maps use longitude/latitude coordinates (a system called WGS84, code `EPSG:4326`). If your data uses a different coordinate system — for example Swiss coordinates (`EPSG:2056`) — `ogr2ogr` converts it automatically when you add the `-t_srs EPSG:4326` flag.

If you are unsure what coordinate system your data uses:

```bash
ogrinfo -so your_file.shp your_layer_name | grep "Layer SRS"
```

If it already says `EPSG:4326` or `WGS 84`, you don't need `-t_srs`. But including it never hurts — if the data is already in WGS84, it does nothing.

### 2.7 Verify your output

Before going further, check that your output file looks correct:

1. Open https://pmtiles.io in your browser
2. Drag your `.pmtiles` file onto the page
3. Check:
   - Are the features in the right location on the map?
   - Can you click on a feature and see its attributes?
   - Does it look reasonable at different zoom levels?

> **For GeoJSON files:** open https://geojson.io and drag your file onto the map instead.

> **For COG raster files:** you can skip this step — you will test them visually in [Step 4.1](#41-test-locally).

### 2.8 Place the output file

Copy your processed file to the frontend's geodata folder:

```bash
cp my_dataset_name.pmtiles ../../frontend/public/geodata/
```

Or for GeoJSON:

```bash
cp my_dataset_name.geojson ../../frontend/public/geodata/
```

Then go back to the project root:

```bash
cd ../..
```

---

## Part 3 — Add your project to the frontend

Now you tell the app about your dataset by creating a configuration file.

### 3.1 Find a similar existing project

Look at the existing project configs and pick the one most similar to your data. This will be your starting point.

| File                         | What it shows                                | Layer type            | Good starting point for…            |
| ---------------------------- | -------------------------------------------- | --------------------- | ----------------------------------- |
| `buildings.ts`               | Swiss buildings colored by construction year | `fill-extrusion` (3D) | 3D polygon data                     |
| `roads_swiss_statistics.ts`  | Swiss roads colored by traffic volume        | `line`                | Line data (roads, rivers, …)        |
| `building_heights_china.ts`  | Building heights as colored dots             | `circle`              | Point data                          |
| `hourly_adult_population.ts` | Population density grid                      | `fill`                | Area/polygon data (flat)            |
| `dave_flows.ts`              | Mobility flow arcs (Deck.gl)                 | custom renderer       | Origin-destination flows            |
| `wrf.ts`                     | Urban climate (WRF/PALM COG rasters)         | COG + subViz          | Multi-variable COG with time slider |

All files are in `frontend/src/config/projects/`.

### 3.2 Copy and rename a config file

Copy the most similar project config and rename it to match your dataset:

```bash
cp frontend/src/config/projects/roads_swiss_statistics.ts \
   frontend/src/config/projects/my_dataset_name.ts
```

Open the new file in a text editor. On WSL, you can use:

```bash
nano frontend/src/config/projects/my_dataset_name.ts
```

Or open it in VS Code (if installed): `code frontend/src/config/projects/my_dataset_name.ts`

### 3.3 Fill in the metadata

Here is what each field means. Replace every value with your own.

> **Important:** Make sure the top of your file has these two import lines (they should already be there if you copied an existing config):
>
> ```typescript
> import type { ProjectConfig } from "./types";
> import { geodataBaseUrl as baseUrl } from "../geodata";
> ```
>
> `baseUrl` automatically points to the right server — `/geodata` during local development, and `https://urbes-viz.epfl.ch/geodata` in production. **Do not hardcode a URL.**

```typescript
export const myDatasetNameProject: ProjectConfig = {
  // ── Identity ──
  id: "my_dataset_name",
  // Must be unique. Used in the URL (/project/my_dataset_name) and
  // to link the data file. Use snake_case, matching your file name.

  coordinates: [6.63, 46.52],
  // Center of your data on the map: [longitude, latitude].
  // Find yours at https://www.latlong.net/

  // ── Card (what users see on the globe) ──
  title: "My Dataset Title",
  description: "One or two sentences describing what this dataset shows.",
  category: "Infrastructure",
  // Choose from: Infrastructure, Climate, Transport, Demographics, Mobility
  // (or add a new category — it appears as a filter chip)
  year: 2024,

  preview: "my_dataset_name.png",
  // Screenshot filename — you will create this in Step 4.2.
  // The file goes in frontend/public/previews/

  zoom: 10,
  // How close the camera zooms when opening the project:
  //   1 = entire world, 10 = city, 14 = street level

  pitch: 0,
  // Camera tilt in degrees: 0 = straight down, 75 = nearly horizontal.
  // Use 60–75 for 3D buildings, 0 for everything else.

  // ── Labels ──
  unit: "vehicles/day",
  // Unit shown in the interface (e.g. "meters", "persons", "year")

  info: "Source: My Institution, 2024",
  // Attribution text shown in the project detail panel
```

> **Richer descriptions:** `description` accepts plain text, Markdown, raw
> HTML, or a custom Vue component (for charts and diagrams). See the
> [descriptions tutorial](descriptions-tutorial.md) when a sentence isn't
> enough.

### 3.4 Configure the map source and layer

This tells the app where to find your data and how to draw it. There are two parts: **source** (where the data is) and **layer** (how to style it).

#### Source (PMTiles)

```typescript
  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/my_dataset_name.pmtiles`,
  },
```

> **If using GeoJSON directly** (small files < 50 MB), use this instead:
>
> ```typescript
>   source: {
>     type: "geojson",
>     data: `${baseUrl}/my_dataset_name.geojson`,
>   },
> ```

#### Layer

The layer defines how features are drawn on the map. The most important fields:

```typescript
  layer: {
    id: "my_dataset_name-layer",       // any unique string
    type: "circle",                     // see layer types below
    source: "my_dataset_name",          // MUST match the `id` field above
    "source-layer": "my_dataset_name",  // MUST match --layer from tippecanoe
    paint: {
      "circle-radius": 4,
      "circle-color": "#ff6600",
      "circle-opacity": 0.8,
    },
  },
```

**`source-layer`** must match the `--layer` name you gave tippecanoe in [Step 2.5](#25-understanding---layer). If these don't match, the map will be blank.

> **Note:** If you are using GeoJSON directly (not PMTiles), remove the `"source-layer"` line entirely — GeoJSON sources don't have named layers.

#### Which layer type should I use?

| Your data is…                       | Layer `type`       | Example paint                                                     |
| ----------------------------------- | ------------------ | ----------------------------------------------------------------- |
| Points (sensors, buildings, cities) | `"circle"`         | `{ "circle-radius": 4, "circle-color": "#ff6600" }`               |
| Lines (roads, rivers, routes)       | `"line"`           | `{ "line-color": "#4682b4", "line-width": 2 }`                    |
| Polygons (zones, districts) — flat  | `"fill"`           | `{ "fill-color": "#088", "fill-opacity": 0.6 }`                   |
| Polygons — 3D extrusion             | `"fill-extrusion"` | `{ "fill-extrusion-height": 50, "fill-extrusion-color": "#088" }` |

You can color features based on their attributes using expressions. See [Appendix B](#appendix-b--common-layer-paint-styles) for copy-pasteable examples.

For the full reference, see the [MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/layers/).

#### Source and layer (COG raster — for climate/raster data)

If your data is a **Cloud Optimized GeoTIFF** (e.g. converted from NetCDF climate simulations), you don't need a MapLibre `source` and `layer`. Instead, use the `"deckgl-cog"` renderer:

```typescript
  renderer: "deckgl-cog",

  cogRaster: {
    url: "my_climate_t2_cog.tif",                        // filename in geodata/
    colorScale: ["#000004", "#932667", "#fcffa4"],        // low → high colors
    colorScaleValueRange: [280, 310],                     // data value range
  },
```

For **multiple selectable variables** (e.g. temperature, wind, humidity), use `cogVariables` instead of `cogRaster`. For **time-animated data** (multi-band COGs), add a `timeControl` field.

See the [NetCDF → COG recipe](../processing/cookbook/netcdf_to_cog.md#frontend-configuration) for full configuration examples including variable selectors, time sliders, and multi-domain sub-visualizations.

> **Advanced:** For custom visualizations, see `dave_flows.ts` (Deck.gl flow arcs) or `wrf.ts` (COG rasters with multiple domains, variable selector, and time slider) for examples using the `renderer`, `subViz`, `cogVariables`, and `timeControl` fields.

### 3.5 Register your project

Open `frontend/src/config/projects/index.ts` and make two edits:

**1. Add an import at the top** (with the other imports):

```typescript
import { myDatasetNameProject } from "./my_dataset_name";
```

**2. Add it to the `allProjects` array**:

```typescript
const allProjects: ProjectConfig[] = [
  buildingsProject,
  wrfProject,
  roadsSwissStatisticsProject,
  hourlyAdultPopulationProject,
  daveFlowsProject,
  buildingHeightsChinaProject,
  myDatasetNameProject, // ← add this line
];
```

> **Important:** The export name (`myDatasetNameProject`) must match exactly what you wrote in your config file's `export const ...` line.

### 3.6 (Optional) Add a legend

If your map uses colors to represent values, add a legend so users understand what they're seeing:

```typescript
  legend: {
    title: "Traffic volume",
    items: [
      { color: "#b0e0e6", label: "0–5 000", shape: "line" },
      { color: "#4682b4", label: "5 000–10 000", shape: "line" },
      { color: "#ff4500", label: "10 000–20 000", shape: "line" },
      { color: "#8b0000", label: "20 000+", shape: "line" },
    ],
  },
```

Shapes: `"circle"` for points, `"line"` for lines, `"square"` for areas. See the [legend tutorial](legend-tutorial.md) for more options.

---

## Part 4 — Test and submit

### 4.1 Create a branch

**What is a branch?** A branch is a separate version of the code where you make your changes. This keeps the main version clean until your changes are reviewed and approved.

Create your branch **before making any more changes**. From the project root:

```bash
git checkout -b add-my-dataset-name
```

Replace `my-dataset-name` with your actual dataset name (use hyphens for branch names, e.g. `add-building-heights-zurich`).

> You are now working on your own branch. All the config changes you made in Parts 2–3 are already on this branch.

### 4.2 Test locally

Start the development server:

```bash
cd frontend && npm run dev
```

Open http://localhost:9000 in your browser:

1. Find your project card on the globe — it should appear at the coordinates you specified
2. Click on it — the project detail view opens with your map
3. Verify the data looks correct: right location, right colors, features visible

Press **Ctrl+C** to stop the server, then go back to the project root:

```bash
cd ..
```

**Common problems:**

| Symptom                                                        | Likely cause                                                          | Fix                                                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Card appears but **map is blank**                              | `source-layer` in your config doesn't match `--layer` from tippecanoe | Open your config, check the `"source-layer"` value matches exactly                  |
| **Data appears at coordinates 0,0** (in the ocean near Africa) | Coordinate system was not converted to WGS84                          | Re-run ogr2ogr with `-t_srs EPSG:4326`                                              |
| **No card appears** on the globe                               | Project not registered in `index.ts`                                  | Check you added the import and array entry in [Step 3.5](#35-register-your-project) |
| **Build error** in the terminal                                | Syntax error in your .ts file                                         | Check for missing commas, unmatched brackets, or typos                              |

### 4.3 Take a screenshot for the preview

The preview image is shown on the project card on the globe.

1. With the dev server running, navigate to your project's map view
2. Zoom and pan to a view that shows your data well
3. Take a screenshot:
   - **Windows (WSL):** press `Win + Shift + S`, select the map area
   - **Linux:** use your screenshot tool or `gnome-screenshot -a`
4. Crop to roughly **400 x 300 pixels** (landscape orientation)
5. Save as PNG in the previews folder:

```
frontend/public/previews/my_dataset_name.png
```

6. Make sure the `preview` field in your config matches the filename:

```typescript
preview: "my_dataset_name.png",
```

### 4.4 Commit your changes

**What is a commit?** A commit saves a snapshot of your changes with a message describing what you did.

Add only the files you changed:

```bash
git add frontend/src/config/projects/my_dataset_name.ts
git add frontend/src/config/projects/index.ts
git add frontend/public/previews/my_dataset_name.png
```

> **Do NOT add the geodata file** (the .pmtiles or .geojson in `frontend/public/geodata/`). Data files are too large for Git — they go on the shared NAS instead (see [Step 4.6](#46-upload-your-data-file-for-production)).

Commit:

```bash
git commit -m "feat: add my_dataset_name project"
```

### 4.5 Push and create a pull request

**What is a pull request (PR)?** A pull request asks the team to review your changes and merge them into the main codebase. Once merged, your dataset appears on the website.

Push your branch to GitHub:

```bash
git push -u origin add-my-dataset-name
```

Git will print a URL. Open it in your browser, or go to:
https://github.com/EPFL-ENAC/urbes-globe-viz/pulls

Click **"New Pull Request"**, select your branch, write a short description of your dataset, and click **"Create Pull Request"**.

### 4.6 Upload your data file for production

The data file (.pmtiles, .geojson, or .tif) must be placed on the **shared EPFL NAS storage** so the production website can serve it.

1. Ask a team member (Pierre) for the NAS path and access instructions if you don't have them yet
2. Connect to the shared drive using your **EPFL credentials** (Gaspar login)
3. Copy your data file into the `geodata/` folder on the NAS
4. It will be automatically served at `https://urbes-viz.epfl.ch/geodata/your_file.pmtiles`
5. Verify by opening that URL in your browser — you should see a download start or a file response

> **Note:** You can upload the data file before or after the pull request is merged. The website will start displaying it once both the config (merged PR) and the data (on NAS) are in place.

### 4.7 What happens next

1. A team member reviews your pull request — they may ask for small changes
2. Once approved and merged, the dataset appears on the **dev site** (https://urbes-globe-viz-dev.epfl.ch/) within a few minutes
3. If the data file is already on the NAS, it also appears on the **production site** (https://urbes-globe-viz.epfl.ch/)

---

## Appendix A — Zoom level reference

| Zoom level | Approximate scale | What's visible                  |
| ---------- | ----------------- | ------------------------------- |
| 0          | Whole world       | Continents                      |
| 2          | Subcontinental    | Large countries                 |
| 4          | Large country     | Country outlines, major regions |
| 6          | Small country     | Regions, major cities           |
| 8          | State / canton    | Cities, main roads              |
| 10         | Metro area        | Neighborhoods, secondary roads  |
| 12         | City district     | Individual blocks, all roads    |
| 14         | Street level      | Individual buildings            |

**Rule of thumb for tippecanoe:**

- `--minimum-zoom` = the most zoomed-out level where your data is still meaningful
- `--maximum-zoom` = the most zoomed-in level where additional detail is useful

Each additional zoom level roughly quadruples the number of tiles and the file size.

## Appendix B — Common layer paint styles

Copy-paste these into the `paint` section of your layer config and adjust the values.

### Colored points (circle)

Color points by a numeric attribute:

```typescript
paint: {
  "circle-radius": 4,
  "circle-color": [
    "interpolate", ["linear"],
    ["get", "my_attribute"],  // replace with your attribute name
    0, "#2166ac",             // value → color
    50, "#f7f7f7",
    100, "#b2182b",
  ],
  "circle-opacity": 0.8,
},
```

### Colored lines

Color lines by a numeric attribute (e.g. traffic volume):

```typescript
paint: {
  "line-color": [
    "interpolate", ["linear"],
    ["get", "traffic_volume"],
    0, "#b0e0e6",
    5000, "#4682b4",
    10000, "#ff4500",
    20000, "#8b0000",
  ],
  "line-width": 2,
  "line-opacity": 0.8,
},
```

### Filled polygons (flat)

Fill areas with a single color:

```typescript
paint: {
  "fill-color": "#088",
  "fill-opacity": 0.6,
},
```

Color areas by a category:

```typescript
paint: {
  "fill-color": [
    "match", ["get", "land_use"],
    "residential", "#f1c40f",
    "commercial", "#e74c3c",
    "industrial", "#9b59b6",
    "#cccccc",  // default color
  ],
  "fill-opacity": 0.6,
},
```

### 3D extruded polygons

Extrude polygons to a height based on an attribute:

```typescript
paint: {
  "fill-extrusion-height": ["get", "height"],
  "fill-extrusion-color": [
    "interpolate", ["linear"],
    ["get", "year_built"],
    1950, "#FF0000",
    2000, "#FFFF00",
    2020, "#00FF00",
  ],
},
```

## Appendix C — Troubleshooting

### WSL2

- **"WSL is not enabled"**: Make sure you ran PowerShell as Administrator. You may also need to enable virtualization in your BIOS.
- **"The virtual machine could not be started"**: Enable "Virtual Machine Platform" in Windows Features (Control Panel → Programs → Turn Windows features on or off).

### npm / Node.js

- **"npm: command not found"**: Re-run the Node.js install commands from [Step 1.2](#12-install-nodejs-and-npm), then open a new terminal.
- **"EACCES permission denied"**: Don't use `sudo` with `npm install`. If you get this error, delete `node_modules` and retry: `rm -rf node_modules && npm install`

### tippecanoe

- **Build fails with "sqlite3.h: No such file"**: Run `sudo apt install -y libsqlite3-dev` first.
- **"tippecanoe: command not found" after build**: Run `sudo make install` in the tippecanoe directory.

### Data issues

- **Features appear at 0,0 (Null Island)**: Your data has missing coordinates or is in a local CRS that wasn't converted. Re-run ogr2ogr with `-t_srs EPSG:4326`.
- **Map is blank but no errors**: The `source-layer` name in your config doesn't match the `--layer` name from tippecanoe. Check both values match exactly.
- **Preview image not showing**: Check the file is in `frontend/public/previews/` and the `preview` field in your config matches the filename (case-sensitive).
- **"Error: source layer not found"**: The PMTiles file exists but doesn't contain the expected layer name. Run `pmtiles show your_file.pmtiles` or check on https://pmtiles.io.
