# CSV with Spatial Join → PMTiles

Convert a CSV that references **spatial IDs** (grid cell, zone, district) into vector tiles by joining it to a geometry file (Shapefile or GeoPackage).

Use this when your CSV has no coordinates — only IDs that match polygons in another file.

## Pipeline

```
data.csv  +  zones.shp (or .gpkg)
    │              │
    └────┐  ┌──────┘
         ▼  ▼
  csv_spatial_join.py   →   data.geojson   →   tippecanoe   →   data.pmtiles
  (join, reproject,
   build geometry)
```

## Requirements

- Python + uv (run `cd processing && make install` once)
- tippecanoe

## Two modes

| Mode      | Use case                                                                  | Output geometry |
| --------- | ------------------------------------------------------------------------- | --------------- |
| **point** | Each CSV row maps to one zone → place a point at the zone's centroid      | Point           |
| **line**  | Each CSV row has origin + destination IDs → draw an arc between centroids | LineString      |

## Step 1 — Spatial join to GeoJSON

Use the helper script [`csv_spatial_join.py`](csv_spatial_join.py) included in this folder.

### Point mode

Each CSV row becomes a Point at the centroid of its matched polygon:

```bash
uv run --project .. python csv_spatial_join.py \
  path/to/zones.shp \
  path/to/population.csv \
  -o ../../frontend/public/geodata/population.geojson \
  --join-col zone_id \
  --geom-id-col id \
  --mode point
```

Example input:

```csv
zone_id,population,year
101,5200,2023
102,3800,2023
```

### Line mode (origin–destination flows)

Each CSV row becomes a LineString from origin centroid to destination centroid:

```bash
uv run --project .. python csv_spatial_join.py \
  path/to/grid.shp \
  path/to/flows.csv \
  -o ../../frontend/public/geodata/flows.geojson \
  --join-col origin \
  --geom-id-col id \
  --mode line \
  --origin-col origin \
  --dest-col dest \
  --value-col flow
```

Example input:

```csv
origin,dest,flow
565,566,5.0
755,753,20.0
565,565,19.0    ← self-flow, automatically dropped
```

Self-flows (origin == dest) produce zero-length lines and are excluded automatically.

### All options

| Flag            | Required  | Default | Description                             |
| --------------- | --------- | ------- | --------------------------------------- |
| positional 1    | yes       | —       | Geometry file (.shp or .gpkg)           |
| positional 2    | yes       | —       | Input CSV file                          |
| `-o`            | yes       | —       | Output GeoJSON path                     |
| `--join-col`    | yes       | —       | CSV column to join on                   |
| `--geom-id-col` | yes       | —       | Matching ID column in the geometry file |
| `--mode`        | no        | `point` | `point` or `line`                       |
| `--origin-col`  | line mode | —       | Origin ID column in CSV                 |
| `--dest-col`    | line mode | —       | Destination ID column in CSV            |
| `--value-col`   | no        | `value` | Numeric attribute column (line mode)    |

The script automatically reprojects any CRS to WGS84 (EPSG:4326).

## Step 2 — GeoJSON to PMTiles

```bash
tippecanoe \
  --output=../../frontend/public/geodata/flows.pmtiles \
  --layer=flows \
  --minimum-zoom=5 \
  --maximum-zoom=12 \
  --drop-densest-as-needed \
  --force \
  ../../frontend/public/geodata/flows.geojson
```

## Step 3 (optional) — Upload to CDN

```bash
s3cmd put ../../frontend/public/geodata/flows.pmtiles s3://urbes-viz/
```

## Real-world example from this project

The [DAVE Flows](../dave_flows/) pipeline uses exactly this pattern:

```bash
# Spatial join: match flow CSV rows to 500m grid cells, build LineString arcs
uv run --project .. python flows_to_geojson.py \
  "../../frontend/public/DAVE simulations/500_grid_Vaud_Geneva_within.shp" \
  "../../frontend/public/DAVE simulations/flows_1_199_10_min1persons.csv" \
  -o ../../frontend/public/geodata/dave_flows_work.geojson

# Build vector tiles
tippecanoe \
  --output=../../frontend/public/geodata/dave_flows_work.pmtiles \
  --layer=dave_flows \
  --minimum-zoom=5 --maximum-zoom=12 \
  --drop-densest-as-needed --force \
  ../../frontend/public/geodata/dave_flows_work.geojson
```

The grid shapefile is in EPSG:2056 (Swiss coordinates); geopandas reprojects to WGS84 automatically.
