import ru from "./ru.json" with { type: "json" };
import en from "./en.json" with { type: "json" };

type Catalog = Record<string, unknown>;
const CATALOGS: Record<string, Catalog> = { ru, en };

let currentLocale: string = "ru";

export function setLocale(locale: string): void {
  if (!CATALOGS[locale]) {
    throw new Error(
      `Unknown locale: ${locale}. Available: ${Object.keys(CATALOGS).join(", ")}`
    );
  }
  currentLocale = locale;
}

export function getLocale(): string {
  return currentLocale;
}

function lookup(catalog: Catalog, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = catalog;
  for (const part of parts) {
    if (node && typeof node === "object" && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const catalog = CATALOGS[currentLocale] ?? CATALOGS["en"]!;
  let str = lookup(catalog, key);
  if (str === undefined) {
    const fallback = CATALOGS["en"]!;
    str = lookup(fallback, key) ?? key;
  }
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.replaceAll(`{${name}}`, String(value));
    }
  }
  return str;
}
