/**
 * Onboarding Step 2 — workspace creation + mandatory backup download.
 *
 * Why mandatory: the workspace AES-256-GCM key is stored locally in encrypted
 * form (passphrase-derived). If the user wipes the machine without a backup,
 * the only copy of the key is gone — and *every* anonymized mapping in the
 * audit log becomes irrecoverable. So the wizard refuses to advance until the
 * user explicitly checks "I saved the backup". We do NOT auto-tick this for
 * them when they click Download — they must affirm they put it in a safe
 * place (cloud, password manager, etc).
 */
import { useState } from "react";
import {
  createWorkspace,
  downloadWorkspaceBackup,
  validateWorkspaceName,
  type CreateWorkspaceResp,
} from "../api/onboarding.js";
import { useTranslation } from "../i18n/index.js";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

type Phase = "form" | "created";

export function Step2Workspace({ onNext, onBack }: Props): JSX.Element {
  const t = useTranslation();
  const [name, setName] = useState("personal");
  const [phase, setPhase] = useState<Phase>("form");
  const [created, setCreated] = useState<CreateWorkspaceResp | null>(null);
  const [backupDone, setBackupDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = validateWorkspaceName(name);

  const handleCreate = async () => {
    if (validationError !== null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createWorkspace({ name: name.trim() });
      setCreated(res);
      setPhase("created");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!created) return;
    setError(null);
    try {
      const blob = await downloadWorkspaceBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brikko-workspace-${created.name}-${new Date()
        .toISOString()
        .slice(0, 10)}.brikko-backup`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Intentionally do NOT auto-set backupDone — user must affirm storage.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div data-testid="step-2" className="onboarding-step">
      <h2 className="onboarding-step-title">{t("onboarding.step2.title")}</h2>
      <p className="onboarding-step-body">{t("onboarding.step2.body")}</p>

      {phase === "form" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate();
          }}
        >
          <div className="settings-row">
            <label htmlFor="workspace-name">
              {t("settings.workspace.name")}
            </label>
            <input
              id="workspace-name"
              data-testid="step-2-name-input"
              className="settings-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="personal"
              autoFocus
            />
            {validationError !== null && name.length > 0 ? (
              <span className="hint" data-testid="step-2-name-error">
                {validationError}
              </span>
            ) : (
              <span className="hint">A–Z, 0–9, _, –, до 64 символов</span>
            )}
          </div>

          {error !== null ? (
            <div className="error" data-testid="step-2-error">
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
              type="submit"
              className="primary onboarding-cta"
              data-testid="step-2-create"
              disabled={busy || validationError !== null}
            >
              {busy ? t("common.loading") : t("onboarding.step2.create")}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div
            className="onboarding-success"
            data-testid="step-2-created-banner"
          >
            <strong>✓ Workspace создан.</strong>
            <div className="settings-fingerprint" data-testid="step-2-fingerprint">
              {created?.key_fingerprint}
            </div>
          </div>

          <div className="onboarding-warn" data-testid="step-2-backup-warning">
            Без резервной копии ключа восстановить данные будет невозможно.
            Скачайте файл и сохраните в надёжном месте (менеджер паролей,
            облачное хранилище, USB-ключ).
          </div>

          <div className="onboarding-actions onboarding-actions-stack">
            <button
              type="button"
              className="primary"
              data-testid="step-2-backup"
              onClick={() => void handleDownload()}
            >
              {t("onboarding.step2.backup_now")}
            </button>
          </div>

          <label
            className="onboarding-checkbox"
            data-testid="step-2-backup-confirm-label"
          >
            <input
              type="checkbox"
              data-testid="step-2-backup-confirm"
              checked={backupDone}
              onChange={(e) => setBackupDone(e.target.checked)}
            />
            <span>{t("onboarding.step2.backup_done_check")}</span>
          </label>

          {error !== null ? (
            <div className="error" data-testid="step-2-error">
              {error}
            </div>
          ) : null}

          <div className="onboarding-actions">
            <button type="button" className="secondary" onClick={onBack}>
              {t("common.back")}
            </button>
            <button
              type="button"
              className="primary onboarding-cta"
              data-testid="step-2-next"
              disabled={!backupDone}
              onClick={onNext}
            >
              {t("common.next")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
