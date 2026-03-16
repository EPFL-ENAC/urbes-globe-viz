# Processing Cookbook

Ready-to-use recipes for converting common geospatial data formats into web-optimized tiles for the Urbes Globe Viz app. Copy a recipe, edit the variables at the top, run it.

## Which recipe do I need?

| I have…                                  | I want…                                 | Recipe                                            |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| CSV with lat/lon columns                 | Points on the map                       | [CSV → PMTiles](csv_to_pmtiles.md)                |
| CSV with zone/grid IDs + a geometry file | Points or flow arcs on the map          | [CSV Spatial Join → PMTiles](csv_spatial_join.md) |
| Shapefile (.shp)                         | Vector tiles                            | [Shapefile → PMTiles](shp_to_pmtiles.md)          |
| GeoPackage (.gpkg)                       | Vector tiles                            | [GeoPackage → PMTiles](gpkg_to_pmtiles.md)        |
| GeoJSON                                  | Vector tiles                            | [GeoJSON → PMTiles](geojson_to_pmtiles.md)        |
| Raster GeoTIFF                           | Cloud Optimized GeoTIFF for web display | [Raster → COG](raster_to_cog.md)                  |

## Prerequisites

> ### Windows users — read this first
>
> The tools in this cookbook do not run natively on Windows. You **must** use
> **WSL2** (Windows Subsystem for Linux). Open PowerShell as Administrator and run:
>
> ```powershell
> wsl --install
> ```
>
> Restart your computer, then open the **Ubuntu** app from the Start menu.
> You now have a Linux terminal — follow all instructions below from there.

Install these tools once from a Linux / WSL2 terminal:

### GDAL

```bash
sudo apt update
sudo apt install -y gdal-bin
ogr2ogr --version  # verify
```

### tippecanoe

The apt package only exists on Ubuntu 23.04+. Check your version first:

```bash
lsb_release -a
```

**Ubuntu 23.04 or newer:**

```bash
sudo apt install -y tippecanoe
```

**Ubuntu 22.04 (the WSL default) — build from source:**

```bash
sudo apt install -y build-essential libsqlite3-dev zlib1g-dev
git clone https://github.com/felt/tippecanoe.git
cd tippecanoe && make -j && sudo make install
cd .. && rm -rf tippecanoe
tippecanoe --version  # verify
```

### uv and Python dependencies

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc  # or open a new terminal

# From the processing/ directory:
cd .. && uv sync
```

## After processing

### 1. Test locally

Place your output file in `frontend/public/geodata/` and register it in the app:

1. Copy `frontend/src/config/projects/_example.ts.example` → `frontend/src/config/projects/my_project.ts`
2. Fill in the project metadata (id, title, coordinates, source, layer)
3. Add the import to `frontend/src/config/projects/index.ts`
4. `cd frontend && npm run dev` — your project appears at http://localhost:9000

See the [example template](../../frontend/src/config/projects/_example.ts.example) for all available fields.

### 2. Upload to production

Files for production are served from the EPFL CDN (`enacit4r-cdn-s3.epfl.ch`). Upload with `s3cmd` (requires ENAC-IT4R credentials):

```bash
# Upload a single file
s3cmd put --acl-public --guess-mime-type my_data.pmtiles s3://urbes-viz/

# Verify it's accessible
curl -I https://enacit4r-cdn-s3.epfl.ch/urbes-viz/my_data.pmtiles
```

> **`--acl-public` is required** — without it the file is private and returns 403 to browsers.
> **`--guess-mime-type`** sets the correct `Content-Type` for PMTiles, GeoTIFF, GeoJSON, etc.

The frontend uses `/geodata/` on dev and the CDN URL on prod — both are configured automatically.
