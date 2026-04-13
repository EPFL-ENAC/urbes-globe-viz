# NetCDF (WRF / PALM) → Cloud Optimized GeoTIFF

Convert climate simulation NetCDF files into multi-band Cloud Optimized GeoTIFFs (COGs) for the Deck.gl COG renderer. Each timestep becomes a separate band, enabling time-slider animation in the browser.

Supports two model types:

- **WRF** — mesoscale weather model with curvilinear lon/lat grids (XLONG/XLAT arrays)
- **PALM** — microscale large-eddy simulation with local meter grids (origin in Swiss LV95 / EPSG:2056)

The conversion script auto-detects which type your file is.

## Pipeline

```
wrfout_d03_2022-07-15_12_00_00   ─┐
wrfout_d02_2022-07-15_12_00_00   ─┤  nc_to_cog.py     frontend/public/geodata/
TEST_4_3d.001-001.nc             ─┘  ──────────────►   wrf_d03_t2_cog.tif
                                     (per variable)     wrf_d02_t2_cog.tif
                                                        palm_ta_cog.tif
                                                        …
```

## Requirements

- **Python 3.10+**
- **GDAL** (`gdalwarp`, `gdal_translate`, `gdalbuildvrt`, `gdalinfo`)
- **uv** — Python package manager (installs `netcdf4` and `numpy` automatically)

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install GDAL
sudo apt install -y gdal-bin    # Ubuntu/Debian
brew install gdal                # macOS
```

No need to manually install Python dependencies — `uv run` handles them via the project's `pyproject.toml`.

## Step 1 — Inspect your NetCDF file

Before converting, check what variables and dimensions your file contains:

```bash
cd processing/aldo_netcdf

# Quick overview with GDAL
gdalinfo NETCDF:"your_file.nc" 2>&1 | head -30

# Or with ncdump (if installed)
ncdump -h your_file.nc | head -60

# Or use the script's built-in info
uv run nc_to_cog.py -i your_file.nc -v T2 -o /dev/null 2>&1 | head -10
```

**What to look for:**

| Field              | WRF example                        | PALM example                                    |
| ------------------ | ---------------------------------- | ----------------------------------------------- |
| Variables          | T2, U10, V10, Q2, SWDOWN           | ta, wspeed, rh, theta                           |
| Coordinates        | XLONG, XLAT (2D arrays)            | x, y (1D arrays) + `origin_x`, `origin_y` attrs |
| Time dimension     | `Time` (often 1 per file)          | `time` (often many per file, e.g. 93)           |
| Spatial dimensions | south_north, west_east             | y, x                                            |
| 3D/4D              | 3D: (Time, south_north, west_east) | 4D: (time, z, y, x) — needs `--z-level`         |

## Step 2 — Convert a WRF file

WRF files typically have **one timestep per file** and variables on a 2D grid (time, y, x).

```bash
cd processing/aldo_netcdf

uv run nc_to_cog.py \
  -i wrfout_d03_2022-07-15_12_00_00 \
  -v T2 \
  -o ../../frontend/public/geodata/wrf_d03_t2_cog.tif
```

The script will:

1. Detect the WRF curvilinear grid (XLONG/XLAT)
2. Write each timestep as a GeoTIFF with Ground Control Points
3. Warp to EPSG:3857 (Web Mercator)
4. Stack all timesteps into a multi-band VRT
5. Create a COG with `GoogleMapsCompatible` tiling scheme

## Step 3 — Convert a PALM file

PALM files often have **many timesteps** in one file and 4D variables (time, z, y, x). Use `--z-level` to select the height level.

```bash
uv run nc_to_cog.py \
  -i TEST_4_3d.001-001.nc \
  -v ta \
  --z-level 3 \
  -o ../../frontend/public/geodata/palm_ta_cog.tif
```

**Choosing `--z-level`:** Level 3 corresponds to approximately 1.25 m height (pedestrian level) in typical PALM setups. Check the `z` coordinate values in your NetCDF to find the right level for your analysis. If omitted, defaults to level 3 for PALM files and level 0 for WRF files.

## Step 4 — Convert multiple variables at once

For a project with multiple domains and variables, use a shell loop:

```bash
# WRF: 3 domains × 4 variables
for var in T2 U10 Q2 SWDOWN; do
  var_lower=$(echo $var | tr '[:upper:]' '[:lower:]')
  for domain in d02 d03 d04; do
    echo "=== ${domain} ${var} ==="
    uv run nc_to_cog.py \
      -i wrfout_${domain}_2022-07-15_12_00_00 \
      -v $var \
      -o ../../frontend/public/geodata/wrf_${domain}_${var_lower}_cog.tif
  done
done

# PALM: 4 variables
for var in ta wspeed rh theta; do
  echo "=== PALM ${var} ==="
  uv run nc_to_cog.py \
    -i TEST_4_3d.001-001.nc \
    -v $var \
    --z-level 3 \
    -o ../../frontend/public/geodata/palm_${var}_cog.tif
