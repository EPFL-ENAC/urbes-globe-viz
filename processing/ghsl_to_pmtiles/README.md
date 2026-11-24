# GHSL → PMTiles Pipeline

Converts the GHSL Built Surface 2018 dataset into a PMTiles raster archive. The globe
basemap reads it with HTTP range requests, so no tile server is needed.

The current build makes 512 px WebP tiles, zoom 0 to 12, in `ghsl-512.pmtiles`. A 512 px
tile at zoom 12 has the same pixels as four 256 px tiles at zoom 13. So the map is as sharp
as with the old `ghsl.pmtiles` (256 px, zoom 0 to 13), with 4 times fewer requests per view.

The build writes new names only: `tiles_512/` (or `ghsl_tiles_512/`), `ghsl-512.mbtiles` and
`ghsl-512.pmtiles`. It does not touch `ghsl.pmtiles`. Prod uses `ghsl.pmtiles` until the
frontend switch lands.

## Why PMTiles (not COG)?

`gdal_translate -of COG -co TILING_SCHEME=GoogleMapsCompatible` crashes at global scale:

```
ERROR 1: TIFFSetupStrips:Too large Strip/Tile Offsets/ByteCounts arrays
```

67M+ tiles at zoom 13 overflows libtiff. No fix exists in GDAL ≤ 3.13. PMTiles stores
pre-rendered WebP tiles in a single file with HTTP range support.

## Source data

The source raster is `ghsl_built_3857_cog.tif` (47 GB, EPSG:3857, NoData=255). Copies:

- SCITAS Jed: `/work/enac-it4r/ghsl/` (persistent).
- ENACIT4R-CUDA: `/mnt/nvme/urbes-globe-viz/geodata/`.

The color ramp is `ghsl_colors.txt` in this folder. It must have 5 columns: `value R G B A`.
With 4 columns, GDAL maps the last value to Blue, and you get blue artifacts everywhere.

## Build on SCITAS Jed

This is how the archive in prod was built (March 2026, 256 px). The cluster, the storage
and the known problems are in [`scitas/README.md`](scitas/README.md). The cost is about
1000 CPU hours (16 strips x 14 cores x a few hours), so about CHF 5 to 6.

### 1. Copy the scripts to Jed

From a checkout of the branch, on a machine on the EPFL network (or VPN):

```bash
rsync -av processing/ghsl_to_pmtiles/ ripoll@jed.hpc.epfl.ch:/work/enac-it4r/ghsl/
```

The jobs read `ghsl_colors.txt` and `pack_mbtiles.py` in `/work/enac-it4r/ghsl/`, and the
job scripts in `/work/enac-it4r/ghsl/scitas/`.

### 2. Make sure that the tools and the source are there

On Jed:

```bash
cd /work/enac-it4r/ghsl
ls gdal.sif pmtiles          # if one is missing, see "One-time setup" in scitas/README.md
apptainer exec gdal.sif gdal2tiles.py --help | grep -- --tilesize

# $SCRATCH deletes files after 30 days, so copy the source again if it is gone
mkdir -p /scratch/ripoll/ghsl
ls -lh /scratch/ripoll/ghsl/ghsl_built_3857_cog.tif \
  || rsync -avP ghsl_built_3857_cog.tif /scratch/ripoll/ghsl/
```

`/work` needs about 15 GB free for the final archive.

### 3. Generate the tiles

```bash
cd /work/enac-it4r/ghsl
sbatch scitas/01_z0-7.sbatch     # zoom 0-7, one job, some minutes
```

When it is done, look at some tiles of `/scratch/ripoll/ghsl/tiles_512/5/`. They must be
512 x 512, white on transparent, with no blue (`file <tile>.webp` gives the size). Then:

```bash
sbatch scitas/02_z8-11.sbatch    # zoom 8-11, 16 strips in parallel
sbatch scitas/03_z12.sbatch      # zoom 12, 16 strips in parallel, up to 6 h each
squeue -u ripoll
```

