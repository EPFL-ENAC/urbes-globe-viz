import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from "vue";
import maplibregl, { type Map, type PaddingOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { registerProtocols } from "@/lib/pmtilesClient";
import { basemapSources, basemapLayers, basemapSky } from "@/config/basemap";

export interface GhslBasemapOptions {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  minZoom?: number;
  maxZoom?: number;
  projection?: "globe" | "mercator";
  /**
   * Padding applied via `map.setPadding`. Must match the overlay map's padding
   * exactly — padding shifts the camera's center-of-projection, so any
   * mismatch causes the two canvases to render the scene at different screen
   * positions.
   */
  padding?: Partial<PaddingOptions>;
}

/**
 * Creates a non-interactive MapLibre instance in `container` containing only
 * the GHSL + OSM-buildings basemap. Meant to sit behind an interactive overlay
 * map; `syncFrom(overlay)` copies the overlay camera to this basemap on each
 * overlay frame, so the two canvases stay in lockstep.
 *
 * The composable returns `ready` once the style has loaded and `syncFrom` is
 * safe to call. Cleanup runs in `onBeforeUnmount`.
 */
export function useGhslBasemap(
  container: Ref<HTMLDivElement | null>,
  options: GhslBasemapOptions,
) {
  // shallowRef: a deep ref would wrap the MapLibre instance (and everything
  // it touches while it renders) in reactive proxies.
  const map = shallowRef<Map | null>(null);
  const ready = ref(false);

  registerProtocols();

  watch(
    container,
    (el) => {
      if (!el || map.value) return;

      const instance = new maplibregl.Map({
        container: el,
        style: {
          version: 8,
          ...(options.projection
            ? { projection: { type: options.projection } }
            : {}),
          // Keeps the space around the globe transparent so the page's
          // --color-map-bg reads as the ground. See basemapSky.
          sky: { ...basemapSky },
          sources: { ...basemapSources },
          layers: [...basemapLayers],
        },
        center: options.center,
        zoom: options.zoom,
        pitch: options.pitch ?? 0,
        bearing: options.bearing ?? 0,
        minZoom: options.minZoom,
        maxZoom: options.maxZoom,
        interactive: false,
        attributionControl: false,
        refreshExpiredTiles: false,
        fadeDuration: 500,
        renderWorldCopies: false,
        // Retain up to 8 zoom levels of off-view tiles (default 5) so fast
        // zoom-out / re-zoom reuses cached textures instead of refetching.
        maxTileCacheZoomLevels: 8,
      });

      if (options.padding) {
        instance.setPadding(options.padding as PaddingOptions);
      }

      instance.on("load", () => {
        ready.value = true;
      });

      map.value = instance;
    },
    { immediate: true, flush: "post" },
  );

  /**
   * Mirror the camera of `other` onto this basemap. Call after both maps have
   * been constructed. Returns an unsubscribe fn.
   *
   * We follow `render`, not `move`. Each map draws in its own animation frame
   * callback, so with `move` the basemap could draw one frame before or after
   * the overlay, depending on which callback ran first (during the idle spin
   * it was one frame late on every frame). On `render` the overlay has just
   * drawn: we set the same camera here and `redraw()` at once, so both canvases
   * show the same camera in the same browser frame.
   */
  function syncFrom(other: Map): () => void {
    const target = map.value;
    if (!target) return () => {};

    let lastKey = "";
    // Copy the camera if it changed. Returns true when it did.
    const apply = (): boolean => {
      const center = other.getCenter();
      const padding = other.getPadding();
      const zoom = other.getZoom();
      const bearing = other.getBearing();
      const pitch = other.getPitch();
      const key = [
        center.lng,
        center.lat,
        zoom,
        bearing,
        pitch,
        padding.top,
        padding.right,
        padding.bottom,
        padding.left,
      ].join(",");
      if (key === lastKey) return false;
      lastKey = key;
      target.jumpTo({ center, zoom, bearing, pitch, padding });
      return true;
    };

    // Seed the camera immediately so the first paint is aligned.
    apply();

    const onRender = () => {
      if (apply()) target.redraw();
    };
    other.on("render", onRender);

    return () => {
      other.off("render", onRender);
    };
  }

  onBeforeUnmount(() => {
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
  });

  return { map, ready, syncFrom };
}
