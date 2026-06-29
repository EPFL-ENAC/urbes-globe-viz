// Transform curated project-card source images into card-ready webp.
//
// Drop hand-picked images (any size/format) into frontend/card-images/, named
// after the project id, e.g. card-images/wrf.jpg or card-images/buildings.png.
// This script square-crops them (the card box is square, object-fit: cover) and
// writes optimized webp to public/previews/cards/<id>.webp, which ProjectCard.vue
// serves. Run it after adding or replacing a source image:
//
//   npm run card-images                 # process every source image
//   npm run card-images -- wrf          # only matching ids
//
// Source images stay committed so the output can always be regenerated.

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve, extname, basename } from "node:path";
import { readdir, mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, "../card-images");
const OUT_DIR = resolve(__dirname, "../public/previews/cards");

const SIZE = 512; // square; covers the 120px card box at high DPR with room
const QUALITY = 80;
const EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
  ".avif",
]);

const ONLY = process.argv.slice(2);

await mkdir(OUT_DIR, { recursive: true });

let files;
try {
  files = await readdir(SRC_DIR);
} catch {
  console.error(
    `No source dir at ${SRC_DIR}. Create it and drop <project-id>.<ext> images in.`,
  );
  process.exit(1);
}

const sources = files
  .filter((f) => EXTS.has(extname(f).toLowerCase()))
  .filter((f) => !ONLY.length || ONLY.includes(basename(f, extname(f))));

if (!sources.length) {
  console.error("No matching source images found.");
  process.exit(1);
}

let failures = 0;
for (const file of sources) {
  const id = basename(file, extname(file));
  try {
    await sharp(resolve(SRC_DIR, file))
      .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: QUALITY })
      .toFile(resolve(OUT_DIR, `${id}.webp`));
    console.log(`  ✓ ${id}.webp`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${file}: ${err.message}`);
  }
}

if (failures) {
  console.error(`\n${failures} image(s) failed.`);
  process.exit(1);
}
console.log("\nDone.");
