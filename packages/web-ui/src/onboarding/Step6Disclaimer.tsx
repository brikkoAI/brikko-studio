/**
 * Onboarding Step 6 — three-touch disclaimer (per Brikko spec §5.9).
 *
 * The user must independently affirm THREE statements before the wizard lets
 * them through. We deliberately don't gang the checkboxes into a single "I
 * accept all" pattern — three discrete touches force the user to read the
 * three lines (or at least move the mouse three times). This is a defense
 * against accidental click-through and a paper trail for 152-ФЗ operator
 * obligations.
 *
 * On Finish:
 *   1. POST /api/onboarding/disclaimer/ack       (writes ack timestamp)
 *   2. POST /api/onboarding/finalize             (marks onboarding complete)
 *   3. onFinish() — wizard redirects to /chat
 *
 * If either ack/finalize call fails, we surface the error and DO NOT navigate.
 */
import { useState } from "react";
import { ackDisclaimer, finalizeOnboarding } from "../api/onboarding.js";
import { useTranslation } from "../i18n/index.js";

interface Props {
  onFinish: () => void;
  onBack: () => void;
}

export function Step6Disclaimer({ onFinish, onBack }: Props): JSX.Element {
  const t = useTranslation();
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = c1 && c2 && c3;

  const handleFinish = async () => {
    setBusy(true);
    setError(null);
    try {
      await ackDisclaimer();
      await finalizeOnboarding();
      onFinish();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="step-6" className="onboarding-step">
      <h2 className="onboarding-step-title">{t("onboarding.step6.title")}</h2>
      <p className="onboarding-step-body">{t("onboarding.step6.body")}</p>

      <div className="onboarding-disclaimer-list">
        <label
          className="onboarding-disclaimer-item"
          data-testid="step-6-check1-label"
        >
          <input
            type="checkbox"
            data-testid="step-6-check1"
            checked={c1}
            onChange={(e) => setC1(e.target.checked)}
          />
          <span>{t("onboarding.step6.check1")}</span>
        </label>
        <label
          className="onboarding-disclaimer-item"
          data-testid="step-6-check2-label"
        >
          <input
            type="checkbox"
            data-testid="step-6-check2"
            checked={c2}
            onChange={(e) => setC2(e.target.checked)}
          />
          <span>{t("onboarding.step6.check2")}</span>
        </label>
        <label
          className="onboarding-disclaimer-item"
          data-testid="step-6-check3-label"
        >
          <input
            type="checkbox"
            data-testid="step-6-check3"
            checked={c3}
            onChange={(e) => setC3(e.target.checked)}
          />
          <span>{t("onboarding.step6.check3")}</span>
        </label>
      </div>

      {error !== null ? (
        <div className="error" data-testid="step-6-error">
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
          data-testid="step-6-finish"
          onClick={() => void handleFinish()}
          disabled={!ready || busy}
        >
          {busy ? t("common.loading") : t("onboarding.step6.finish")}
        </button>
      </div>
    </div>
  );
}
