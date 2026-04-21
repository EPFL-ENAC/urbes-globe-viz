import { onBeforeUnmount, ref, watch, type Ref } from "vue";
import maplibregl, { type Map, type PaddingOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { pmtilesProtocol } from "@/lib/pmtilesClient";
import { basemapSources, basemapLayers } from "@/config/basemap";

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

let protocolRegistered = false;
function ensureProtocol() {
  if (protocolRegistered) return;
  try {
    maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
    protocolRegistered = true;
  } catch {
    // Another call site (e.g. an overlay map) beat us to it.
    protocolRegistered = true;
  }
}

/**
 * Creates a non-interactive MapLibre instance in `container` containing only
 * the GHSL + OSM-buildings basemap. Meant to sit behind an interactive overlay
 * map; `syncFrom(overlay)` wires camera events from the overlay back to this
 * basemap so the two canvases stay in lockstep.
 *
 * The composable returns `ready` once the style has loaded and `syncFrom` is
 * safe to call. Cleanup runs in `onBeforeUnmount`.
 */
export function useGhslBasemap(
  container: Ref<HTMLDivElement | null>,
  options: GhslBasemapOptions,
) {
  const map = ref<Map | null>(null);
  const ready = ref(false);

  ensureProtocol();

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
   * Mirror camera events from `other` onto this basemap. Call after both
   * maps have been constructed. Returns an unsubscribe fn.
   */
  function syncFrom(other: Map): () => void {
    const target = map.value;
    if (!target) return () => {};

    const apply = () => {
      target.jumpTo({
        center: other.getCenter(),
        zoom: other.getZoom(),
        bearing: other.getBearing(),
        pitch: other.getPitch(),
        padding: other.getPadding(),
      });
    };

    // Seed the camera immediately so the first paint is aligned.
    apply();

    other.on("move", apply);
    other.on("zoom", apply);
    other.on("pitch", apply);
    other.on("rotate", apply);

    return () => {
      other.off("move", apply);
      other.off("zoom", apply);
      other.off("pitch", apply);
      other.off("rotate", apply);
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
