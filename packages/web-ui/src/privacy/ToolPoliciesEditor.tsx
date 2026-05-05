/**
 * Privacy → Tool policies tab editor.
 *
 * Loads tool policies from /api/privacy/tool-policies, lets user adjust
 * args (deanonymize/keep_anonymized) and result (anonymize/passthrough)
 * per-pattern. The trust column (trusted/untrusted) is read-only — derived
 * server-side from the pattern prefix (bitrix24/1c/filesystem → trusted).
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  fetchToolPolicies,
  saveToolPolicies,
  type ToolPolicy,
} from "../api/privacy.js";
import { useTranslation } from "../i18n/index.js";

export function ToolPoliciesEditor(): JSX.Element {
  const t = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["privacy", "tool-policies"],
    queryFn: fetchToolPolicies,
  });
  const [draft, setDraft] = useState<ToolPolicy[] | null>(null);

  useEffect(() => {
    if (data) setDraft(data.policies);
  }, [data]);

  const mutation = useMutation({
    mutationFn: saveToolPolicies,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["privacy", "tool-policies"] }),
  });

  if (isError) {
    return (
      <div className="error" data-testid="tool-policies-error">
        {String(error)}
      </div>
    );
  }
  if (isLoading || !draft) {
    return (
      <div className="muted" data-testid="tool-policies-loading">
        {t("common.loading")}
      </div>
    );
  }

  const updateRow = (idx: number, patch: Partial<ToolPolicy>): void => {
    setDraft(draft.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft) mutation.mutate(draft);
  };

  if (draft.length === 0) {
    return (
      <div className="audit-empty" data-testid="tool-policies-empty">
        {t("privacy.tools.empty")}
      </div>
    );
  }

  return (
    <form
      data-testid="tool-policies-editor"
      onSubmit={onSubmit}
      className="tool-policies-form"
    >
      <table className="audit-table">
        <thead>
          <tr>
            <th>{t("privacy.tools.column.pattern")}</th>
            <th>{t("privacy.tools.column.args")}</th>
            <th>{t("privacy.tools.column.result")}</th>
            <th>{t("privacy.tools.column.trust")}</th>
          </tr>
        </thead>
        <tbody>
          {draft.map((p, i) => (
            <tr key={p.pattern} data-testid={`tool-policy-row-${p.pattern}`}>
              <td className="mono">{p.pattern}</td>
              <td>
                <select
                  className="form-select"
                  data-testid={`tool-args-${p.pattern}`}
                  value={p.args}
                  onChange={(e) =>
                    updateRow(i, { args: e.target.value as ToolPolicy["args"] })
                  }
                >
                  <option value="deanonymize">deanonymize</option>
                  <option value="keep_anonymized">keep_anonymized</option>
                </select>
              </td>
              <td>
                <select
                  className="form-select"
                  data-testid={`tool-result-${p.pattern}`}
                  value={p.result}
                  onChange={(e) =>
                    updateRow(i, { result: e.target.value as ToolPolicy["result"] })
                  }
                >
                  <option value="anonymize">anonymize</option>
                  <option value="passthrough">passthrough</option>
                </select>
              </td>
              <td>
                <span
                  className={clsx(
                    "trust-badge",
                    p.trust === "trusted" ? "trust-trusted" : "trust-untrusted"
                  )}
                >
                  {t(`privacy.tools.trust.${p.trust}`)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="policy-actions">
        <button
          type="submit"
          className="primary"
          disabled={mutation.isPending}
          data-testid="tool-policies-save"
        >
          {t("privacy.policy.save")}
        </button>
        {mutation.isSuccess && (
          <span className="policy-saved" data-testid="tool-policies-saved">
            ✓ {t("privacy.policy.saved")}
          </span>
        )}
        {mutation.isError && (
          <span className="error" data-testid="tool-policies-save-error">
            {String(mutation.error)}
          </span>
        )}
      </div>
    </form>
  );
}
