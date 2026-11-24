import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from "vue";
import maplibregl, {
  type FlyToOptions,
  type LngLatLike,
  type Map,
  type PaddingOptions,
  type RasterTileSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  prefetchGhslTiles,
  registerProtocols,
  type TileCoord,
} from "@/lib/pmtilesClient";
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

/** Where a flight lands. Fields left out keep the current camera value. */
export interface PrefetchCamera {
  center?: LngLatLike;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  padding?: number | Partial<PaddingOptions>;
}

// The part of MapLibre's internal transform we use for the prefetch. Typed
// here because `Map.transform` is typed read-only and has no `clone()` in the
// public types.
interface CameraTransform {
  clone(): CameraTransform;
  center: maplibregl.LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
  padding: PaddingOptions;
  setCenter(center: maplibregl.LngLat): void;
  setZoom(zoom: number): void;
  setBearing(bearing: number): void;
  setPitch(pitch: number): void;
  setPadding(padding: PaddingOptions): void;
}

const GHSL_SOURCE_ID = "ghsl-urban";

/**
 * Creates a non-interactive MapLibre instance in `container` containing only
 * the GHSL + OSM-buildings basemap. Meant to sit behind an interactive overlay
 * map; `syncFrom(overlay)` copies the overlay camera to this basemap on each
 * overlay frame, so the two canvases stay in lockstep.
 *
 * The composable returns `ready` once the style has loaded and `syncFrom` is
 * safe to call, and `painted` once a frame shows every GHSL tile of the view.
 * Cleanup runs in `onBeforeUnmount`.
 */
export function useGhslBasemap(
  container: Ref<HTMLDivElement | null>,
  options: GhslBasemapOptions,
) {
  // shallowRef: a deep ref would wrap the MapLibre instance (and everything
  // it touches while it renders) in reactive proxies.
  const map = shallowRef<Map | null>(null);
  const ready = ref(false);
  const painted = ref(false);

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

      // First frame with every GHSL tile of the view. Not the first `idle`:
      // `idle` also waits for the symbol placement fade (`fadeDuration`, 500 ms
      // after the last tile), which changes nothing on this raster.
      const onRender = () => {
        if (!instance.getSource(GHSL_SOURCE_ID)) return;
        if (!instance.isSourceLoaded(GHSL_SOURCE_ID)) return;
        instance.off("render", onRender);
        painted.value = true;
      };
      instance.on("render", onRender);

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

  /**
   * Starts loading the GHSL tiles this basemap will show at `camera`, so they
   * are ready when a flight lands there. Returns a function that cancels the
   * loads still running.
   *
   * The tile list comes from MapLibre itself: we clone the basemap transform
   * (same size, padding and projection, globe or mercator), move the clone to
   * `camera` and run `Map.prototype.coveringTiles` on it with the options the
   * source's TileManager uses. This touches internals (`transform.clone()` and
   * the setters, and `coveringTiles` only reading `this.transform`), checked
   * on MapLibre 5.16. If they change, the catch below skips the prefetch and
   * the map loads its tiles as before.
   */
  function prefetchView(camera: PrefetchCamera): () => void {
    const target = map.value;
    const noop = () => {};
    if (!target) return noop;
    try {
      const source = target.getSource(GHSL_SOURCE_ID) as
        | RasterTileSource
        | undefined;
      if (!source) return noop;
      const transform = (
        target.transform as unknown as CameraTransform
      ).clone();
      if (typeof camera.padding === "number") {
        const p = camera.padding;
        transform.setPadding({ top: p, right: p, bottom: p, left: p });
      } else if (camera.padding) {
        transform.setPadding({ ...transform.padding, ...camera.padding });
      }
      if (camera.bearing !== undefined) transform.setBearing(camera.bearing);
      if (camera.pitch !== undefined) transform.setPitch(camera.pitch);
      if (camera.zoom !== undefined) transform.setZoom(camera.zoom);
      if (camera.center !== undefined) {
        transform.setCenter(maplibregl.LngLat.convert(camera.center));
      }
      const ids = maplibregl.Map.prototype.coveringTiles.call(
        { transform } as unknown as Map,
        {
          tileSize: source.tileSize,
          minzoom: source.minzoom,
          maxzoom: source.maxzoom,
          roundZoom: source.roundZoom,
        },
      );
      // Already sorted from the camera outwards. Drop the world copies.
      const seen = new Set<string>();
      const tiles: TileCoord[] = [];
      for (const id of ids) {
        const { z, x, y } = id.canonical;
        const key = `${z}/${x}/${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tiles.push({ z, x, y });
      }
      return prefetchGhslTiles(tiles);
    } catch (error) {
      console.warn("GHSL prefetch skipped:", error);
      return noop;
    }
  }

  onBeforeUnmount(() => {
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
  });

  return { map, ready, painted, syncFrom, prefetchView };
}

/**
 * `flyTo` on an overlay map that also prefetches the basemap tiles of the
 * destination. One per overlay map: a new flight replaces the prefetch of the
 * previous one (tiles both need keep loading). A flight that ends away from its
 * destination (stopped by a new flight or by the user) cancels its own
 * prefetch. A flight that lands keeps it, since MapLibre is now waiting on
 * those same loads.
 */
export function useFlightPrefetch(
  getBasemap: () =>
    | { prefetchView(camera: PrefetchCamera): () => void }
    | null
    | undefined,
) {
  let cancelCurrent: (() => void) | null = null;

  function cancel() {
    cancelCurrent?.();
    cancelCurrent = null;
  }

  function flyTo(map: Map, options: FlyToOptions) {
    // Claim the new tiles first, then release the old ones, so the tiles both
    // views share are not cancelled.
    const cancelOwn = getBasemap()?.prefetchView(options) ?? null;
    cancel();
    cancelCurrent = cancelOwn;
    map.flyTo(options);
    map.once("moveend", () => {
      // Checked a bit later: when a flight is stopped to start a new one
      // (map.stop() fires moveend at once), the new flyTo comes right after in
      // the same task and takes over this prefetch with the shared tiles.
      queueMicrotask(() => {
        if (!cancelOwn || cancelCurrent !== cancelOwn) return;
        if (!isAt(map, options)) cancel();
      });
    });
  }

  onBeforeUnmount(cancel);

  return { flyTo, cancel };
}

// Is the map camera at the destination of `options` (zoom, and center within
// one pixel)?
function isAt(map: Map, options: FlyToOptions): boolean {
  if (
    options.zoom !== undefined &&
    Math.abs(map.getZoom() - options.zoom) > 0.01
  ) {
    return false;
  }
  if (options.center === undefined) return true;
  const p = map.project(options.center);
  const c = map.project(map.getCenter());
  return Math.hypot(p.x - c.x, p.y - c.y) < 1;
}
