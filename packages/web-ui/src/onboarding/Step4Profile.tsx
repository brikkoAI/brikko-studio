/**
 * Onboarding Step 4 — privacy profile selection.
 *
 * Three radio cards: strict | balanced | permissive. Default = balanced
 * (matches the policy editor default in Privacy → Policy tab). On Continue
 * we PUT the choice via `savePolicy()` (existing privacy API) — keeps a
 * single source of truth so what the user picks here lights up in the
 * policy editor afterwards.
 */
import { useState } from "react";
import { savePolicy, type PolicyProfile } from "../api/privacy.js";
import { useTranslation } from "../i18n/index.js";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const PROFILES: PolicyProfile[] = ["strict", "balanced", "permissive"];

const HINTS: Record<PolicyProfile, string> = {
  strict: "Маскирует всё, включая низкочувствительные категории. Для регулируемых отраслей.",
  balanced:
    "По умолчанию. Маскирует ИНН, паспорта, телефоны, адреса, имена. Подходит большинству.",
  permissive:
    "Маскирует только высокочувствительное (паспорт, банк-карты). Для разработки и тестов.",
};

export function Step4Profile({ onNext, onBack }: Props): JSX.Element {
  const t = useTranslation();
  const [profile, setProfile] = useState<PolicyProfile>("balanced");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      await savePolicy({ profile, category_overrides: {} });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="step-4" className="onboarding-step">
      <h2 className="onboarding-step-title">{t("onboarding.step4.title")}</h2>
      <p className="onboarding-step-body">{t("onboarding.step4.body")}</p>

      <div
        className="onboarding-radio-list"
        role="radiogroup"
        aria-label={t("onboarding.step4.title")}
      >
        {PROFILES.map((p) => (
          <label
            key={p}
            data-testid={`step-4-profile-${p}`}
            className={`onboarding-radio${profile === p ? " selected" : ""}`}
          >
            <input
              type="radio"
              name="privacy-profile"
              value={p}
              checked={profile === p}
              onChange={() => setProfile(p)}
            />
            <span>
              <span className="onboarding-radio-label">
                {t(`privacy.policy.profile.${p}`)}
              </span>
              <span className="onboarding-radio-hint">{HINTS[p]}</span>
            </span>
          </label>
        ))}
      </div>

      {error !== null ? (
        <div className="error" data-testid="step-4-error">
          {error}
        </div>
      ) : null}

      <div className="onboarding-actions">
        <button
          type="button"
          className="secondary"
          onClick={onBack}
          disabled={busy}
        >
          {t("common.back")}
        </button>
        <button
          type="button"
          className="primary onboarding-cta"
          data-testid="step-4-continue"
          onClick={() => void handleContinue()}
          disabled={busy}
        >
          {busy ? t("common.loading") : t("common.next")}
        </button>
      </div>
    </div>
  );
}
