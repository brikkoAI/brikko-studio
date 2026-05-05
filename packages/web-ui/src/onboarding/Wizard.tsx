import { useTranslation } from "../i18n/index.js";

export function Wizard() {
  const t = useTranslation();
  return (
    <div className="page" data-testid="onboarding-placeholder">
      <h1>{t("onboarding.step1.title")}</h1>
      <p className="muted">— Task 27 —</p>
    </div>
  );
}
