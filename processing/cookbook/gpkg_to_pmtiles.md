# GeoPackage → PMTiles

Convert a GeoPackage (`.gpkg`) file into vector tiles. Same approach as [Shapefile → PMTiles](shp_to_pmtiles.md) but with GeoPackage-specific notes.

## Pipeline

```
my_data.gpkg  →  ogr2ogr (reproject to WGS84)  →  my_data.geojson  →  tippecanoe  →  my_data.pmtiles
```

## Requirements

- GDAL/OGR (`ogr2ogr`)
- tippecanoe

## Step 0 — Inspect the GeoPackage

Unlike shapefiles, a GeoPackage can contain **multiple layers**. List them first:

```bash
ogrinfo my_data.gpkg
```

Output:

```
1: population (Multi Polygon)
2: roads (Line String)
3: buildings (Multi Polygon)
```

Get details on a specific layer:

```bash
ogrinfo -so my_data.gpkg population
```

## Step 1 — GeoPackage to GeoJSON

### Export a specific layer

```bash
ogr2ogr \
  -f GeoJSON \
  -t_srs EPSG:4326 \
  population.geojson \
  my_data.gpkg \
  population          # ← layer name (last argument)
```

### Export the first/only layer

```bash
ogr2ogr \
  -f GeoJSON \
  -t_srs EPSG:4326 \
  my_data.geojson \
  my_data.gpkg
```

### Filtering & transforming

All the `ogr2ogr` flags from the [Shapefile recipe](shp_to_pmtiles.md) work here too:

```bash
# Filter + select columns using SQL
ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
  -sql "SELECT name, pop FROM population WHERE pop > 1000" \
  filtered.geojson my_data.gpkg

# Clip to Switzerland
ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
  -clipdst 5.9 45.8 10.5 47.8 \
  switzerland.geojson my_data.gpkg population

# Simplify geometry
ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
  -simplify 0.001 \
  simplified.geojson my_data.gpkg
```

## Step 2 — GeoJSON to PMTiles

Same as the [Shapefile recipe](shp_to_pmtiles.md#step-2--geojson-to-pmtiles). Pick the strategy matching your geometry:

```bash
# Points or lines
tippecanoe \
  --output=../../frontend/public/geodata/my_data.pmtiles \
  --layer=my_data \
  --minimum-zoom=4 \
  --maximum-zoom=12 \
  --drop-densest-as-needed \
  --force \
  my_data.geojson

# Polygons
tippecanoe \
  --output=../../frontend/public/geodata/my_data.pmtiles \
  --layer=my_data \
  --minimum-zoom=4 \
  --maximum-zoom=12 \
  --coalesce-densest-as-needed \
  --force \
  my_data.geojson
```

## Step 3 (optional) — Upload to CDN

```bash
s3cmd put ../../frontend/public/geodata/my_data.pmtiles s3://urbes-viz/
```

## Real-world example from this project

The DAVE population data comes as GeoPackage files (`population_*.gpkg` in `frontend/public/DAVE simulations/`). To process one:

```bash
# List layers
ogrinfo "../../frontend/public/DAVE simulations/population_1_199.gpkg"

# Export to GeoJSON
ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
  population_work.geojson \
  "../../frontend/public/DAVE simulations/population_1_199.gpkg"

# Build tiles
tippecanoe \
  --output=../../frontend/public/geodata/population_work.pmtiles \
  --layer=population \
  --minimum-zoom=5 --maximum-zoom=12 \
  --coalesce-densest-as-needed --force \
  population_work.geojson
```
