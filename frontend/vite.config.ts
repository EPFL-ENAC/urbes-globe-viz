import { createReadStream, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import vue from "@vitejs/plugin-vue";
import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import path from "path";

// Vite's dev server marks everything in public/ as no-cache, so a refresh
// revalidates all ~60 basemap tiles and the globe visibly repaints. The tiles
// are content-stable (regenerated only when the GHSL archive is rebuilt), so
// serve them immutable in dev too — matching nginx.conf in production.
const ghslLowImmutableCache: PluginOption = {
  name: "ghsl-low-immutable-cache",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith("/ghsl-low/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
      next();
    });
  },
};

// Dev only: serve freshly baked files before they are uploaded. A request to
// /geodata/<name> is answered from processing/aldo_netcdf/out/<name> when that
// file exists, else it falls through to public/geodata (shared by all
// checkouts, never written to). Range requests are supported, COGs need them.
const BAKED_DIR = path.resolve(__dirname, "../processing/aldo_netcdf/out");
const bakedGeodata: PluginOption = {
  name: "baked-geodata",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const match = req.url?.match(/^\/geodata\/([\w.-]+)(?:\?.*)?$/);
      if (!match) return next();
      const file = path.join(BAKED_DIR, match[1]!);
      let size: number;
      try {
        size = statSync(file).size;
      } catch {
        return next();
      }
      const type = file.endsWith(".json")
        ? "application/json"
        : file.endsWith(".tif")
          ? "image/tiff"
          : "application/octet-stream";
      res.setHeader("Content-Type", type);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "no-cache");
      const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
      if (range && (range[1] || range[2])) {
        const start = range[1]
          ? Number(range[1])
          : Math.max(0, size - Number(range[2]));
        const end =
          range[1] && range[2]
            ? Math.min(Number(range[2]), size - 1)
            : size - 1;
        if (start >= size || start > end) {
          res.statusCode = 416;
          res.setHeader("Content-Range", `bytes */${size}`);
          return res.end();
        }
        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
        res.setHeader("Content-Length", end - start + 1);
        createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.setHeader("Content-Length", size);
      createReadStream(file).pipe(res);
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    quasar({
      sassVariables: fileURLToPath(
        new URL("./src/quasar-variables.sass", import.meta.url),
      ),
    }),
    ghslLowImmutableCache,
    bakedGeodata,
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // wtx gives each worktree its own port. The main checkout keeps 5173.
  server: {
    port: Number(process.env.FRONTEND_PORT) || 5173,
    strictPort: !!process.env.FRONTEND_PORT,
  },
});
