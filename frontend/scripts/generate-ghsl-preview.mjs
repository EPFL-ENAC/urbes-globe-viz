// Extracts a low-zoom sub-pyramid (z=0..maxZoom) of the published ghsl.pmtiles
// into frontend/public/ghsl-low.pmtiles using the `go-pmtiles` CLI. The output
// is a single small PMTiles archive (~1 MB at maxZoom=4) that the browser
// loads same-origin via the existing pmtiles protocol — same shader as the
// live ghsl-layer, so the visual result at z=0..maxZoom is bit-for-bit
// identical to the live raster but without the slow NAS round-trips.
//
// At runtime, basemap.ts hands off to the live ghsl.pmtiles at zoom
// (maxZoom + 1).
//
// Usage:  node scripts/generate-ghsl-preview.mjs [maxZoom]
//   maxZoom defaults to 4
//
// Requires the `go-pmtiles` binary in PATH or at $HOME/go/bin/go-pmtiles
// (install with: `go install github.com/protomaps/go-pmtiles@latest`).

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const URL = "https://urbes-viz.epfl.ch/geodata/ghsl.pmtiles";
const OUT = "public/ghsl-low.pmtiles";

const maxZoom = Number(process.argv[2] ?? 4);
if (!Number.isInteger(maxZoom) || maxZoom < 0 || maxZoom > 7) {
  console.error(`maxZoom must be an integer 0–7 (got ${process.argv[2]})`);
  process.exit(1);
}

function findBinary() {
  const candidates = [
    "go-pmtiles",
    "pmtiles",
    join(homedir(), "go", "bin", "go-pmtiles"),
  ];
  for (const c of candidates) {
    try {
      execFileSync(c, ["--help"], { stdio: "pipe" });
      return c;
    } catch {
      // try next
    }
  }
  console.error(
    "go-pmtiles not found. Install with:\n" +
      "  go install github.com/protomaps/go-pmtiles@latest",
  );
  process.exit(1);
}

const bin = findBinary();
console.log(`using ${bin}`);
console.log(`extracting z=0..${maxZoom} from ${URL}`);
console.log(`→ ${OUT}`);

execFileSync(bin, ["extract", URL, OUT, `--maxzoom=${maxZoom}`], {
  stdio: "inherit",
});

if (!existsSync(OUT)) {
  console.error("extract finished but output file is missing");
  process.exit(1);
}
const size = statSync(OUT).size;
console.log(`done — ${OUT} (${(size / 1024).toFixed(0)} KB)`);
