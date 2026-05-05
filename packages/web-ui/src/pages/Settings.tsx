import { useTranslation } from "../i18n/index.js";

export function Settings() {
  const t = useTranslation();
  return (
    <div className="page" data-testid="settings-placeholder">
      <h1>{t("settings.title")}</h1>
      <p className="muted">— Task 26 —</p>
    </div>
  );
}
