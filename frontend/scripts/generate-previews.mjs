// Generate per-project globe-preview images by screenshotting each project's
// initial map view with the basemap hidden, so the capture is the data layer
// only over a transparent background. Output:
//   public/previews/<id>.png        — one transparent image per project
//   public/previews/manifest.json   — { <id>: { camera: {center,zoom,pitch,bearing}, size } }
//
// The app cooperates via `?preview=1` (see src/utils/previewMode.ts): chrome and
// basemap are hidden, the page background is dropped, and once the map settles
// at the project's real pitch/zoom it sets `window.__previewReady = true` and
// `window.__previewCamera` to the camera pose. The hover preview flies the live
// globe to that same camera and shows this image as a screen-aligned billboard,
// so the baked-in perspective matches. Because the data colours are
// theme-independent and the basemap is gone, a single image serves both themes —
// the live globe basemap shows through the transparent areas at runtime.
//
// Requires a running app server. Point it at your dev server (default) or a
// `vite preview` build:
//   npm run dev            # in another terminal, then:
//   npm run previews
//   PREVIEW_BASE_URL=http://localhost:4173 npm run previews   # vite preview
//   npm run previews -- wrf buildings   # limit to specific project ids
//
// The DAVE flows deck.gl renderer still needs its own readiness hook and is not
// captured here.

import { chromium } from "playwright";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../public/previews");
const MANIFEST = resolve(OUT_DIR, "manifest.json");

const BASE_URL = process.env.PREVIEW_BASE_URL ?? "http://localhost:5173";

const PROJECTS = [
  "buildings",
  "roads_swiss_statistics",
  "hourly_adult_population",
  "len_other_car_roads",
  "she_sim_temporal",
  "wrf",
];

// Optional positional args limit the run to specific project ids, e.g.
//   npm run previews -- wrf      # regenerate only wrf.png (+ its manifest entry)
const ONLY = process.argv.slice(2);
const TARGETS = ONLY.length
  ? PROJECTS.filter((id) => ONLY.includes(id))
  : PROJECTS;

const CAPTURE = 1000; // logical px, square viewport
const SCALE = 2; // deviceScaleFactor -> 2000px raw capture, downsampled crisp
const OUT_SIZE = 1024; // final square png (shown large as a hover billboard)
const READY_TIMEOUT = 60_000;
const SETTLE = 600; // paint margin after tiles/network settle

/** @returns {Promise<{center:[number,number],zoom:number,pitch:number,bearing:number}>} camera */
async function capture(browser, id) {
  const context = await browser.newContext({
    viewport: { width: CAPTURE, height: CAPTURE },
    deviceScaleFactor: SCALE,
  });

  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/project/${id}?preview=1`, {
      waitUntil: "load",
    });
    await page.waitForFunction(() => window.__previewReady === true, null, {
      timeout: READY_TIMEOUT,
    });
    // Data tiles (PMTiles / COG ranges) load after the style; networkidle waits
    // for those fetches to drain before we capture.
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(SETTLE);

    const camera = await page.evaluate(() => window.__previewCamera);
    if (!camera) throw new Error("no __previewCamera reported");

    // omitBackground keeps the transparent areas transparent in the PNG.
    const png = await page.screenshot({ type: "png", omitBackground: true });
    await sharp(png)
      .resize(OUT_SIZE, OUT_SIZE, { fit: "cover" })
      .png()
      .toFile(resolve(OUT_DIR, `${id}.png`));
    console.log(`  ✓ ${id}.png`);
    return camera;
  } finally {
    await context.close();
  }
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    return {};
  }
}

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});

console.log(`Capturing previews from ${BASE_URL}`);
const manifest = await readManifest();
let failures = 0;
try {
  for (const id of TARGETS) {
    try {
      const camera = await capture(browser, id);
      // `size` = the logical-px side of the square capture viewport. The runtime
      // billboard treats the image as that many CSS px at `camera.zoom` and
      // rescales by the live zoom delta to pin it on the globe.
      manifest[id] = { camera, size: CAPTURE };
    } catch (err) {
      failures++;
      console.error(`  ✗ ${id}: ${err.message}`);
    }
  }
} finally {
  await browser.close();
}

// Merge into the existing manifest so a partial run (npm run previews -- wrf)
// keeps the other projects' entries.
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`  ✓ manifest.json (${Object.keys(manifest).length} entries)`);

if (failures) {
  console.error(`\n${failures} preview(s) failed.`);
  process.exit(1);
}
console.log("\nDone.");