All the jobs use `gdal2tiles.py --tilesize=512 --xyz -x --tiledriver=WEBP --webp-quality=85`.
`-x` skips the fully transparent tiles (the ocean, about 60% of the globe). The logs are in
`/work/enac-it4r/ghsl/logs/512_*.log`. If a strip of job 03 hits the time limit, run that
strip again with `sbatch --array=<id> --time=12:00:00 scitas/03_z12.sbatch`.

### 4. Pack into PMTiles

When all the jobs of 02 and 03 are done (`squeue -u ripoll` is empty):

```bash
sbatch scitas/04_pack_upload.sbatch
```

The job counts the tiles per zoom, deletes the tiles smaller than 225 B, packs them with
`pack_mbtiles.py`, then runs `pmtiles convert` and `pmtiles show`. It writes
`/work/enac-it4r/ghsl/ghsl-512.pmtiles`.

In `logs/512_pack.log`, make sure that `pmtiles show` gives `tile type: webp`,
`min zoom: 0` and `max zoom: 12`. Then make sure that the tiles are 512 px:

```bash
./pmtiles tile ghsl-512.pmtiles 0 0 0 > /tmp/t.webp && file /tmp/t.webp
# RIFF (little-endian) data, Web/P image, with alpha, 511+1x511+1
```

### 5. Upload to the NAS

Do not upload under the name `ghsl.pmtiles`. nginx marks `ghsl*.pmtiles` as immutable for one
year, so browsers keep the old file. Also, prod reads `ghsl.pmtiles` until the switch lands.

The NAS share is `//enac-nas1.rcp.epfl.ch/fts-enac-it`, folder `urbes-viz.epfl.ch`. nginx
serves this folder at `https://urbes-viz.epfl.ch/geodata/`. This is the same share as
`scripts/upload-geodata.sh` at the repo root. Do not use `make upload-geodata` for this file.
It syncs the shared `frontend/public/geodata` folder, and the archive must not go there.

On Jed, when job 04 is done:

```bash
cd /work/enac-it4r/ghsl
ls -l ~/.smbpassword                          # your EPFL password, must be -rw------- (chmod 600)
python3 -c "import smbclient" && echo ok      # if it fails: pip install --user smbprotocol
sbatch scitas/05_upload_nas.sbatch
tail -f logs/512_upload_nas.log               # Ctrl+C when it prints "Done"
```

The job refuses to run if `ghsl-512.pmtiles` exists on the NAS. It writes
`ghsl-512.pmtiles.part`, checks the size, then renames it. This is how `ghsl.pmtiles` was
uploaded in March 2026.

If the job can't reach the NAS, do it from your laptop (EPFL network or VPN, it needs
`cifs-utils`):

```bash
rsync -avP ripoll@jed.hpc.epfl.ch:/work/enac-it4r/ghsl/ghsl-512.pmtiles ~/ghsl-512.pmtiles

sudo mkdir -p /mnt/urbes-nas
sudo mount.cifs //enac-nas1.rcp.epfl.ch/fts-enac-it /mnt/urbes-nas \
  -o "username=<epfl-user>,domain=INTRANET,uid=$(id -u),gid=$(id -g),file_mode=0664,dir_mode=0775"
ls /mnt/urbes-nas/urbes-viz.epfl.ch/ghsl*.pmtiles   # ghsl-512.pmtiles must not exist yet
rsync -v --progress ~/ghsl-512.pmtiles /mnt/urbes-nas/urbes-viz.epfl.ch/
sudo umount /mnt/urbes-nas
```

Then make sure that the file is online and immutable:

```bash
curl -sI https://urbes-viz.epfl.ch/geodata/ghsl-512.pmtiles | grep -i -E "^HTTP|cache-control|content-length"
# HTTP/2 200, cache-control: public, max-age=31536000, immutable
```

### 6. Switch the frontend

The frontend of branch `feat/ghsl-512-tiles` already reads `ghsl-512.pmtiles`:

