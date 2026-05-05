/**
 * Onboarding Step 1 — Welcome screen.
 *
 * The /welcome route in M0 served as the auth landing; here Step 1 is the
 * first slide *inside* the wizard (post-auth) so the user can re-enter the
 * flow from /onboarding without going through OAuth again.
 */
import { useTranslation } from "../i18n/index.js";

export function Step1Welcome({ onNext }: { onNext: () => void }): JSX.Element {
  const t = useTranslation();
  return (
    <div data-testid="step-1" className="onboarding-step">
      <h2 className="onboarding-step-title">{t("onboarding.step1.title")}</h2>
      <p className="onboarding-step-body">{t("onboarding.step1.body")}</p>
      <div className="onboarding-actions onboarding-actions-end">
        <button
          type="button"
          className="primary onboarding-cta"
          onClick={onNext}
          data-testid="step-1-next"
        >
          {t("onboarding.step1.next")}
        </button>
      </div>
    </div>
  );
}
