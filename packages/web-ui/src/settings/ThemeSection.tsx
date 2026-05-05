/**
 * Settings → Theme section.
 *
 * Three-way toggle: light / dark / auto (follow system). Persisted in
 * localStorage under 'brikko-theme'. Auto mode subscribes to
 * `matchMedia('(prefers-color-scheme: dark)')` to react when the OS
 * theme flips. Applies by toggling `document.documentElement.classList`
 * with the 'dark' class — CSS variables in styles.css scope on `:root.dark`.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/index.js";

type ThemeChoice = "light" | "dark" | "auto";

const STORAGE_KEY = "brikko-theme";

function readStored(): ThemeChoice {
  if (typeof localStorage === "undefined") return "auto";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "auto") return raw;
  return "auto";
}

function applyTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  let darkActive: boolean;
  if (choice === "auto") {
    darkActive =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  } else {
    darkActive = choice === "dark";
  }
  document.documentElement.classList.toggle("dark", darkActive);
}

export function ThemeSection(): JSX.Element {
  const t = useTranslation();
  const [theme, setTheme] = useState<ThemeChoice>(() => readStored());

  useEffect(() => {
    applyTheme(theme);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, theme);
    }
    if (theme !== "auto" || typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (): void => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <section className="settings-section" data-testid="theme-section">
      <h2>{t("settings.theme.title")}</h2>
      <div className="theme-options">
        {(["light", "dark", "auto"] as const).map((opt) => (
          <label key={opt}>
            <input
              type="radio"
              name="theme"
              value={opt}
              checked={theme === opt}
              onChange={() => setTheme(opt)}
              data-testid={`theme-${opt}`}
            />
            <span>{t(`settings.theme.${opt}`)}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
