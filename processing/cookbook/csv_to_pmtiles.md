# CSV with Coordinates → PMTiles

Convert a CSV file that already has **latitude/longitude columns** into vector point tiles.

## Pipeline

```
sensors.csv  →  (Python)  →  sensors.geojson  →  (tippecanoe)  →  sensors.pmtiles
```

## Requirements

- Python + uv (run `cd processing && make install` once)
- tippecanoe

## Step 1 — CSV to GeoJSON

Use the helper script [`csv_to_pmtiles.py`](csv_to_pmtiles.py) included in this folder. It reads any CSV with coordinate columns and writes a GeoJSON FeatureCollection where every row becomes a Point feature. All other columns are kept as properties.

```bash
# From the cookbook/ directory
uv run --project .. python csv_to_pmtiles.py \
  path/to/sensors.csv \
  -o ../../frontend/public/geodata/sensors.geojson \
  --lat-col lat \
  --lon-col lon
```

### Options

| Flag        | Default | Description                    |
| ----------- | ------- | ------------------------------ |
| `--lat-col` | `lat`   | Name of the latitude column    |
| `--lon-col` | `lon`   | Name of the longitude column   |
| `-o`        | —       | Output GeoJSON path (required) |

Rows with missing coordinates are automatically dropped. The script prints a summary of feature count and value ranges for numeric columns.

### Example input

```csv
name,lat,lon,temperature,year
Station A,46.52,6.63,12.5,2023
Station B,46.55,6.58,13.1,2023
```

### Example output

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [6.63, 46.52] },
      "properties": { "name": "Station A", "temperature": 12.5, "year": 2023 }
    }
  ]
}
```

## Step 2 — GeoJSON to PMTiles

```bash
tippecanoe \
  --output=../../frontend/public/geodata/sensors.pmtiles \
  --layer=sensors \
  --minimum-zoom=4 \
  --maximum-zoom=12 \
  --drop-densest-as-needed \
  --force \
  ../../frontend/public/geodata/sensors.geojson
```

### Key flags

| Flag                       | Why                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `--layer=sensors`          | Name of the layer inside the tile. Use this in `source-layer` in the frontend config. |
| `--minimum-zoom=4`         | No tiles below zoom 4 (adjust to your data's scale)                                   |
| `--maximum-zoom=12`        | No tiles above zoom 12                                                                |
| `--drop-densest-as-needed` | Automatically thins dense point clusters at low zoom to keep tiles small              |
| `--force`                  | Overwrite if the output file exists                                                   |

See [zoom level guidance](README.md#choosing-zoom-levels) in the main README.

## Step 3 (optional) — Upload to CDN

```bash
s3cmd put ../../frontend/public/geodata/sensors.pmtiles s3://urbes-viz/
```

## Real-world example from this project

The [Martin Building Heights](../martin_building_heights/) pipeline uses this exact pattern:

```bash
# 1. CSV → GeoJSON (their script: csv_to_geojson.py)
python3 csv_to_geojson.py

# 2. GeoJSON → GeoJSONSeq (optional, for very large files)
ogr2ogr -f GeoJSONSeq buildings.geojsonseq buildings.geojson

# 3. tippecanoe
tippecanoe \
  --output=../../frontend/public/geodata/building_heights_china.pmtiles \
  --layer=building_heights_china \
  --minimum-zoom=4 --maximum-zoom=12 \
  --base-zoom=8 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --force \
  buildings.geojsonseq
```

> **Tip for large CSVs (>100k rows):** convert to GeoJSONSeq (newline-delimited) with `ogr2ogr -f GeoJSONSeq` before passing to tippecanoe. GeoJSONSeq streams features without loading the entire file into memory.
