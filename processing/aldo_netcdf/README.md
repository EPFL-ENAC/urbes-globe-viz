# WRF NetCDF → COG pipeline

Converts WRF output files (NetCDF) into Cloud Optimized GeoTIFFs (COGs) and wind
arrows for the "Lake-City Climates" project (`frontend/src/config/projects/wrf.ts`).

| Domain | Resolution | Extent                |
| ------ | ---------- | --------------------- |
| d02    | 1 km       | Leman basin           |
| d03    | 333 m      | Lausanne metropolitan |
| d04    | 333 m      | Geneva metropolitan   |

The source files (`wrfout_d0{2,3,4}_2022-07-15_12_00_00`) are not in git. Each one
holds one timestep (noon UTC, 15 July 2022).

## What is baked

For each domain:

| File                     | Content                                        | From              |
| ------------------------ | ---------------------------------------------- | ----------------- |
| `wrf_<d>_t2c_cog.tif`    | 2 m air temperature, °C                        | T2 - 273.15       |
| `wrf_<d>_tskc_cog.tif`   | Surface temperature, °C                        | TSK - 273.15      |
| `wrf_<d>_ws10_cog.tif`   | 10 m wind speed, m/s                           | sqrt(U10² + V10²) |
| `wrf_<d>_wind10.json`    | 10 m wind arrows (direction and speed)         | U10, V10          |
| `wrf_<d>_q2_cog.tif`     | 2 m specific humidity, kg/kg (raw, baked once) | Q2                |
| `wrf_<d>_swdown_cog.tif` | Shortwave downward radiation, W/m² (raw)       | SWDOWN            |

Wind direction is where the wind comes from, in degrees from north:
`WD = atan2(-U, -V) * 57.29578`. Before that, U10/V10 are turned from the model grid
to east/north with `SINALPHA`/`COSALPHA`. The speed does not change with this turn.

## Run it

You need [uv](https://github.com/astral-sh/uv). No system GDAL: `rasterio` ships it.

```bash
cd processing && uv sync
cd aldo_netcdf
make bake INPUT_DIR=/path/to/folder/with/wrfout/files
```

Everything goes to `out/` (gitignored). One file by hand:

```bash
uv run nc_to_cog.py -i wrfout_d03_2022-07-15_12_00_00 -v T2C -o out/wrf_d03_t2c_cog.tif
uv run nc_to_cog.py -i wrfout_d03_2022-07-15_12_00_00 --arrows out/wrf_d03_wind10.json --stride 4
```

`-v` takes a WRF name (`T2`, `Q2`, `SWDOWN`, ...) or a derived one (`T2C`, `TSKC`,
`WS10`). The script prints min, p1, mean, p99 and max of the values. Use them to pick
the colour ranges in `wrf.ts`.

## Test locally

The dev server serves `out/<name>` for `/geodata/<name>` when the file exists (see
`bakedGeodata` in `frontend/vite.config.ts`). So after `make bake`, open the WRF page
in the dev server, there is nothing to copy.

Do not write in `frontend/public/geodata`. It is a link to the main checkout, shared by
every worktree.

## Upload

Copy the files of `out/` to the geodata folder of the main checkout, then run
`make upload-geodata` from the repo root. Upload before the release, else the site
asks for files that do not exist on the server yet.

## How it works

1. Read the variable (or compute the derived one) for every timestep.
2. Write it as a GeoTIFF placed with ground control points (GCPs) from XLONG/XLAT,
   every 10 cells plus the corners.
3. Warp it to EPSG:3857 (Web Mercator), bilinear.
4. Write a COG, one band per timestep: DEFLATE, 256 px tiles,
   `TILING_SCHEME=GoogleMapsCompatible`. Without this tiling scheme the viewer draws
   the data at the wrong place.

The arrows are not warped. They are points on the native grid, one every `--stride`
cells, with `spacing_m` (stride × DX) so the viewer can size them.

## Notes

- The COG driver picks the web zoom level closest to the data. d02 lands on zoom 7
  (1.2 km pixels), d03 and d04 on zoom 8 (611 m pixels), so d03 and d04 are a bit
  coarser than their 333 m grid. `ZOOM_LEVEL_STRATEGY=UPPER` in `write_cog` would
  keep all the detail, with bigger files (not tested yet).
- More timesteps: one wrfout file per timestep today. To bake a time series, stack
  the files along `Time` first (one band per timestep in the COG).
