# Shapefile → PMTiles

Convert a Shapefile (`.shp` + sidecar files) into vector tiles. No Python needed — `ogr2ogr` handles reprojection and `tippecanoe` builds the tiles.

## Pipeline

```
my_data.shp  →  ogr2ogr (reproject to WGS84)  →  my_data.geojson  →  tippecanoe  →  my_data.pmtiles
```

## Requirements

- GDAL/OGR (`ogr2ogr`)
- tippecanoe

## Step 1 — Shapefile to GeoJSON

```bash
ogr2ogr \
  -f GeoJSON \
  -t_srs EPSG:4326 \
  my_data.geojson \
  path/to/my_data.shp
```

`-t_srs EPSG:4326` reprojects to WGS84 (longitude/latitude), which is what web maps expect. This works regardless of the source CRS — ogr2ogr reads it from the `.prj` file.

### Filtering & transforming data

Add any of these flags to the `ogr2ogr` command:

```bash
# Keep only features matching a condition
ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
  -where "population > 1000" \
  output.geojson input.shp

# Select specific columns (reduces file size)
ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
  -sql "SELECT name, population FROM my_layer" \
  output.geojson input.shp

# Clip to a bounding box (West South East North, in degrees)
ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
  -clipdst 5.9 45.8 10.5 47.8 \
  switzerland.geojson global.shp

# Simplify geometry (tolerance in target CRS units — degrees for WGS84)
ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
  -simplify 0.001 \
  simplified.geojson detailed.shp
```

These flags can be combined:

```bash
ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
  -sql "SELECT name, pop FROM regions WHERE pop > 5000" \
  -clipdst 5.9 45.8 10.5 47.8 \
  -simplify 0.0005 \
  regions_ch.geojson regions_europe.shp
```

## Step 2 — GeoJSON to PMTiles

Choose the tippecanoe strategy based on your geometry type:

### Points or lines

```bash
tippecanoe \
  --output=../../frontend/public/geodata/my_data.pmtiles \
  --layer=my_data \
  --minimum-zoom=4 \
  --maximum-zoom=12 \
  --drop-densest-as-needed \
  --force \
  my_data.geojson
```

### Polygons

```bash
tippecanoe \
  --output=../../frontend/public/geodata/my_data.pmtiles \
  --layer=my_data \
  --minimum-zoom=4 \
  --maximum-zoom=12 \
  --coalesce-densest-as-needed \
  --force \
  my_data.geojson
```

`--coalesce-densest-as-needed` merges small polygons at low zoom instead of dropping them, which preserves coverage.

### Small datasets (< 10k features)

If you want to keep every feature at every zoom:

```bash
tippecanoe \
  --output=../../frontend/public/geodata/my_data.pmtiles \
  --layer=my_data \
  --minimum-zoom=4 \
  --maximum-zoom=12 \
  --no-feature-limit \
  --no-tile-size-limit \
  --force \
  my_data.geojson
```

> **Warning:** this can produce very large tiles if your data is dense. Only use for small datasets.

## Step 3 (optional) — Upload to CDN

```bash
s3cmd put ../../frontend/public/geodata/my_data.pmtiles s3://urbes-viz/
```

## Useful ogr2ogr commands

```bash
# Inspect a shapefile: list layers, CRS, feature count, attribute fields
ogrinfo -so my_data.shp

# Check the CRS
ogrinfo -so my_data.shp my_layer_name | grep "Layer SRS"
```
