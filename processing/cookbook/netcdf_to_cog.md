# NetCDF (WRF) → Cloud Optimized GeoTIFF

Convert WRF output files (NetCDF) into multi-band Cloud Optimized GeoTIFFs (COGs) for the Deck.gl COG renderer. Each timestep becomes one band, so a time slider can animate it in the browser. The script also computes derived variables (°C, wind speed) and writes wind arrows.

WRF uses a curvilinear grid: the 2D arrays `XLONG`/`XLAT` give the position of each cell. The script places the grid with ground control points (GCPs) from these arrays, then warps it to Web Mercator.

## Pipeline

```
wrfout_d02_2022-07-15_12_00_00   ─┐   nc_to_cog.py          out/
wrfout_d03_2022-07-15_12_00_00   ─┤   ───────────────►      wrf_d03_t2c_cog.tif
wrfout_d04_2022-07-15_12_00_00   ─┘   (per variable)        wrf_d03_ws10_cog.tif
                                                            wrf_d03_wind10.json
                                                            …
```

## Requirements

- **uv**, the Python package manager. It installs `rasterio` (with GDAL inside), `netcdf4` and `numpy` from `processing/pyproject.toml`. No system GDAL is needed.

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh   # if uv is not installed
cd processing && uv sync
```

## Step 1: Inspect your NetCDF file

```bash
cd processing/aldo_netcdf
uv run python -c "import netCDF4; ds = netCDF4.Dataset('wrfout_d03_2022-07-15_12_00_00'); print({k: v.dimensions for k, v in ds.variables.items()})"
```

What to look for:

| Field              | WRF example                    |
| ------------------ | ------------------------------ |
| Variables          | T2, TSK, U10, V10, Q2, SWDOWN  |
| Coordinates        | XLONG, XLAT (2D arrays)        |
| Wind rotation      | SINALPHA, COSALPHA             |
| Time dimension     | `Time` (often 1 per file)      |
| Spatial dimensions | south_north, west_east         |
| Shape              | (Time, south_north, west_east) |

## Step 2: Convert a variable

```bash
uv run nc_to_cog.py \
  -i wrfout_d03_2022-07-15_12_00_00 \
  -v T2C \
  -o out/wrf_d03_t2c_cog.tif
```

`-v` takes a raw WRF name (`T2`, `Q2`, `SWDOWN`, ...) or a derived one:

| Name   | Content                 | Formula           |
| ------ | ----------------------- | ----------------- |
| `T2C`  | 2 m air temperature, °C | T2 - 273.15       |
| `TSKC` | Surface temperature, °C | TSK - 273.15      |
| `WS10` | 10 m wind speed, m/s    | sqrt(U10² + V10²) |

The script prints min, p1, mean, p99 and max. Use them to pick `colorScaleValueRange`.

## Step 3: Wind arrows

```bash
uv run nc_to_cog.py -i wrfout_d03_2022-07-15_12_00_00 --arrows out/wrf_d03_wind10.json --stride 4
```

One arrow every `--stride` cells, on the native grid. Each point is `[lon, lat, direction, speed]`. The direction is where the wind comes from, in degrees from north: `atan2(-U, -V) * 57.29578`. U10/V10 are first turned from the model grid to east/north with SINALPHA/COSALPHA.

## Step 4: All domains at once

`processing/aldo_netcdf/Makefile` bakes every file of the WRF project:

```bash
cd processing/aldo_netcdf
make bake INPUT_DIR=/path/to/folder/with/wrfout/files
```

## Flags reference

| Flag                 | Description                                        | Default    |
| -------------------- | -------------------------------------------------- | ---------- |
| `-i`, `--input`      | Input WRF NetCDF file                              | (required) |
| `-v`, `--variable`   | WRF or derived variable (case-insensitive)         |            |
| `-o`, `--output`     | Output COG file                                    |            |
| `--arrows`           | Output JSON of wind arrows                         |            |
| `--stride`           | One arrow every N cells                            | 4          |
| `-r`, `--resampling` | Warp resampling: nearest, average, bilinear, cubic | bilinear   |
| `-c`, `--compress`   | Compression: DEFLATE, LZW, ZSTD                    | DEFLATE    |

Give `-v` and `-o`, or `--arrows`, or both.

## How it works

1. Read the variable for every timestep, or compute the derived one.
2. Write it as a GeoTIFF placed with GCPs (from XLONG/XLAT, every 10 cells plus the corners).
3. Warp to EPSG:3857 with a `WarpedVRT` (the same as `gdalwarp`).
4. Write the COG: DEFLATE, 256 px tiles, `TILING_SCHEME=GoogleMapsCompatible`, one band per timestep.

The `GoogleMapsCompatible` tiling scheme is critical. It aligns the pixels of the COG on the web map tile grid. Without it, the Deck.gl COG renderer draws the data at the wrong place.

## Verify your output

```bash
uv run python -c "import rasterio; s = rasterio.open('out/wrf_d03_t2c_cog.tif'); print(s.crs, s.count, s.shape, s.bounds, s.nodata)"
```

Check: CRS is EPSG:3857, the band count is the number of timesteps, nodata is `nan`.

## Frontend configuration

COG raster projects use the `"deckgl-cog"` renderer instead of MapLibre sources and layers.

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
  unit: "°C",
  info: "Source: My Lab",

  renderer: "deckgl-cog",

  cogRaster: {
    url: "my_climate_t2c_cog.tif", // filename in geodata/
    colorScale: ["#30123b", "#1ae4b6", "#fabc29", "#7a0403"], // low → high
    colorScaleValueRange: [5, 35], // data value range
  },

  legend: {
    title: "Temperature",
    gradient: {
      // MapLegend draws the first stop at the top: list them high to low.
      stops: [
        { value: "35 °C", color: "#7a0403" },
        { value: "25 °C", color: "#fabc29" },
        { value: "15 °C", color: "#1ae4b6" },
        { value: "5 °C", color: "#30123b" },
      ],
      unit: "°C",
    },
  },
};
```

