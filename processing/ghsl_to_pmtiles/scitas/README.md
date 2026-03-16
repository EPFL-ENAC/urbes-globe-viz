# GHSL Processing on SCITAS Jed

Generates ~5.4M WebP tiles from the GHSL Built Surface dataset and packages them
into a single `ghsl.pmtiles` file served via HTTP range requests from CDN.

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
01_z0-8.sbatch        ~5 min    1 job         zoom 0-8  — global, ~87K tiles
02_z9-12.sbatch       ~1-2h     16 jobs       zoom 9-12 — 16 lon strips, ~1.5M tiles
03_z13.sbatch         ~2-4h     16 jobs       zoom 13   — 16 lon strips, ~3.8M tiles
04_pack_upload.sbatch ~30 min   1 job         filter + pack + convert + upload
```

```bash
cd /work/enac-it4r/ghsl

sbatch scitas/01_z0-8.sbatch

# After 01 finishes — submit 02 and 03 in parallel:
sbatch scitas/02_z9-12.sbatch
sbatch scitas/03_z13.sbatch

# After both 02 and 03 finish:
sbatch scitas/04_pack_upload.sbatch
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
are no write conflicts when all jobs rsync to the same `$SCRATCH/tiles/` directory.

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

If strip 9 times out during `02_z9-12.sbatch`, split it into 8 sub-jobs using
the pattern in `02_z9-12.sbatch` with a tighter lon range and `--time=01:00:00`.

---

## Actual run stats (March 2026)

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
for z in 0 1 2 3 4 5 6 7 8 9 10 11 12 13; do
  count=$(find /scratch/ripoll/ghsl/tiles/$z -name "*.webp" 2>/dev/null | wc -l)
  echo "zoom $z: $count tiles"
done

# Expected roughly:
# zoom 0-3:  <100 tiles each
# zoom 4-8:  hundreds to tens of thousands
# zoom 9:    ~25K, zoom 10: ~80K, zoom 11: ~250K, zoom 12: ~700K
# zoom 13:   ~3.8M
```
