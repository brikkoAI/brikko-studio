/**
 * Privacy → Policy tab editor.
 *
 * Loads PolicyConfig from /api/privacy/policy, lets user pick a profile
 * (strict/balanced/permissive) and per-category sensitivity overrides
 * (low/medium/critical), then PUTs back on Save.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPolicy,
  savePolicy,
  type CategorySensitivity,
  type PolicyConfig,
  type PolicyProfile,
} from "../api/privacy.js";
import { useTranslation } from "../i18n/index.js";

const PROFILES: PolicyProfile[] = ["strict", "balanced", "permissive"];

const CATEGORIES: readonly string[] = [
  "PERSON",
  "ORG",
  "EMAIL",
  "PHONE_RU",
  "INN",
  "SNILS",
  "PASSPORT_RU",
  "BANK_ACCOUNT",
  "CARD_PAN",
];

const SENSITIVITY_OPTIONS: CategorySensitivity[] = ["low", "medium", "critical"];

export function PolicyEditor(): JSX.Element {
  const t = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["privacy", "policy"],
    queryFn: fetchPolicy,
  });
  const [draft, setDraft] = useState<PolicyConfig | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: savePolicy,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["privacy", "policy"] }),
  });

  if (isError) {
    return (
      <div className="error" data-testid="policy-error">
        {String(error)}
      </div>
    );
  }
  if (isLoading || !draft) {
    return (
      <div className="muted" data-testid="policy-loading">
        {t("common.loading")}
      </div>
    );
  }

  const onProfileChange = (p: PolicyProfile) => setDraft({ ...draft, profile: p });

  const onOverrideChange = (cat: string, value: string) => {
    const next = { ...draft.category_overrides };
    if (value === "default") {
      delete next[cat];
    } else {
      next[cat] = value as CategorySensitivity;
    }
    setDraft({ ...draft, category_overrides: next });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(draft);
  };

  return (
    <form
      data-testid="policy-editor"
      onSubmit={onSubmit}
      className="policy-editor"
    >
      <fieldset className="policy-fieldset">
        <legend>{t("privacy.policy.profile.label")}</legend>
        <div className="policy-profile-options">
          {PROFILES.map((p) => (
            <label key={p} className="policy-profile-option">
              <input
                type="radio"
                name="profile"
                value={p}
                checked={draft.profile === p}
                onChange={() => onProfileChange(p)}
              />
              <span>{t(`privacy.policy.profile.${p}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="policy-fieldset">
        <legend>{t("privacy.policy.overrides.label")}</legend>
        <div className="policy-overrides-grid">
          {CATEGORIES.map((cat) => {
            const current = draft.category_overrides[cat] ?? "default";
            return (
              <label key={cat} className="policy-override-row">
                <span className="policy-override-cat">{cat}</span>
                <select
                  className="form-select"
                  data-testid={`override-${cat}`}
                  value={current}
                  onChange={(e) => onOverrideChange(cat, e.target.value)}
                >
                  <option value="default">{t("privacy.policy.default")}</option>
                  {SENSITIVITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="policy-actions">
        <button
          type="submit"
          className="primary"
          disabled={mutation.isPending}
          data-testid="policy-save"
        >
          {t("privacy.policy.save")}
        </button>
        {mutation.isSuccess && (
          <span className="policy-saved" data-testid="policy-saved">
            ✓ {t("privacy.policy.saved")}
          </span>
        )}
        {mutation.isError && (
          <span className="error" data-testid="policy-save-error">
            {String(mutation.error)}
          </span>
        )}
      </div>
    </form>
  );
}
