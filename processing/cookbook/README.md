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

> **Windows users**: All tools below are Linux/macOS-native. The easiest path is to use
> **WSL2** (Windows Subsystem for Linux) — open a WSL terminal and all commands in this
> cookbook will work as written. See the [Windows section](#windows) below for details.

Install these tools once:

```bash
# uv — Python package manager (needed for CSV recipes)
curl -LsSf https://astral.sh/uv/install.sh | sh   # macOS / Linux
# Windows (PowerShell): irm https://astral.sh/uv/install.ps1 | iex

# Python dependencies (from the processing/ directory)
cd .. && uv sync

# tippecanoe — vector tile generation (needed for all vector recipes)
brew install tippecanoe        # macOS
sudo apt install tippecanoe    # Ubuntu 23.04+
# Windows: no native binary — use WSL2 or Docker (see below)

# GDAL/OGR — geospatial Swiss army knife (needed for SHP, GPKG, and raster recipes)
brew install gdal              # macOS
sudo apt install gdal-bin      # Ubuntu/Debian
# Windows: install via OSGeo4W (https://trac.osgeo.org/osgeo4w/) or conda-forge
```

## Windows

**Recommended: WSL2** — install the Windows Subsystem for Linux, open a WSL terminal, and
follow all cookbook instructions exactly as written. All tools (uv, tippecanoe, GDAL) install
normally inside WSL.

```powershell
# One-time WSL setup (run in PowerShell as Administrator)
wsl --install
```

**Alternative: Docker** — if you'd rather avoid WSL, run tippecanoe in Docker. Replace any
`tippecanoe ...` command with:

```powershell
# In PowerShell (from the directory containing your data)
docker run --rm -v "${PWD}:/data" -w /data ghcr.io/felt/tippecanoe tippecanoe `
  --output=my_data.pmtiles `
  --layer=my_data `
  --minimum-zoom=4 --maximum-zoom=12 `
  --drop-densest-as-needed --force `
  my_data.geojson
```

For GDAL natively on Windows, install [OSGeo4W](https://trac.osgeo.org/osgeo4w/) and use the
**OSGeo4W Shell** to run `ogr2ogr`, `gdalwarp`, etc. Alternatively, `conda install -c conda-forge gdal`.

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
