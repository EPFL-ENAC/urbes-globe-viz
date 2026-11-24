#!/bin/bash
#SBATCH --job-name=ghsl512_upload
#SBATCH --cpus-per-task=1
#SBATCH --mem=2G
#SBATCH --time=02:00:00
#SBATCH --account=enac-it4r
#SBATCH --partition=standard
#SBATCH --output=/work/enac-it4r/ghsl/logs/512_upload_nas.log

# Upload ghsl-512.pmtiles from /work to the NAS folder that nginx serves at
# https://urbes-viz.epfl.ch/geodata/. Run after 04_pack_upload.sbatch.
#
# Needs the Python package smbprotocol (`import smbclient`) and your EPFL
# password in ~/.smbpassword (chmod 600). This is how ghsl.pmtiles was
# uploaded in March 2026.
#
# The job refuses to replace a file that exists on the NAS: nginx serves
# ghsl*.pmtiles as immutable for one year, so a new archive needs a new name.
# It writes to <name>.part first and renames it after a size check, so the
# final name never points to a half-written file.

NAME=ghsl-512.pmtiles
SRC=/work/enac-it4r/ghsl/$NAME

echo "=== Uploading $NAME to the NAS ==="
echo "Start: $(date)"

python3 - "$SRC" "$NAME" << 'PYEOF'
import os
import sys
import time

import smbclient

src, name = sys.argv[1], sys.argv[2]
folder = r"\\enac-nas1.rcp.epfl.ch\fts-enac-it\urbes-viz.epfl.ch"
dst = folder + "\\" + name
part = dst + ".part"

smbclient.ClientConfig(
    username="ripoll",
    password=open(os.path.expanduser("~/.smbpassword")).read().strip(),
)

if smbclient.path.exists(dst):
    sys.exit(f"{dst} exists already. Use a new name, do not replace it.")

total = os.path.getsize(src)
written = 0
chunk = 4 * 1024 * 1024
t0 = time.time()
last = 0.0

with open(src, "rb") as fin, smbclient.open_file(part, mode="wb") as fout:
    while True:
        data = fin.read(chunk)
        if not data:
            break
        fout.write(data)
        written += len(data)
        now = time.time()
        if now - last > 30 or written == total:
            last = now
            rate = written / (now - t0)
            eta = (total - written) / rate if rate else 0
            print(
                f"  {written / 2**30:.2f} / {total / 2**30:.2f} GB "
                f"({written / total * 100:.1f}%)  {rate / 2**20:.1f} MB/s  "
                f"ETA {eta / 60:.1f} min",
                flush=True,
            )

remote = smbclient.stat(part).st_size
if remote != total:
    sys.exit(f"Size mismatch: local {total} B, NAS {remote} B. Kept {part}.")

smbclient.rename(part, dst)
print(f"Done: {total / 2**30:.2f} GB uploaded to {dst}")
PYEOF

echo "Finished: $(date)"
echo "Check: curl -sI https://urbes-viz.epfl.ch/geodata/$NAME"
