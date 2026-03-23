#!/usr/bin/env python3
"""
Pack an XYZ tile directory into an MBTiles SQLite file.

Usage:
    python3 pack_mbtiles.py <tiles_dir> <output.mbtiles> [num_readers]

MBTiles uses TMS y-ordering (y=0 at bottom), opposite of XYZ (y=0 at top).
This script applies the y-flip automatically.

No external dependencies — uses only Python stdlib.
"""

import os
import sqlite3
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

BATCH_SIZE = 50_000


def read_tile(args):
    path, z, x, y_xyz = args
    y_tms = (2**z - 1) - y_xyz
    with open(path, "rb") as fh:
        data = fh.read()
    return (z, x, y_tms, data)


def collect_tasks(tiles_dir):
    tasks = []
    for z_str in sorted((d for d in os.listdir(tiles_dir) if d.isdigit()), key=int):
        z = int(z_str)
        z_dir = os.path.join(tiles_dir, z_str)
        if not os.path.isdir(z_dir):
            continue
        for x_str in os.listdir(z_dir):
            x_dir = os.path.join(z_dir, x_str)
            if not os.path.isdir(x_dir):
                continue
            x = int(x_str)
            for fname in os.listdir(x_dir):
                y_str = fname.split(".")[0]
                if y_str.isdigit():
                    tasks.append((os.path.join(x_dir, fname), z, x, int(y_str)))
    return tasks


def pack(tiles_dir: str, output: str, num_readers: int = 16) -> None:
    print(f"Scanning tile directory: {tiles_dir}", flush=True)
    t0 = time.time()
    tasks = collect_tasks(tiles_dir)
    total_tiles = len(tasks)
    print(f"Found {total_tiles:,} tiles in {time.time()-t0:.1f}s — starting pack with {num_readers} readers", flush=True)

    conn = sqlite3.connect(output)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-131072")  # 128MB cache
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tiles (
            zoom_level  INTEGER NOT NULL,
            tile_column INTEGER NOT NULL,
            tile_row    INTEGER NOT NULL,
            tile_data   BLOB    NOT NULL,
            UNIQUE(zoom_level, tile_column, tile_row)
        );
        CREATE TABLE IF NOT EXISTS metadata (name TEXT, value TEXT);
        INSERT OR REPLACE INTO metadata VALUES ('name',    'ghsl');
        INSERT OR REPLACE INTO metadata VALUES ('format',  'webp');
        INSERT OR REPLACE INTO metadata VALUES ('type',    'overlay');
        INSERT OR REPLACE INTO metadata VALUES ('version', '1.0');
    """)

    written = 0
    batch = []
    t_start = time.time()
    t_last = t_start

    with ThreadPoolExecutor(max_workers=num_readers) as pool:
        for tile in pool.map(read_tile, tasks, chunksize=500):
            batch.append(tile)
            if len(batch) >= BATCH_SIZE:
                conn.executemany("INSERT OR REPLACE INTO tiles VALUES (?,?,?,?)", batch)
                conn.commit()
                written += len(batch)
                batch = []
                now = time.time()
                rate = written / (now - t_start)
                pct = written / total_tiles * 100
                eta = (total_tiles - written) / rate if rate > 0 else 0
                print(
                    f"  {written:>8,} / {total_tiles:,} tiles  ({pct:.1f}%)  "
                    f"{rate:.0f} tiles/s  ETA {eta/60:.1f}min",
                    flush=True,
                )
                t_last = now

    if batch:
        conn.executemany("INSERT OR REPLACE INTO tiles VALUES (?,?,?,?)", batch)
        conn.commit()
        written += len(batch)

    conn.close()
    elapsed = time.time() - t_start
    print(f"Done: {written:,} tiles → {output}  ({elapsed/60:.1f} min)", flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <tiles_dir> <output.mbtiles> [num_readers]")
        sys.exit(1)
    readers = int(sys.argv[3]) if len(sys.argv) > 3 else 16
    pack(sys.argv[1], sys.argv[2], readers)
