# NetCDF Pipeline Implementation Summary

## What Was Created

### Files Added

1. **`processing/aldo_netcdf/nc_to_cog.py`**

   - Python script to convert WRF/PALM NetCDF to COG
   - Extracts variables, handles 4D data (time + 3D spatial)
   - Automatically reprojects to EPSG:3857 (Web Mercator)
   - Creates multi-band COG (one band per timestep)
   - Supports all WRF/PALM coordinate systems

2. **`processing/aldo_netcdf/README.md`**

   - Complete documentation with usage examples
   - Variable selection guide
   - Troubleshooting section
   - Frontend integration instructions

3. **`processing/aldo_netcdf/Makefile`**

   - Quick commands for common conversions
   - Pre-configured for your files (d02, d03, d04, PALM)
   - Zoom levels optimized for each resolution

4. **Updated `processing/pyproject.toml`**
   - Added `netcdf4` dependency

---

## How It Works

### Pipeline Architecture

```
WRF/PALM NetCDF (4D)
    ↓
nc_to_cog.py extracts:
  - Specific variable (T2, PRECIP, WIND, etc.)
  - All timesteps (Time dimension)
  - Coordinates (XLONG/XLAT or 1D mesh)
    ↓
Multi-band GeoTIFF (temporary)
    ↓
gdalwarp reprojects to EPSG:3857
    ↓
COG with overviews (one band = one timestep)
    ↓
Upload to CDN/NAS
    ↓
Frontend: TimeSlider + ProjectMap
```

### Why COG (not PMTiles)?

- ✅ **Existing TimeSlider pattern** already works with multi-band COGs
- ✅ **Regional data** (not global) → COG streaming works perfectly
- ✅ **Multi-band support** → All timesteps in one file
- ✅ **Simpler frontend integration** → No custom time-handling logic needed

---

## Usage Examples

### Quick Start

```bash
cd /mnt/data/Documents/Code/urbes-globe-viz/processing/aldo_netcdf

# List available variables
make list-vars

# Convert 2m temperature from all WRF domains (nested visualization)
make convert-t2

# Convert precipitation from d02 (Leman Lake region)
make convert-precip

# Convert wind components from d03 (Lausanne)
make convert-wind
```

### Custom Conversion

```bash
# Convert any variable manually
uv run nc_to_cog.py \
  --input wrfout_d03_2022-07-15_12_00_00 \
  --variable T2 \
  --output t2_cog.tif \
  --zoom-level 14 \
  --resampling average
```

### Parameters Explained

| Parameter      | Recommended Value                            | Reason                  |
| -------------- | -------------------------------------------- | ----------------------- |
| `--zoom-level` | 12 (d02), 14 (d03/d04), 16 (PALM)            | Matches data resolution |
| `--resampling` | `average` (continuous), `near` (categorical) | Quality vs speed        |
| `--compress`   | `DEFLATE` (lossless), `JPEG` (smaller)       | Size vs quality         |
| `--bounds`     | Optional: clip to smaller area               | Reduce file size        |

---

## Nested Domain Visualization

To display d02, d03, and d04 together as nested domains:

### Step 1: Convert each domain

```bash
make convert-t2  # Creates: wrf_d02_t2_cog.tif, wrf_d03_t2_cog.tif, wrf_d04_t2_cog.tif
```

### Step 2: Upload to CDN

```bash
s3cmd put --acl-public wrf_d02_t2_cog.tif s3://urbes-viz/
s3cmd put --acl-public wrf_d03_t2_cog.tif s3://urbes-viz/
s3cmd put --acl-public wrf_d04_t2_cog.tif s3://urbes-viz/
```

### Step 3: Add to frontend (3 separate projects)

```typescript
// frontend/src/config/projects/wrf_temp_d02.ts
{
  id: "wrf_temp_d02",
  title: "WRF Temperature (Leman Lake)",
  coordinates: [6.0, 46.0, 7.5, 47.0],
  category: "Climate",
  year: "2022",
  source: {
    type: "raster",
    url: "https://urbes-viz.epfl.ch/geodata/wrf_d02_t2_cog.tif"
  },
  layer: { type: "raster", paint: { "raster-opacity": 0.8 } },
  timeControl: {
    min: 0,
    max: 23,  // Adjust based on num_timesteps
    fieldTemplate: "band_{value}",
    placeholderField: "band_0"
  }
}

// Repeat for d03 and d04 with appropriate coordinates
```

### Step 4: User experience

