# GeoJSON → PMTiles

Convert an existing GeoJSON file into vector tiles. This is the simplest recipe — a single tippecanoe command, no Python, no ogr2ogr.

## Pipeline

```
my_data.geojson  →  tippecanoe  →  my_data.pmtiles
```

## Requirements

- tippecanoe

## The command

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

### Small datasets (< 10k features)

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

## Flags explained

| Flag                           | What it does                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `--output=...`                 | Output PMTiles path                                                                                         |
| `--layer=my_data`              | Name of the vector layer inside the tile. Referenced by `source-layer` in the frontend map config.          |
| `--minimum-zoom=4`             | Don't generate tiles below zoom 4                                                                           |
| `--maximum-zoom=12`            | Don't generate tiles above zoom 12                                                                          |
| `--drop-densest-as-needed`     | At low zoom, drop the least-visible features to keep tiles under the size limit. Best for points and lines. |
| `--coalesce-densest-as-needed` | At low zoom, merge nearby polygons instead of dropping them. Preserves area coverage.                       |
| `--force`                      | Overwrite if the output file already exists                                                                 |

See [zoom level guidance](README.md#choosing-zoom-levels) in the main README for how to pick `minimum-zoom` and `maximum-zoom`.

## Large GeoJSON files

For files over ~500 MB, convert to newline-delimited GeoJSON first to avoid memory issues:

```bash
# Convert to GeoJSONSeq (one feature per line, streams without loading into memory)
ogr2ogr -f GeoJSONSeq my_data.geojsonseq my_data.geojson

# Then use it as tippecanoe input
tippecanoe \
  --output=../../frontend/public/geodata/my_data.pmtiles \
  --layer=my_data \
  --minimum-zoom=4 --maximum-zoom=12 \
  --drop-densest-as-needed --force \
  my_data.geojsonseq

# Clean up intermediate file
rm my_data.geojsonseq
```

## Multiple GeoJSON files

tippecanoe can merge multiple files into one PMTiles archive:

```bash
# Same layer (features merged)
tippecanoe \
  --output=merged.pmtiles \
  --layer=my_data \
  --minimum-zoom=4 --maximum-zoom=12 \
  --drop-densest-as-needed --force \
  file_a.geojson file_b.geojson file_c.geojson

# Different layers (each file becomes a separate layer)
tippecanoe \
  --output=multi.pmtiles \
  --minimum-zoom=4 --maximum-zoom=12 \
  --drop-densest-as-needed --force \
  --named-layer=roads:roads.geojson \
  --named-layer=buildings:buildings.geojson
```

## Upload to CDN (optional)

```bash
s3cmd put ../../frontend/public/geodata/my_data.pmtiles s3://urbes-viz/
```
