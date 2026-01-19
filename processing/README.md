# URBES Globe Viz - Data Processing

This directory contains scripts to download and process geospatial datasets for the URBES Globe Visualization project.

## Prerequisites

### uv (Python Package Manager)

This project uses [uv](https://github.com/astral-sh/uv) for fast, reliable Python dependency management.

Install uv:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

All Python dependencies are defined in `pyproject.toml` and will be automatically managed by uv.

## Available Datasets

### 1. Martin Building Heights

Converts building height CSV data to PMTiles format.

```bash
make martin_building_heights
```

### 2. Global Urban Footprint (GUF)

Downloads DLR Global Urban Footprint data and creates Cloud Optimized GeoTIFF.

```bash
# Global data at 2.8 arcsec resolution
make guf_urban_footprint

# Custom regions and resolutions
cd guf_urban_footprint
./process.sh europe 0.4
./process.sh asia 2.8
```

See [guf_urban_footprint/README.md](guf_urban_footprint/README.md) for more options.

## Output

All processed files are placed in `../frontend/public/geodata/`

## Dependencies

Python dependencies are defined in `pyproject.toml`:

- rasterio - Geospatial raster I/O
- requests - HTTP library
- Pillow - Image processing
- numpy - Numerical computing
- tqdm - Progress bars
- rio-cogeo - COG validation

External tools:

- tippecanoe - For creating PMTiles (martin_building_heights)
- ogr2ogr/GDAL - For geospatial conversions (martin_building_heights)

## Usage with uv

You can run any script directly with uv:

```bash
# From processing directory
uv run guf_urban_footprint/download_guf_cog.py --help

# Or specify project root
uv run --project . guf_urban_footprint/download_guf_cog.py --region europe
```

uv will automatically:

- Create a virtual environment
- Install dependencies from pyproject.toml
- Run the script with the correct Python environment
