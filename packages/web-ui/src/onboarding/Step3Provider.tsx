/**
 * Onboarding Step 3 — LLM provider choice.
 *
 * Two paths:
 *
 *   A) Brikko Gateway (recommended) — full-page redirect to OAuth (`POST
 *      /api/auth/start` from M0 returns the authorize URL). After the
 *      OAuth callback completes, the user lands back on `/onboarding?step=4`.
 *
 *   B) BYO API key — user picks one of {anthropic, openai, yandex, gigachat}
 *      and pastes their key. The input is masked (type="password") and the
 *      key is POSTed to `/api/onboarding/llm-provider` which forwards to
 *      keytar storage on the core side. We never log the key in the UI.
 *
 * Why a *full-page* OAuth redirect (not a popup): popups are blocked when
 * triggered from a form submit on Safari; the wizard is a single-step-at-a-time
 * flow anyway, so re-entering at step 4 after callback is acceptable.
 */
import { useState } from "react";
import { saveLlmProvider } from "../api/onboarding.js";
import { useTranslation } from "../i18n/index.js";

type Mode = "brikko" | "byo";
type Provider = "anthropic" | "openai" | "yandex" | "gigachat";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const PROVIDERS: Array<{ value: Provider; labelKey: string }> = [
  { value: "anthropic", labelKey: "onboarding.step3.provider.anthropic" },
  { value: "openai", labelKey: "onboarding.step3.provider.openai" },
  { value: "yandex", labelKey: "onboarding.step3.provider.yandex" },
  { value: "gigachat", labelKey: "onboarding.step3.provider.gigachat" },
];

export function Step3Provider({ onNext, onBack }: Props): JSX.Element {
  const t = useTranslation();
  const [mode, setMode] = useState<Mode>("brikko");
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue =
    mode === "brikko" || (mode === "byo" && apiKey.trim().length > 0);

  const handleContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "brikko") {
        const res = await fetch("/api/auth/start", { method: "POST" });
        if (!res.ok) {
          throw new Error(`auth start failed: ${res.status}`);
        }
        const body = (await res.json()) as { authorize_url: string };
        // Full-page redirect — wizard is gone; user re-enters via /callback.
        if (typeof window !== "undefined") {
          window.location.href = body.authorize_url;
        }
        return;
      }
      await saveLlmProvider({
        kind: "byo",
        provider,
        api_key: apiKey.trim(),
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="step-3" className="onboarding-step">
      <h2 className="onboarding-step-title">{t("onboarding.step3.title")}</h2>
      <p className="onboarding-step-body">{t("onboarding.step3.body")}</p>

      <div className="onboarding-cards" role="radiogroup" aria-label={t("onboarding.step3.title")}>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "brikko"}
          data-testid="step-3-mode-brikko"
          className={`onboarding-card${mode === "brikko" ? " selected" : ""}`}
          onClick={() => setMode("brikko")}
        >
          <div className="onboarding-card-title">
            {t("onboarding.step3.brikko")}
          </div>
          <div className="onboarding-card-body">
            {t("onboarding.step3.brikko_body")}
          </div>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "byo"}
          data-testid="step-3-mode-byo"
          className={`onboarding-card${mode === "byo" ? " selected" : ""}`}
          onClick={() => setMode("byo")}
        >
          <div className="onboarding-card-title">
            {t("onboarding.step3.byo")}
          </div>
          <div className="onboarding-card-body">
            {t("onboarding.step3.byo_body")}
          </div>
        </button>
      </div>

      {mode === "byo" ? (
        <div className="onboarding-byo-fields" data-testid="step-3-byo-fields">
          <div className="settings-row">
            <label htmlFor="byo-provider">
              {t("onboarding.step3.byo_provider")}
            </label>
            <select
              id="byo-provider"
              data-testid="step-3-byo-provider"
              className="form-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {t(p.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="settings-row">
            <label htmlFor="byo-key">{t("onboarding.step3.byo_key")}</label>
            <input
              id="byo-key"
              data-testid="step-3-byo-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              className="settings-input mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t("onboarding.step3.byo_key_placeholder")}
            />
            <span className="hint">
              Ключ хранится в системном keychain и никогда не покидает ваш
              компьютер в открытом виде.
            </span>
          </div>
        </div>
      ) : null}

      {error !== null ? (
        <div className="error" data-testid="step-3-error">
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
          data-testid="step-3-continue"
          onClick={() => void handleContinue()}
          disabled={busy || !canContinue}
        >
          {busy
            ? t("common.loading")
            : mode === "brikko"
              ? t("onboarding.step3.brikko_login")
              : t("common.next")}
        </button>
      </div>
    </div>
  );
}
