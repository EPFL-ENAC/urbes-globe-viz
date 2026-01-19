# Martin Building Heights Processing

This folder contains the processing pipeline for converting Chinese building heights CSV data to PMTiles format.

## Dataset

**Source:** URBES Research  
**File:** `city_height_obs_vs_sim.csv`  
**Description:** Observed and simulated building heights across Chinese cities (~25km² pixels)

### Data Fields

- `city`: City name
- `x`: Longitude
- `y`: Latitude
- `height_fit`: Observed average building height (meters)
- `sim_height_fit`: Simulated average building height (meters)
- `year`: Observation year

## Processing Pipeline

1. **CSV to GeoJSON** (`csv_to_geojson.py`)

   - Converts CSV rows to Point features
   - Extracts year from date string
   - Includes both observed and simulated heights

2. **GeoJSON to GeoJSONSeq** (using `ogr2ogr`)

   - Converts to line-delimited format for tippecanoe

3. **GeoJSONSeq to MBTiles** (using `tippecanoe`)

   - Creates vector tiles with zoom levels 4-12
   - Base zoom: 8
   - Drop densest features as needed for performance

4. **MBTiles to PMTiles** (using `pmtiles`)
   - Converts to cloud-optimized PMTiles format
   - Output: `../../frontend/public/geodata/building_heights_china.pmtiles`

## Requirements

- Python 3
- GDAL/OGR (`ogr2ogr`)
- tippecanoe
- pmtiles CLI

## Usage

From the `processing` directory:

```bash
make martin_building_heights
```

Or directly:

```bash
cd martin_building_heights
bash process.sh
```

## Output

- **PMTiles file:** `frontend/public/geodata/building_heights_china.pmtiles`
- **Layer name:** `building_heights_china`
- **Properties:** `city`, `height_fit`, `sim_height_fit`, `year`
