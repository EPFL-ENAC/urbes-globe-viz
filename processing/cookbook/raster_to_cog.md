# Raster GeoTIFF → Cloud Optimized GeoTIFF (COG)

Convert a raster GeoTIFF (satellite imagery, population grids, elevation models, etc.) into a Cloud Optimized GeoTIFF. COGs are internally tiled and compressed with built-in overviews, allowing browsers to fetch only the tiles they need via HTTP range requests — no tile server required.

## Pipeline

```
global_raster.tif  →  gdalwarp (clip, reproject, compress)  →  my_raster_cog.tif
```

## Requirements

- GDAL (`gdalwarp`, `gdal_translate`, `gdalinfo`)

## Option A — Clip, reproject & optimize (most common)

Extract a region from a large raster, reproject to Web Mercator, and create a COG — all in one command:

```bash
gdalwarp \
  input.tif \
  output_cog.tif \
  -t_srs EPSG:3857 \
  -te_srs EPSG:4326 \
  -te 5.9 45.8 10.5 47.8 \
  -r average \
  -ot Byte \
  -srcnodata 255 \
  -dstnodata 0 \
  -of COG \
  -co BLOCKSIZE=256 \
  -co COMPRESS=DEFLATE \
  -co LEVEL=6 \
  -co PREDICTOR=2 \
  -co TILING_SCHEME=GoogleMapsCompatible \
  -co ZOOM_LEVEL=14 \
  -co OVERVIEW_RESAMPLING=AVERAGE \
  -co SPARSE_OK=TRUE \
  --config GDAL_CACHEMAX 4096
```

### Flags explained

| Flag                                     | Purpose                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-t_srs EPSG:3857`                       | Reproject to Web Mercator (what web maps use)                                                                                                       |
| `-te_srs EPSG:4326`                      | The bounding box values are in WGS84 degrees                                                                                                        |
| `-te 5.9 45.8 10.5 47.8`                 | Bounding box: West South East North (here: Switzerland)                                                                                             |
| `-r average`                             | Resampling method when reprojecting. Use `average` for continuous data (population, temperature), `nearest` for categorical data (land use classes) |
| `-ot Byte`                               | Output type. `Byte` for 0–255 values, `UInt16` for larger ranges, `Float32` for continuous measurements                                             |
| `-srcnodata 255`                         | Value treated as "no data" in the source                                                                                                            |
| `-dstnodata 0`                           | Value written for "no data" in the output                                                                                                           |
| `-of COG`                                | Output format: Cloud Optimized GeoTIFF                                                                                                              |
| `-co BLOCKSIZE=256`                      | Internal tile size (256 or 512 pixels)                                                                                                              |
| `-co COMPRESS=DEFLATE`                   | Compression. `DEFLATE` is the best general-purpose choice. `JPEG` for imagery, `ZSTD` for speed, `WEBP` for small size                              |
| `-co LEVEL=6`                            | Compression level (1–9). Higher = smaller file, slower to create                                                                                    |
| `-co PREDICTOR=2`                        | Horizontal differencing — improves compression for continuous data                                                                                  |
| `-co TILING_SCHEME=GoogleMapsCompatible` | Align tiles to the standard XYZ web tile grid                                                                                                       |
| `-co ZOOM_LEVEL=14`                      | Maximum tile zoom level. Higher = more detail, larger file                                                                                          |
| `-co OVERVIEW_RESAMPLING=AVERAGE`        | How to build lower-zoom overviews                                                                                                                   |
| `-co SPARSE_OK=TRUE`                     | Don't write tiles that are entirely nodata (saves space for sparse datasets)                                                                        |
| `--config GDAL_CACHEMAX 4096`            | GDAL RAM cache in MB. Increase for large global rasters                                                                                             |

### Common bounding boxes

| Region      | West  | South | East  | North |
| ----------- | ----- | ----- | ----- | ----- |
| Switzerland | 5.9   | 45.8  | 10.5  | 47.8  |
| Vaud–Geneva | 5.9   | 46.1  | 7.0   | 46.9  |
| Europe      | -25.0 | 34.0  | 45.0  | 72.0  |
| China       | 73.5  | 18.0  | 135.0 | 53.5  |

### Logging

Add `2>&1 | tee output.log` to the command to save the log:

```bash
gdalwarp input.tif output_cog.tif \
  ... \
  2>&1 | tee processing.log
```

## Option B — Simple COG conversion

If your raster already has the right CRS and extent, and you just want to add tiling and compression:

```bash
gdal_translate \
  input.tif \
  output_cog.tif \
  -of COG \
  -co BLOCKSIZE=256 \
  -co COMPRESS=DEFLATE \
  -co LEVEL=6 \
  -co PREDICTOR=2 \
  -co OVERVIEW_RESAMPLING=AVERAGE
```

## Inspecting your COG

```bash
# Basic info: size, CRS, bands, data type
gdalinfo output_cog.tif

# Validate COG structure (checks tiling, overviews, IFD order)
python -m cogeo_mosaic.utils.cogeo validate output_cog.tif
# or with rio-cogeo (installed in the processing venv):
uv run --project .. rio cogeo validate output_cog.tif
```

## Choosing compression

| Compression | Best for                               | Size      | Speed    |
| ----------- | -------------------------------------- | --------- | -------- |
| `DEFLATE`   | General purpose, continuous data       | Good      | Moderate |
| `LZW`       | General purpose                        | Good      | Moderate |
| `ZSTD`      | Large files where speed matters        | Good      | Fast     |
| `JPEG`      | Aerial/satellite imagery (lossy)       | Excellent | Fast     |
| `WEBP`      | Imagery, web delivery (lossy/lossless) | Excellent | Fast     |

## Choosing resampling method

| Method     | Use when                                                                   |
| ---------- | -------------------------------------------------------------------------- |
| `nearest`  | Categorical data (land use, classification) — preserves exact values       |
| `average`  | Continuous data (population, temperature, elevation) — smooth downsampling |
| `bilinear` | Continuous data — smoother than average                                    |
| `cubic`    | Continuous data — smoothest, best for imagery                              |

## Real-world example from this project

The GHSL built-up surface (10m global) was clipped to Switzerland and converted to a COG:

```bash
gdalwarp \
  GHS_BUILT_S_E2018_GLOBE_R2023A_54009_10_V1_0.tif \
  ghsl_switzerland_hires.tif \
  -t_srs EPSG:3857 \
  -te_srs EPSG:4326 \
  -te 5.9 45.8 10.5 47.8 \
  -r average \
  -ot Byte \
  -srcnodata 255 \
  -dstnodata 0 \
  -of COG \
  -co BLOCKSIZE=256 \
  -co COMPRESS=DEFLATE \
  -co LEVEL=6 \
  -co PREDICTOR=2 \
  -co TILING_SCHEME=GoogleMapsCompatible \
  -co ZOOM_LEVEL=14 \
  -co OVERVIEW_RESAMPLING=AVERAGE \
  -co SPARSE_OK=TRUE \
  --config GDAL_CACHEMAX 4096 \
  2>&1 | tee ghsl_switzerland_hires.log
```

See also the [GUF Urban Footprint](../guf_urban_footprint/) pipeline for downloading raster data from a WMS service and creating COGs programmatically with Python/rasterio.

## Upload to CDN (optional)

```bash
s3cmd put output_cog.tif s3://urbes-viz/
```
