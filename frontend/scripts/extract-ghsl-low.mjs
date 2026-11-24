/**
 * Extracts the z0–z4 GHSL tiles (512 px) from the deployed ghsl-512.pmtiles
 * archive into `public/ghsl-low-512/{z}/{x}/{y}.webp`. These ship with the app
 * so the globe paints at once on first load, and serve as coarse fallbacks
 * while sharper remote tiles load (see `src/lib/pmtilesClient.ts`, the
 * "ghsl://" protocol behind the "ghsl-urban" source).
 *
 * The archive omits tiles that were < 500 B (ocean / empty areas — see
 * processing/ghsl_to_pmtiles/Makefile). For those we write a shared fully
 * transparent placeholder so coverage is complete and the map never 404s;
 * the transparent pixels let the basemap's #010101 background show through,
 * which is visually identical to GHSL ocean.
 *
 * The folder name carries the tile size on purpose: nginx serves these files
 * as immutable for one year, so new tiles need a new URL. If you rebuild with
 * another tile size, change OUT_DIR here and the path in pmtilesClient.ts.
 *
 * Re-run this after rebuilding/uploading the GHSL archive:
 *   npm run extract:ghsl-low
 *   npm run extract:ghsl-low -- <other archive URL or local .pmtiles path>
 */
import { mkdir, open, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FetchSource, PMTiles } from "pmtiles";
import sharp from "sharp";

const GHSL_URL =
  process.argv[2] ?? "https://urbes-viz.epfl.ch/geodata/ghsl-512.pmtiles";
const TILE_SIZE = 512;
const MAX_ZOOM = 4;
const CONCURRENCY = 8;
const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "ghsl-low-512",
);

// Reads byte ranges from a local .pmtiles file (for a test archive).
class FileSource {
  constructor(path) {
    this.path = path;
  }
  getKey() {
    return this.path;
  }
  async getBytes(offset, length) {
    const handle = await open(this.path, "r");
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, offset);
      const data = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + bytesRead,
      );
      return { data };
    } finally {
      await handle.close();
    }
  }
}

const source = /^https?:\/\//.test(GHSL_URL)
  ? new FetchSource(GHSL_URL)
  : new FileSource(GHSL_URL);
const pmtiles = new PMTiles(source);

const header = await pmtiles.getHeader();
const metadata = await pmtiles.getMetadata().catch(() => ({}));
console.log(
  `Archive ${GHSL_URL}: z${header.minZoom}-${header.maxZoom}, ` +
    `${header.numAddressedTiles} tiles, metadata ${JSON.stringify(metadata)}`,
);

// Refuse an archive with the wrong tile size: 256 px tiles in a 512 px folder
// would show the globe at half its size.
const probe = await pmtiles.getZxy(0, 0, 0);
if (probe?.data?.byteLength) {
  const { width } = await sharp(Buffer.from(probe.data)).metadata();
  if (width !== TILE_SIZE) {
    throw new Error(
      `Tile 0/0/0 is ${width} px, expected ${TILE_SIZE} px. Wrong archive?`,
    );
  }
}

const transparentTile = await sharp({
  create: {
    width: TILE_SIZE,
    height: TILE_SIZE,
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

// Start from an empty folder, so no tile of an older run stays behind.
await rm(OUT_DIR, { recursive: true, force: true });

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
