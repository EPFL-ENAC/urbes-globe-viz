# Data Processing

Scripts and recipes for converting geospatial datasets into web-optimized formats for the Urbes Globe Viz platform.

---

## Adding new data — start here

**[`cookbook/README.md`](cookbook/README.md)** — ready-to-use recipes for every common format:

| I have…                      | Recipe                                                     |
| ---------------------------- | ---------------------------------------------------------- |
| CSV with lat/lon             | [CSV → PMTiles](cookbook/csv_to_pmtiles.md)                |
| CSV with zone IDs + geometry | [CSV Spatial Join → PMTiles](cookbook/csv_spatial_join.md) |
| Shapefile (.shp)             | [Shapefile → PMTiles](cookbook/shp_to_pmtiles.md)          |
| GeoPackage (.gpkg)           | [GeoPackage → PMTiles](cookbook/gpkg_to_pmtiles.md)        |
| GeoJSON                      | [GeoJSON → PMTiles](cookbook/geojson_to_pmtiles.md)        |
| Raster GeoTIFF               | [Raster → COG](cookbook/raster_to_cog.md)                  |

After processing, see the cookbook's [After processing](cookbook/README.md#after-processing) section for registering your data in the app and uploading to production.

---

## Prerequisites

```bash
# uv — Python package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python dependencies
make install

# tippecanoe — vector tile generation
brew install tippecanoe        # macOS
sudo apt install tippecanoe    # Ubuntu 23.04+

# GDAL — geospatial conversions
brew install gdal              # macOS
sudo apt install gdal-bin      # Ubuntu/Debian
```

---

## Pipeline scripts

### GHSL Built Surface (global raster basemap)

Converts the GHSL 2018 built-surface dataset (61 GB, 10 m resolution) into a PMTiles raster archive for the globe basemap. Runs on EPFL's SCITAS HPC cluster.

→ [`ghsl_to_pmtiles/README.md`](ghsl_to_pmtiles/README.md)
→ SCITAS guide: [`ghsl_to_pmtiles/scitas/README.md`](ghsl_to_pmtiles/scitas/README.md)

### DAVE Mobility Flows

Processes origin-destination mobility data into GeoJSON arc layers for the Deck.gl renderer.

→ [`dave_flows/`](dave_flows/)

### Martin Building Heights

Converts building height CSV data to PMTiles format.

→ [`martin_building_heights/`](martin_building_heights/)

---

## Python environment

All scripts use [uv](https://github.com/astral-sh/uv). Dependencies are in `pyproject.toml`.

```bash
# Run any script directly
uv run cookbook/some_script.py --help

# Or activate the venv manually
uv sync && source .venv/bin/activate
```
