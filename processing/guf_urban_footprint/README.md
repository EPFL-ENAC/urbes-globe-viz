# Global Urban Footprint (GUF) Processing

This folder contains scripts to download and process the DLR Global Urban Footprint dataset into Cloud Optimized GeoTIFF (COG) format for efficient web visualization.

## Dataset Information

- **Source**: German Aerospace Center (DLR)
- **Resolution**: 0.4 arcsec (~12m) or 2.8 arcsec (~84m)
- **Coverage**: Global (2010-2013)
- **License**: Free for scientific and non-commercial use

## Prerequisites

Dependencies are managed with [uv](https://github.com/astral-sh/uv). Install uv:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

All Python dependencies will be automatically managed by uv when running the scripts.

## Usage

### Download and create Cloud Optimized GeoTIFF

```bash
# Download global data at 2.8 arcsec resolution (recommended for web)
python3 download_guf_cog.py --resolution 2.8 --region global

# Download specific region at higher resolution
python3 download_guf_cog.py --resolution 0.4 --region europe

# Download custom bbox
python3 download_guf_cog.py --bbox -10,35,30,60 --resolution 2.8
```

### Validate COG

```bash
rio cogeo validate guf_global_2.8arcsec_cog.tif
```

## Output

- `guf_*.tif` - Cloud Optimized GeoTIFF files
- Output files are placed in `../../frontend/public/geodata/`

## Notes

- For web visualization, 2.8 arcsec resolution is recommended for balance between detail and file size
- 0.4 arcsec resolution produces very large files (~100GB+ for global coverage)
- COG files support efficient partial reads and work well with deck.gl and other web mapping libraries