- `frontend/src/config/basemap.ts`: source `ghsl-urban`, `tileSize: 512`, `maxzoom: 12`.
- `frontend/src/lib/pmtilesClient.ts`: `GHSL_LIVE_URL` and `GHSL_LOW_MAX_ZOOM = 4`.

The zoom levels 0 to 4 ship with the app in `frontend/public/ghsl-low-512/`. On the branch,
these tiles are made from the old 256 px tiles (4 tiles joined in one). After the upload,
extract the real ones from the new archive and commit them:

```bash
cd frontend
npm run extract:ghsl-low
git add public/ghsl-low-512
git commit -m "chore(ghsl): bundled low zooms from ghsl-512.pmtiles"
```

The script refuses an archive with tiles that are not 512 px. It also takes another URL or a
local file: `npm run extract:ghsl-low -- /path/to/ghsl-512.pmtiles`.

Open the app on the branch. The globe must look the same as on prod. At map zoom 5 and
more, the network tab shows range requests on `ghsl-512.pmtiles`. Then land the branch.

If you rebuild one day with another tile size, use new names again: a new archive name, and a
new bundled folder (`ghsl-low-<size>/`), because nginx also serves the bundled tiles as
immutable.

### 7. Clean up

When prod runs the new version with no problem for some days:

```bash
# on Jed
rm -rf /scratch/ripoll/ghsl/tiles_512 /scratch/ripoll/ghsl/ghsl-512.pmtiles
# on your laptop, only if you used the laptop upload
rm ~/ghsl-512.pmtiles
```

Keep `/work/enac-it4r/ghsl/ghsl-512.pmtiles` as the backup. Keep `ghsl.pmtiles` on the NAS
until then, so you can go back.

## Build on ENACIT4R-CUDA (fallback)

The `Makefile` runs the same pipeline on one machine, ENACIT4R-CUDA. It is slower: zoom 12
runs as one job on 14 cores, for several hours. Use it if Jed is not available.

You need GDAL (`gdaldem`, `gdal2tiles.py`), `python3` and the `pmtiles` binary:

```bash
# the asset name has the version in it, see github.com/protomaps/go-pmtiles/releases
wget https://github.com/protomaps/go-pmtiles/releases/download/v1.31.2/go-pmtiles_1.31.2_Linux_x86_64.tar.gz
tar xzf go-pmtiles_1.31.2_Linux_x86_64.tar.gz pmtiles && sudo mv pmtiles /usr/local/bin/
```

The `Makefile` reads and writes in `GEODATA` (default `/mnt/nvme/urbes-globe-viz/geodata`).
To use another folder, add `GEODATA=/other/folder` to each `make` command. Keep at least
60 GB free: the tiles, the MBTiles file and the PMTiles file are each about 15 GB.

Run this in tmux, in this folder of a checkout of the branch:

```bash
diff ghsl_colors.txt /mnt/nvme/urbes-globe-viz/geodata/ghsl_colors.txt   # must be the same
make vrt            # RGBA VRT, instant (GDAL 3.8.4 segfaults at the end, harmless)
make tiles-low      # zoom 0-7, average resampling, about 30 min. Look at some tiles first.
make tiles-high     # zoom 8-12, near resampling, several hours
make postprocess    # deletes tiles < 500 B (MIN_BYTES)
make pmtiles        # pack_mbtiles.py, then pmtiles convert, then pmtiles show
```

At 512 px, the smallest WebP is about 580 B, so `make postprocess` deletes almost nothing.
It stays for the same behavior as the 256 px build. The frontend shows a missing tile as
transparent, which looks the same as the ocean.

`pmtiles convert` only reads an `.mbtiles` file, not a tile folder. This is why
`make pmtiles` packs the folder first with `pack_mbtiles.py`.

The result is `/mnt/nvme/urbes-globe-viz/geodata/ghsl-512.pmtiles`. Then follow steps 5 to 7
above, with this file in place of the one on Jed. `make clean` deletes the 512 px tiles and
archives on CUDA, not `ghsl.pmtiles`.
