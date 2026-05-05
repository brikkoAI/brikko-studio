/**
 * Minimal i18n: pick locale from `navigator.language` (fallback `ru`).
 * No external lib — JSON catalog + flat keys + interpolation later if needed.
 *
 * Why custom: the catalog is ~100 keys; pulling in i18next (~80kB) is overkill
 * for an offline desktop tool. If we add pluralization later, swap to FormatJS.
 */
import ru from "./ru.json";
import en from "./en.json";

type Catalog = Record<string, string>;

const CATALOGS: Record<string, Catalog> = { ru, en };

function detectLocale(): "ru" | "en" {
  if (typeof navigator === "undefined") return "ru";
  const lang = (navigator.language || "ru").toLowerCase();
  if (lang.startsWith("en")) return "en";
  return "ru";
}

let currentLocale: "ru" | "en" = detectLocale();

export function setLocale(loc: "ru" | "en"): void {
  currentLocale = loc;
}

export function getLocale(): "ru" | "en" {
  return currentLocale;
}

/**
 * Translate a key. Returns the key itself if not found (visible during dev).
 */
export function t(key: string): string {
  const cat = CATALOGS[currentLocale] ?? CATALOGS["ru"]!;
  return cat[key] ?? key;
}

/**
 * Hook form for components. Returns a stable reference to `t` per render.
 * Locale changes are uncommon (settings page), so we don't subscribe.
 */
export function useTranslation(): (key: string) => string {
  return t;
}
