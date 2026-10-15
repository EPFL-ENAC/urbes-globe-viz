import { defineStore } from "pinia";
import { computed, ref, watch, type App } from "vue";
import { Dark } from "quasar";

export type ThemeMode = "light" | "dark";
export type ThemeOverride = ThemeMode | null;

const STORAGE_KEY = "urbes:theme";
// Without an explicit choice we follow the OS setting (`prefers-color-scheme`),
// live. Light "paper" stays the fallback when the browser gives no answer.
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readSystem(): ThemeMode {
  try {
    return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readOverride(): ThemeOverride {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : null;
  } catch {
    return null;
  }
}

export const useThemeStore = defineStore("theme", () => {
  const override = ref<ThemeOverride>(readOverride());
  const system = ref<ThemeMode>(readSystem());

  try {
    window.matchMedia(DARK_QUERY).addEventListener("change", (e) => {
      system.value = e.matches ? "dark" : "light";
    });
  } catch {
    // no matchMedia, keep the fallback
  }

  const mode = computed<ThemeMode>(() => override.value ?? system.value);

  function set(next: ThemeMode) {
    override.value = next;
  }

  function clearOverride() {
    override.value = null;
  }

  // Toggling back to the OS value drops the override, so the site follows the
  // OS again instead of staying stuck on a stored choice.
  function toggle() {
    const next: ThemeMode = mode.value === "dark" ? "light" : "dark";
    override.value = next === system.value ? null : next;
  }

  // Persist override changes.
  watch(override, (next) => {
    try {
      if (next === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  });

  return { override, system, mode, set, clearOverride, toggle };
});

/**
 * Wire the theme store to `<html data-theme="...">` and Quasar's Dark plugin.
 * Must run after Pinia is installed on the app so the store is usable.
 */
export function installTheme(_app: App) {
  const store = useThemeStore();

  const apply = (m: ThemeMode) => {
    document.documentElement.setAttribute("data-theme", m);
    Dark.set(m === "dark");
  };

  apply(store.mode);
  watch(
    () => store.mode,
    (m) => apply(m),
  );
}
