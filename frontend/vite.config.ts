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
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
