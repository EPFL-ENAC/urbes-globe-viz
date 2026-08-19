/**
 * Extracts the z0–z5 GHSL tiles from the deployed ghsl.pmtiles archive into
 * `public/ghsl-low/{z}/{x}/{y}.webp`. These ship with the app as an
 * always-available low-resolution floor layer so the globe paints instantly
 * on first load and overscales as a fallback while sharper remote tiles load
 * (see `src/config/basemap.ts`, source "ghsl-low").
 *
 * The archive omits tiles that were < 500 B (ocean / empty areas — see
 * processing/ghsl_to_pmtiles/Makefile). For those we write a shared fully
 * transparent placeholder so coverage is complete and the map never 404s;
 * the transparent pixels let the basemap's #010101 background show through,
 * which is visually identical to GHSL ocean.
 *
 * Re-run this after rebuilding/uploading the GHSL archive:
 *   npm run extract:ghsl-low
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PMTiles } from "pmtiles";
import sharp from "sharp";

const GHSL_URL = "https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles";
const MAX_ZOOM = 5;
const CONCURRENCY = 8;
const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "ghsl-low",
);

const transparentTile = await sharp({
  create: {
    width: 256,
    height: 256,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .webp({ lossless: true })
  .toBuffer();

const coords = [];
for (let z = 0; z <= MAX_ZOOM; z++) {
  for (let x = 0; x < 2 ** z; x++) {
    for (let y = 0; y < 2 ** z; y++) {
      coords.push([z, x, y]);
    }
  }
}

const pmtiles = new PMTiles(GHSL_URL);
let written = 0;
let placeholders = 0;
let totalBytes = 0;
let next = 0;

async function worker() {
  while (next < coords.length) {
    const [z, x, y] = coords[next++];
    const result = await pmtiles.getZxy(z, x, y);
    const bytes = result?.data?.byteLength
      ? Buffer.from(result.data)
      : transparentTile;
    if (bytes === transparentTile) placeholders++;
    const dir = join(OUT_DIR, String(z), String(x));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${y}.webp`), bytes);
    written++;
    totalBytes += bytes.byteLength;
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(
  `Wrote ${written} tiles (${placeholders} transparent placeholders), ` +
    `${(totalBytes / 1024 / 1024).toFixed(2)} MB total, to ${OUT_DIR}`,
);
