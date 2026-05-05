// Real implementation in Task 23.
import { useTranslation } from "../i18n/index.js";

export function Privacy() {
  const t = useTranslation();
  return (
    <div className="page" data-testid="privacy-placeholder">
      <h1>{t("privacy.title")}</h1>
      <p className="muted">— Task 23 —</p>
    </div>
  );
}