done
```

## Flags reference

| Flag                 | Description                                          | Default               |
| -------------------- | ---------------------------------------------------- | --------------------- |
| `-i`, `--input`      | Input NetCDF file path                               | (required)            |
| `-v`, `--variable`   | Variable name to extract (case-insensitive)          | (required)            |
| `-o`, `--output`     | Output COG file path                                 | (required)            |
| `--z-level`          | Z-level index for 4D data (PALM: 3 ≈ 1.25 m)         | 3 for PALM, 0 for WRF |
| `-r`, `--resampling` | Resampling method: nearest, average, bilinear, cubic | bilinear              |
| `-c`, `--compress`   | Compression: DEFLATE, LZW, JPEG, WEBP                | DEFLATE               |

## How it works under the hood

The script handles the two grid types differently:

**WRF (curvilinear grid):**

1. Reads 2D `XLONG`/`XLAT` coordinate arrays
2. Writes raw data as a flat binary (BIL) file
3. Attaches Ground Control Points (GCPs) every 10 pixels mapping pixel → lon/lat
4. `gdalwarp` reprojects from GCPs (EPSG:4326) to EPSG:3857

**PALM (local meter grid):**

1. Reads `origin_x`/`origin_y` global attributes (Swiss LV95 easting/northing)
2. Computes GDAL geotransform from the x/y coordinate arrays + origin
3. Writes raw data as BIL with ULXMAP/ULYMAP/XDIM/YDIM header
4. `gdalwarp` reprojects from EPSG:2056 to EPSG:3857

**Both types then:** 5. `gdalbuildvrt -separate` stacks all warped timesteps into a multi-band VRT 6. `gdal_translate -of COG -co TILING_SCHEME=GoogleMapsCompatible` creates the final COG

The `GoogleMapsCompatible` tiling scheme is critical — it aligns the COG's pixel grid to the standard Web Mercator tile pyramid. Without it, the Deck.gl COG renderer will display the data at the wrong location.

## Verify your output

```bash
gdalinfo your_output_cog.tif | grep -E "Size|Pixel|Tiling|NAME|Band|NoData"
```

Check for:

- `NAME=GoogleMapsCompatible` in the Tiling Scheme section
- Correct number of bands (= number of timesteps)
- `NoData Value=nan`
- CRS is EPSG:3857

## Frontend configuration

COG raster projects use the `"deckgl-cog"` renderer instead of standard MapLibre sources/layers.

### Simple project (single variable, no time)

```typescript
import type { ProjectConfig } from "./types";

export const myClimateProject: ProjectConfig = {
  id: "my_climate",
  coordinates: [6.63, 46.52],
  title: "My Climate Data",
  description: "Description of the simulation.",
  category: "Climate",
  year: 2024,
  zoom: 10,
  pitch: 0,
  unit: "K",
  info: "Source: My Lab",

  renderer: "deckgl-cog",

  cogRaster: {
    url: "my_climate_t2_cog.tif", // filename in geodata/
    colorScale: ["#000004", "#932667", "#fcffa4"], // low → high
    colorScaleValueRange: [280, 310], // data value range
  },

  legend: {
    title: "Temperature",
    gradient: {
      stops: [
        { value: "280 K", color: "#000004" },
        { value: "295 K", color: "#932667" },
        { value: "310 K", color: "#fcffa4" },
      ],
      unit: "K",
    },
  },
};
```

### Multiple variables with selector

Use `cogVariables` to let users switch between variables (e.g. temperature, wind, humidity). Each variable has its own COG file, color scale, and legend:

```typescript
cogVariables: [
  {
    id: "t2",
    label: "Temperature",
    cogRaster: {
      url: "wrf_d03_t2_cog.tif",
      colorScale: ["#000004", "#932667", "#fcffa4"],
      colorScaleValueRange: [278, 310],
    },
    legend: {
      title: "2m Temperature",
      gradient: {
        stops: [
          { value: "278 K", color: "#000004" },
          { value: "310 K", color: "#fcffa4" },
        ],
        unit: "K",
      },
    },
  },
  {
    id: "u10",
    label: "Wind (U)",
    cogRaster: { url: "wrf_d03_u10_cog.tif", ... },
    legend: { ... },
  },
],
```

### Sub-visualizations (multiple domains or scales)

Use `subViz` to let users scroll between different data sources (e.g. WRF regional → WRF city → PALM street). Each section has its own center/zoom so the map flies to the correct extent:

```typescript
subViz: [
  {
    id: "wrf-d02",
    title: "WRF d02 — Regional",
    description: "1 km resolution over the full region.",
    coordinates: [6.555, 46.46],
    zoom: 9,
    renderer: "deckgl-cog",
    cogVariables: wrfVariables("d02"),  // helper returning CogVariableConfig[]
  },
  {
    id: "palm",
    title: "PALM — Microscale",
    description: "0.5 m resolution over a street block.",
    coordinates: [6.63005, 46.51605],
    zoom: 20,
    renderer: "deckgl-cog",
    cogVariables: palmVariables,
    timeControl: {              // enables the time slider
      min: 0,
      max: 92,                  // 93 timesteps (bands)
      step: 1,
      initial: 0,
      label: "Step",
      displayFormat: "number",
      autoplayIntervalMs: 200,  // autoplay speed in ms
    },
  },
],
```

### Time slider for animated data

If your COG has multiple bands (timesteps), add a `timeControl` field (on the project or on a subViz entry). The time slider controls which band is displayed. `min` and `max` are 0-based band indices.

### Real-world example

See [`frontend/src/config/projects/wrf.ts`](../../frontend/src/config/projects/wrf.ts) — a complete project combining 3 WRF domains and PALM into 4 scrollable sections, each with 4 selectable climate variables and a time slider on the PALM section.

## Place output and upload

1. **Local testing:** Files should already be in `frontend/public/geodata/` (the `-o` path in the commands above)
2. **Production:** Copy the `.tif` files to the shared EPFL NAS `geodata/` folder — see [Step 4.6 of the guide](../../docs/guide.md#46-upload-your-data-file-for-production)

> **Note:** COG files can be large (especially PALM with 93 bands). Make sure to add `*.tif` to `.gitignore` in the geodata folder — these files should NOT be committed to Git.
