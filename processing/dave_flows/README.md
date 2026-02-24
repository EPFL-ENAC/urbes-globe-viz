# DAVE Flows Processing

Converts DAVE simulation origin-destination flow data (CSV) into PMTiles vector tiles for display in the globe app. The same pipeline generalises to any OD matrix that references spatial grid cells.

## What is DAVE?

DAVE (Dynamic Activity-based human Vectors Evaluation) is an activity-based mobility simulation developed at EPFL. It models where people are (home, work, leisure, outdoor, hospitality) at each hour of the day across a 500 m × 500 m grid covering the Vaud-Geneva region.

The **flow files** record how many people move between pairs of grid cells:

```
origin,dest,flow
565,565,19.0   ← self-flow (filtered out)
565,566,5.0    ← 5 people moved from cell 565 to cell 566
755,753,20.0
```

## Source Data

All source files are in `frontend/public/DAVE simulations/`:

| File                              | Environment    | Time          | Rows         |
| --------------------------------- | -------------- | ------------- | ------------ |
| `flows_1_199_10_min1persons.csv`  | Work           | Day 199, 10am | ~65k         |
| `flows_5_199_18_min1persons.csv`  | Indoor leisure | Day 199, 6pm  | ~7k          |
| `flows_6_199_18_min1persons.csv`  | Outdoor        | Day 199, 6pm  | ~3.7k        |
| `500_grid_Vaud_Geneva_within.shp` | Grid geometry  | —             | 14,817 cells |

The grid shapefile uses **EPSG:2056** (Swiss CH1903+ LV95). The `id` column links grid cells to the flow CSV `origin`/`dest` columns.

## Why a Spatial Join?

The flow CSVs only contain grid cell IDs — they have no coordinates. To draw a line on the map we need:

1. Load the grid polygons → compute centroids → reproject to WGS84 (EPSG:4326)
2. Look up origin centroid → `[lon, lat]` and dest centroid → `[lon, lat]`
3. Build a `LineString` feature from origin to destination

`flows_to_geojson.py` does this join. Self-flows (origin == dest) produce zero-length lines and are dropped.

## Prerequisites

```bash
# GDAL/OGR (for reprojection inside geopandas)
# Install via conda, brew, or apt

# tippecanoe (vector tile generation)
# https://github.com/felt/tippecanoe
brew install tippecanoe   # macOS
sudo apt install tippecanoe  # Ubuntu 23.04+

# Python dependencies via uv (run once from processing/)
cd ..
make install

# s3cmd (optional, for CDN upload)
pip install s3cmd
```

## Usage

```bash
# Process work environment flows only
make work

# Process all three environments
make all

# Process a single environment manually
./process.sh \
  "../../frontend/public/DAVE simulations/500_grid_Vaud_Geneva_within.shp" \
  "../../frontend/public/DAVE simulations/flows_1_199_10_min1persons.csv" \
  "../../frontend/public/geodata/dave_flows_work.pmtiles"
```

## Pipeline

```
flows_N_199_HH_min1persons.csv  +  500_grid_Vaud_Geneva_within.shp
           │                                    │
           └──────────┐  ┌─────────────────────┘
                      ▼  ▼
              flows_to_geojson.py
              (spatial join, reproject to WGS84,
               build LineString features, drop self-flows)
                      │
                      ▼
               flows_work.geojson
                      │
                      ▼
                 tippecanoe
              (zoom 5–12, drop-densest-as-needed)
                      │
                      ▼
          dave_flows_work.pmtiles  →  frontend/public/geodata/
```

### tippecanoe flags explained

| Flag                       | Reason                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `--minimum-zoom=5`         | No need to show flows at continental scale                                                           |
| `--maximum-zoom=12`        | 500 m grid cells are not meaningful at street level                                                  |
| `--drop-densest-as-needed` | Work flows have ~65k lines — drops least-significant flows at low zoom to stay under tile size limit |
| `--layer=dave_flows`       | All environments use the same layer name so app config is reusable                                   |

## App Integration

After running `make work` (and optionally uploading to CDN), register the dataset in two files:

### 1. `frontend/src/data/projects.ts`

Add a new entry to `projectsGeoJSON.features`:

```typescript
{
  type: "Feature",
  geometry: { type: "Point", coordinates: [6.5, 46.55] },
  properties: {
    id: "dave_flows_work",
    title: "Work Commute Flows (DAVE)",
    description: "Origin-destination mobility flows for the work environment at 10am, modelled by the DAVE activity-based simulation for the Vaud-Geneva region (500m grid).",
    unit: "persons",
    year: 2024,
    info: "Source: DAVE simulation model, EPFL",
    category: "Mobility",
    zoom: 9,
    pitch: 0,
  },
},
```

### 2. `frontend/src/config/mapConfig.ts`

Add a new entry to `mapConfig.layers`:

```typescript
{
  id: "dave_flows_work",
  label: "Work Flows",
  unit: "persons",
  info: "Source: DAVE simulation, EPFL",
  source: {
    type: "vector",
    url: `pmtiles://${baseUrl}/dave_flows_work.pmtiles`,
    minzoom: 5,
  } as VectorSourceSpecification,
  layer: {
    id: "dave_flows_work-layer",
    type: "line",
    source: "dave_flows_work",
    "source-layer": "dave_flows",
    paint: {
      "line-color": [
        "interpolate", ["linear"], ["get", "flow"],
        1,   "#1a1035",
        10,  "#4a1060",
        50,  "#9b2196",
        200, "#e040fb",
      ],
      "line-width": [
        "interpolate", ["linear"], ["get", "flow"],
        1,   0.5,
        50,  2,
        200, 4,
      ],
      "line-opacity": 0.7,
    },
  } as LayerSpecification,
},
```

The `source-layer` is always `dave_flows` regardless of which environment you processed. Use a different `id` (e.g. `dave_flows_outdoor`) for each environment file.

## Output

PMTiles files are written to `frontend/public/geodata/`:

| Target                | Output file                         |
| --------------------- | ----------------------------------- |
| `make work`           | `dave_flows_work.pmtiles`           |
| `make indoor_leisure` | `dave_flows_indoor_leisure.pmtiles` |
| `make outdoor`        | `dave_flows_outdoor.pmtiles`        |

To upload to the CDN after processing:

```bash
s3cmd put ../../frontend/public/geodata/dave_flows_work.pmtiles s3://urbes-viz/
```
