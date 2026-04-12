# WRF/PALM NetCDF → COG Pipeline

Converts WRF (mesoscale) and PALM (microscale) NetCDF output files into Cloud Optimized GeoTIFFs (COGs) with time-series support for the Urbes Globe Viz platform.

## Data Characteristics

| Dataset | Resolution | Temporal | Extent            | Variables                              |
| ------- | ---------- | -------- | ----------------- | -------------------------------------- |
| WRF d02 | 1 km       | 4 hours  | Leman Lake region | Multivariable (T2, PRECIP, WIND, etc.) |
| WRF d03 | 333 m      | 1 hour   | Lausanne metro    | Multivariable                          |
| WRF d04 | 333 m      | 1 hour   | Geneva metro      | Multivariable                          |
| PALM    | 0.5 m      | 10 min   | Urban canopy      | Multivariable                          |

## Pipeline Overview

```
WRF/PALM NetCDF (4D: lat, lon, level, time)
    ↓
nc_to_cog.py (extract variable, reproject, create time-series COG)
    ↓
my_variable_cog.tif (multi-band COG, one band per timestep)
    ↓
Upload to CDN / NAS
    ↓
Frontend: TimeSlider + ProjectMap (existing pattern)
```

## Prerequisites

```bash
# System GDAL (required for netCDF support)
sudo apt install gdal-bin libnetcdf-dev

# Python dependencies (from processing/ directory)
cd /mnt/data/Documents/Code/urbes-globe-viz/processing
uv sync
```

**Note**: The Python GDAL bindings (`osgeo.gdal`) are automatically available when the system GDAL is installed. If you get import errors, ensure `gdal-bin` is installed and restart your terminal.

## Usage

### 1. List available variables in NetCDF

```bash
gdalinfo wrfout_d03_2022-07-15_12_00_00 | grep "SUBDATASETS"
```

### 2. Convert a variable to time-series COG

```bash
cd /mnt/data/Documents/Code/urbes-globe-viz/processing/aldo_netcdf

# Example: Convert 2m temperature (T2) from WRF d03
uv run nc_to_cog.py \
  --input wrfout_d03_2022-07-15_12_00_00 \
  --variable T2 \
  --output t2_2m_cog.tif \
  --zoom-level 14 \
  --resampling average

# Example: Convert precipitation (PRECIP) from WRF d02
uv run nc_to_cog.py \
  --input wrfout_d02_2022-07-15_12_00_00 \
  --variable PRECIP \
  --output precip_cog.tif \
  --zoom-level 12 \
  --resampling near
```

### 3. Verify the COG

```bash
gdalinfo t2_2m_cog.tif
# Should show:
# - Size: <width> x <height>
# - Bands: <num_timesteps>
# - Coordinate System: EPSG:3857
# - Metadata: MIN/MAX values for each band
```

### 4. Upload to production

```bash
# Copy to shared NAS geodata folder
cp t2_2m_cog.tif /path/to/nas/geodata/

# Or upload to S3 CDN
s3cmd put --acl-public t2_2m_cog.tif s3://urbes-viz/
```

### 5. Frontend integration

See `frontend/src/config/projects/_example.ts.example` and add:

```typescript
{
  id: "wrf_temperature",
  title: "WRF 2m Temperature",
  description: "Temperature at 2m from WRF model",
  coordinates: [6.14, 46.20, 7.0, 46.9], // Geneva area
  category: "Climate",
  year: "2022",
  source: {
    type: "raster",
    url: "https://urbes-viz.epfl.ch/geodata/t2_2m_cog.tif"
  },
  layer: {
    type: "raster",
    paint: {
      "raster-opacity": 0.8
    }
  },
  timeControl: {
    min: 0,
    max: <num_timesteps - 1>,
    fieldTemplate: "band_{value}",
    placeholderField: "band_0"
  }
}
```

## Output Format

- **Format**: Cloud Optimized GeoTIFF (COG)
- **Projection**: EPSG:3857 (Web Mercator)
- **Bands**: One band per timestep
- **Compression**: DEFLATE with predictor
- **Overviews**: Built automatically for fast zooming

## Notes

### Nested Domains

WRF d02, d03, and d04 are spatially nested. To visualize them together:

1. Create separate COGs for each domain
2. Add as separate projects in the frontend
3. Use the same `timeControl` configuration to sync time slider

### Variable Selection

Common WRF variables:

- `T2` - Temperature at 2m (K)
- `TMIN`, `TMAX` - Min/Max temperature
- `PRECIP` - Accumulated precipitation
- `RAINNC` - Grid-scale + convective rain
- `U10`, `V10` - 10m wind components
- `PSFC` - Surface pressure
- `RELHUM` - Relative humidity

### PALM Microscale

For PALM output (TEST_4_3d.001.nc):

- Higher resolution (0.5m) → use `--zoom-level 16` or higher
- Smaller extent → adjust bounding box
- More frequent timesteps (10min) → more bands in COG

## Troubleshooting

### "No module named 'netCDF4'"

```bash
uv add netcdf4
```

### GDAL can't read NetCDF

```bash
sudo apt install libnetcdf-dev hdf5-lib
```

### COG is too large

- Reduce zoom levels: `--zoom-level 12` (instead of 14)
- Clip to smaller extent: `--bounds 6.0,46.1,7.0,46.9`
- Use JPEG compression: `--compress JPEG` (lossy but smaller)

### Visualization looks wrong

- Check variable units (K vs °C, m/s vs km/h)
- Create color ramp file: see `ghsl_to_pmtiles/ghsl_colors.txt` example
- Adjust raster opacity in layer config

## See Also

- [GHSL to PMTiles](../ghsl_to_pmtiles/README.md) - Global raster pipeline
- [Raster to COG cookbook](../cookbook/raster_to_cog.md) - General COG conversion
- [TimeSlider pattern](../../frontend/src/components/common/TimeSlider.vue) - Frontend integration