- User sees 3 cards on the globe (Leman Lake, Lausanne, Geneva)
- Click any card → opens ProjectDetailView with time slider
- Slider controls which timestep is displayed
- All domains share the same time range (synchronized)

---

## Available WRF Variables

Common variables in your files:

| Variable       | Description                  | Units | Typical Use           |
| -------------- | ---------------------------- | ----- | --------------------- |
| `T2`           | Temperature at 2m            | K     | Heat islands, climate |
| `TMIN`, `TMAX` | Min/Max temperature          | K     | Daily extremes        |
| `PRECIP`       | Accumulated precipitation    | mm    | Rainfall analysis     |
| `RAINNC`       | Grid-scale + convective rain | mm    | Storm tracking        |
| `U10`, `V10`   | 10m wind components          | m/s   | Wind patterns         |
| `PSFC`         | Surface pressure             | Pa    | Pressure systems      |
| `RELHUM`       | Relative humidity            | %     | Moisture analysis     |
| `CLDFRA`       | Cloud fraction               | 0-1   | Cloud cover           |

Check all available variables:

```bash
gdalinfo wrfout_d03_2022-07-15_12_00_00 | grep SUBDATASETS
```

---

## PALM Microscale Data

For `TEST_4_3d.001-001.nc` (0.5m resolution):

```bash
uv run nc_to_cog.py \
  --input TEST_4_3d.001-001.nc \
  --variable YOUR_VAR \
  --output palm_output_cog.tif \
  --zoom-level 16 \
  --resampling average
```

**Note**: PALM has much higher resolution and more frequent timesteps (10min). Expect:

- Larger file sizes
- More bands (timesteps)
- Smaller geographic extent (urban canopy only)

---

## Next Steps

### Immediate Actions

1. **Test the pipeline** on one variable:

   ```bash
   cd processing/aldo_netcdf
   make convert-t2-d03  # Start with d03 (Lausanne, smaller file)
   ```

2. **Verify the COG**:

   ```bash
   gdalinfo wrf_d03_t2_cog.tif
   # Check: size, bands, projection, min/max values
   ```

3. **Test locally** in the app:

   - Copy COG to `frontend/public/geodata/`
   - Add project config (see example above)
   - `cd frontend && npm run dev`
   - Verify visualization at http://localhost:9000

4. **Upload to production** when ready:
   ```bash
   s3cmd put --acl-public wrf_d03_t2_cog.tif s3://urbes-viz/
   ```

### Future Enhancements

- **Color ramps**: Create `.txt` files for variable-specific coloring (like `ghsl_colors.txt`)
- **Multi-variable layers**: Stack temperature + wind arrows (separate COGs)
- **Animation**: TimeSlider already supports this — just move the slider
- **PALM integration**: Same pipeline, just different zoom level

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'osgeo'"

```bash
sudo apt install libgdal-dev
# Then restart terminal or reload PATH
```

### "Variable not found"

Check exact variable name (case-sensitive):

```bash
gdalinfo wrfout_d03_2022-07-15_12_00_00 | grep SUBDATASETS
```

### COG file too large

- Reduce zoom level: `--zoom-level 12` (instead of 14)
- Use JPEG compression: `--compress JPEG` (lossy but 5-10x smaller)
- Clip to smaller area: `--bounds 6.0,46.1,7.0,46.9`

### Visualization looks wrong

- Check variable units (K vs °C, m/s vs km/h)
- Adjust layer opacity: `"raster-opacity": 0.6`
- Create custom color ramp (see GHSL example)

---

## Support

If you encounter issues:

1. Check the README: `processing/aldo_netcdf/README.md`
2. Check the cookbook: `processing/cookbook/`
3. Review existing pipelines: `processing/ghsl_to_pmtiles/`
4. Contact: Pierre Ripoll (ENAC-IT4R)

---

## Files Reference

| File               | Purpose                            |
| ------------------ | ---------------------------------- |
| `nc_to_cog.py`     | Main conversion script             |
| `README.md`        | Full documentation                 |
| `Makefile`         | Quick commands                     |
| `wrfout_d02_*`     | Your WRF d02 data (1km)            |
| `wrfout_d03_*`     | Your WRF d03 data (333m, Lausanne) |
| `wrfout_d04_*`     | Your WRF d04 data (333m, Geneva)   |
| `TEST_4_3d.001.nc` | Your PALM data (0.5m)              |

---

**Ready to test?** Run:

```bash
cd processing/aldo_netcdf && make convert-t2-d03
```
