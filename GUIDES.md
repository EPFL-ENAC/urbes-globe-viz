# How to Add a Dataset to the Globe

This guide walks you through the full process of adding a new dataset to the visualization — from raw data to a visible map layer with a legend.

---

## Step 1 — Convert your data to a web-ready format

Start by converting your raw geospatial file into a format the globe can display. Pick the recipe that matches what you have:

| I have…                                  | Recipe                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| GeoJSON                                  | [GeoJSON → PMTiles](processing/cookbook/geojson_to_pmtiles.md)                   |
| Shapefile (.shp)                         | [Shapefile → PMTiles](processing/cookbook/shp_to_pmtiles.md)                     |
| GeoPackage (.gpkg)                       | [GeoPackage → PMTiles](processing/cookbook/gpkg_to_pmtiles.md)                   |
| CSV with lat/lon columns                 | [CSV with Coordinates → PMTiles](processing/cookbook/csv_to_pmtiles.md)          |
| CSV with zone/grid IDs + a geometry file | [CSV with Spatial Join → PMTiles](processing/cookbook/csv_spatial_join.md)       |
| Raster GeoTIFF                           | [Raster GeoTIFF → Cloud Optimized GeoTIFF](processing/cookbook/raster_to_cog.md) |

Each recipe includes the exact commands to run and how to upload the result to the CDN.

---

## Step 2 — Register the dataset in the app

Once your file is on the CDN, add a project configuration entry so the app knows about it. Open or create a file under `frontend/src/config/projects/` and fill in the dataset details (CDN URL, map style, camera position, title, description).

See `frontend/src/config/projects/_example.ts.example` for a starting template.

---

## Step 3 — Add a legend

With the dataset visible on the map, add a legend so users can interpret the colors and symbols.

→ [Map Legend System – A Tutorial](frontend/legend-tutorial.md)

---

## Reference

- [Processing Cookbook README](processing/cookbook/README.md) — prerequisites and tool installation
- [GHSL Basemap Pipeline](SUMMARY_GHSL_PROCESS.md) — full pipeline used for the globe's built-surface basemap