### Multiple variables with selector, and arrows

Use `cogVariables` to let users switch between variables. Each variable has its own COG file, color scale and legend. Add `arrows` to draw the wind arrows on top of the raster:

```typescript
cogVariables: [
  {
    id: "t2",
    label: "Air temp.",
    cogRaster: {
      url: "wrf_d03_t2c_cog.tif",
      colorScale: TURBO,
      colorScaleValueRange: [5, 35],
    },
    legend: { title: "2m Air temperature", gradient: { ... } },
  },
  {
    id: "wind",
    label: "Wind",
    cogRaster: { url: "wrf_d03_ws10_cog.tif", ... },
    arrows: { url: "wrf_d03_wind10.json" },
    legend: { title: "10m Wind (arrows: direction)", gradient: { ... } },
  },
],
```

### Sub-visualizations (multiple domains)

Use `subViz` to let users scroll between domains. Each section has its own center and zoom, so the map flies to the right extent:

```typescript
subViz: [
  {
    id: "wrf-d02",
    title: "WRF d02 - Lake Geneva Region",
    description: "1 km resolution over the full region.",
    coordinates: [6.555, 46.46],
    zoom: 9,
    renderer: "deckgl-cog",
    cogVariables: wrfVariables("d02"), // helper returning CogVariableConfig[]
  },
  // d03, d04 ...
],
```

### Time slider for animated data

If your COG has several bands (timesteps), add a `timeControl` field (on the project or on a subViz entry). The time slider picks the band to show. `min` and `max` are 0-based band indices.

```typescript
timeControl: { min: 0, max: 23, step: 1, initial: 0, label: "Hour", displayFormat: "hour" },
```

### Real-world example

See [`frontend/src/config/projects/wrf.ts`](../../frontend/src/config/projects/wrf.ts): 3 WRF domains as scrollable sections, 5 variables each, wind arrows, and a domains map that works as a menu.

## Test locally and upload

1. **Local testing:** the dev server serves `processing/aldo_netcdf/out/<name>` for `/geodata/<name>` (see `bakedGeodata` in `frontend/vite.config.ts`). For files baked somewhere else, put them in `frontend/public/geodata/` of the main checkout.
2. **Production:** copy the files to the shared EPFL NAS `geodata/` folder, see [Step 4.6 of the guide](../../docs/guide.md#46-upload-your-data-file-for-production).

> **Note:** COG files must not go in Git. `*.tif` is in `.gitignore`.
