# Processing Cookbook

Guides for converting common geospatial data formats into web-optimized tiles for the globe visualization app.

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

Install these tools once:

```bash
# uv — Python package manager (needed for CSV recipes)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Python dependencies (from the processing/ directory)
cd .. && make install

# tippecanoe — vector tile generation (needed for all vector recipes)
brew install tippecanoe        # macOS
sudo apt install tippecanoe    # Ubuntu 23.04+

# GDAL/OGR — geospatial Swiss army knife (needed for SHP, GPKG, and raster recipes)
brew install gdal              # macOS
sudo apt install gdal-bin      # Ubuntu/Debian
```

## After processing

Once your output file is in `frontend/public/geodata/`, register it in the app:

1. Copy `frontend/src/config/projects/_example.ts.example` → `frontend/src/config/projects/my_project.ts`
2. Fill in the project metadata (id, title, coordinates, source, layer)
3. Add the import to `frontend/src/config/projects/index.ts`
4. `npm run dev` — your project appears automatically

See the [example template](../../frontend/src/config/projects/_example.ts.example) for all fields.

### CDN upload (production)

```bash
s3cmd put ../../frontend/public/geodata/my_data.pmtiles s3://urbes-viz/
```

The frontend switches between local `/geodata/` (dev) and the CDN (prod) automatically.
