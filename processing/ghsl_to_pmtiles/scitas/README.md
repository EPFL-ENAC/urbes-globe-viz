# GHSL Processing on SCITAS Jed

Generates WebP tiles from the GHSL Built Surface dataset and packages them into a
single PMTiles file served via HTTP range requests from CDN.

> **512 px tiles (November 2026).** The scripts now make 512 px tiles, zoom 0-12,
> into `$SCRATCH/tiles_512/` and `ghsl-512.pmtiles`. This is the main way to build the
> archive. The full steps, from copying the scripts to the frontend switch, are in
> [`../README.md`](../README.md). The scripts did not run at 512 px yet. The run stats
> below are from the 256 px build (`ghsl.pmtiles`, zoom 0-13).

## Cluster overview

| Resource      | Value                                                       |
| ------------- | ----------------------------------------------------------- |
| Login         | `ssh ripoll@jed.hpc.epfl.ch` (EPFL VPN required off-campus) |
| Account       | `enac-it4r` — ~CHF 0.0055/cpu/hour                          |
| Node specs    | 72 cores, 512 GB RAM, 3 TB local NVMe SSD                   |
| Max wall time | 7 days (serial QOS)                                         |

### Storage hierarchy

| Path                            | Type                  | Notes                                                                                     |
| ------------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| `$TMPDIR`                       | Local NVMe per node   | Fastest. **Auto-deleted at job end.** Use for all intermediate work.                      |
| `$SCRATCH` = `/scratch/ripoll/` | Shared GPFS all-flash | Fast for large sequential reads. Slow for millions of small files. **30-day auto-purge.** |
| `/work/enac-it4r/ghsl/`         | Shared GPFS           | Persistent. Slow writes. Use for source data and final outputs.                           |
| `$HOME`                         | Shared GPFS           | 100 GB, backed up.                                                                        |

### GDAL via Apptainer

All GDAL commands run inside the container:

```bash
GDAL="apptainer exec --bind $WORK --bind $SCRATCH --bind $TMPDIR $WORK/gdal.sif"
$GDAL gdalinfo --version
```

---

## One-time setup

Run once from the login node (~5 min for the image pull):

```bash
bash /work/enac-it4r/ghsl/setup.sh
```

Transfer source data from ENACIT4R-CUDA (run from that machine):

```bash
rsync -avP /mnt/nvme/urbes-globe-viz/geodata/ghsl_built_3857_cog.tif \
    ripoll@jed.hpc.epfl.ch:/work/enac-it4r/ghsl/
```

Then copy to `$SCRATCH` for fast access during tile generation (run on Jed):

```bash
mkdir -p /scratch/ripoll/ghsl
rsync -avP /work/enac-it4r/ghsl/ghsl_built_3857_cog.tif /scratch/ripoll/ghsl/
```

---

## Pipeline

Submit jobs in order. Jobs 02 and 03 can run in parallel.

```
01_z0-7.sbatch        1 job      zoom 0-7  — global
02_z8-11.sbatch       16 jobs    zoom 8-11 — 16 lon strips
03_z12.sbatch         16 jobs    zoom 12   — 16 lon strips
04_pack_upload.sbatch 1 job      filter + pack + convert
05_upload_nas.sbatch  1 job      copy ghsl-512.pmtiles to the NAS
```

```bash
cd /work/enac-it4r/ghsl

sbatch scitas/01_z0-7.sbatch

# After 01 finishes — submit 02 and 03 in parallel:
sbatch scitas/02_z8-11.sbatch
sbatch scitas/03_z12.sbatch

# After both 02 and 03 finish:
sbatch scitas/04_pack_upload.sbatch

# After 04 finishes:
sbatch scitas/05_upload_nas.sbatch
```

Monitor:

```bash
squeue -u ripoll                              # running/pending jobs
tail -f /work/enac-it4r/ghsl/logs/<job>.log  # live log
sausage                                       # billing usage
```

---

## How geographic strip splitting works

At global scale, a single gdal2tiles job OOMs or times out. The globe is split into
16 longitude strips (22.5° each), one SLURM array task per strip. Each job processes
its strip independently; tile X-coordinates are globally unique per strip so there
are no write conflicts when all jobs rsync to the same `$SCRATCH/tiles_512/` directory.

Strip alignment: with 16 strips (2^4), tile boundaries align perfectly at zoom ≥ 4. ✓

**Critical**: always write tiles to `$TMPDIR` (local NVMe), not directly to `$SCRATCH`.
Writing millions of small WebP files to GPFS causes jobs to stall at ~60% and never
complete. Write to local NVMe, then rsync once at the end.

---

## Key gotchas

### `-alpha` must be on the same line as `gdaldem`

```bash
# ✅ correct — -alpha is a gdaldem flag
$GDAL gdaldem color-relief input.tif colors.txt out.vrt -of VRT -alpha

# ❌ broken — -alpha on its own line is interpreted as a shell command;
#    VRT is created without alpha band → white background everywhere
$GDAL gdaldem color-relief input.tif colors.txt out.vrt -of VRT \
-alpha
```

### `ghsl_colors.txt` must have 5 columns

```
nv 255 255 255 0
0  255 255 255 0
```

4 columns silently maps the last number to Blue → blue artifacts everywhere.

### Near-empty tile threshold is 225 bytes (not 500)

WebP minimum file size is 224 bytes even for a near-transparent tile. Use
`-size -225c`. Using `-size -500c` deletes valid sparse tiles.

At 512 px the smallest WebP is about 580 bytes, so `-size -225c` deletes nothing.
`gdal2tiles -x` already skips the fully transparent tiles.

### `$SCRATCH` has a 30-day purge

Always copy the final `.pmtiles` to `/work/enac-it4r/ghsl/` for persistence.
The pack job (`04_pack_upload.sbatch`) does this automatically.

### Never run the tile-delete `find` command while generation is still running

The `find -name "*.webp" -size -225c -delete` cleanup must only run after **all**
tile generation jobs are fully complete.

### GDAL segfault after `gdaldem -of VRT`

GDAL 3.8.4 segfaults on cleanup. Harmless — the VRT is written correctly before
the crash.

### Strip 9 (lon 22.5–45°, Europe/Middle East) is the densest region

If strip 9 times out during `02_z8-11.sbatch`, split it into 8 sub-jobs using
the pattern in `02_z8-11.sbatch` with a tighter lon range and `--time=01:00:00`.

---

## Actual run stats (March 2026, 256 px build)

| Step                    | Wall time               | Result              |
| ----------------------- | ----------------------- | ------------------- |
| z0-8 (1 job)            | ~5 min                  | ~87K tiles          |
| z9-12 (16 strips)       | 30–90 min/strip         | ~1.5M tiles         |
| z13 (16 strips)         | 2–4h/strip              | ~3.8M tiles         |
| pack (1 job)            | 21 min at ~4200 tiles/s | 17 GB MBTiles       |
| pmtiles convert (1 job) | 2 min at 47K tiles/s    | **15 GB PMTiles**   |
| **Total**               |                         | **5,466,765 tiles** |

---

## Monitoring checklist before packing

```bash
# Check tile counts per zoom level
for z in 0 1 2 3 4 5 6 7 8 9 10 11 12; do
  count=$(find /scratch/ripoll/ghsl/tiles_512/$z -name "*.webp" 2>/dev/null | wc -l)
  echo "zoom $z: $count tiles"
done

# Expected roughly (512 px tile at zoom z = 4 tiles of the 256 px build at z+1,
# so about the 256 px counts of z+1 divided by 2 to 4):
# zoom 8:  ~10K, zoom 9: ~30K, zoom 10: ~100K, zoom 11: ~300K
# zoom 12: ~1-2M
```
