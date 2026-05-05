/**
 * Settings → Workspace section.
 *
 * Shows workspace name + creation timestamp + key fingerprint, plus a
 * 'Download backup' button that streams an encrypted blob from
 * POST /api/settings/workspace/backup. The fingerprint is read-only —
 * it's a SHA-256 prefix of the workspace key, useful for verifying which
 * key a backup file belongs to.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { downloadBackup, fetchWorkspace } from "../api/settings.js";
import { useTranslation } from "../i18n/index.js";

export function WorkspaceSection(): JSX.Element {
  const t = useTranslation();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["settings", "workspace"],
    queryFn: fetchWorkspace,
  });
  const [downloading, setDownloading] = useState(false);
  const [downloadErr, setDownloadErr] = useState<string | null>(null);

  const onBackup = async (): Promise<void> => {
    if (downloading) return;
    setDownloading(true);
    setDownloadErr(null);
    try {
      const blob = await downloadBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      const safeName = (data?.name ?? "workspace").replace(/[^a-z0-9_-]/gi, "_");
      a.download = `brikko-${safeName}-${stamp}.brikko-backup`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadErr(String(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="settings-section" data-testid="workspace-section">
      <h2>{t("settings.workspace.title")}</h2>
      {isLoading && (
        <div className="muted" data-testid="workspace-loading">
          {t("common.loading")}
        </div>
      )}
      {isError && (
        <div className="error" data-testid="workspace-error">
          {String(error)}
        </div>
      )}
      {data && (
        <>
          <div className="settings-row">
            <label>{t("settings.workspace.name")}</label>
            <div data-testid="workspace-name">{data.name}</div>
          </div>
          <div className="settings-row">
            <label>{t("settings.workspace.created_at")}</label>
            <div className="hint" data-testid="workspace-created">{data.created_at}</div>
          </div>
          <div className="settings-row">
            <label>{t("settings.workspace.key.fingerprint")}</label>
            <div className="settings-fingerprint" data-testid="workspace-fingerprint">
              {data.key_fingerprint}
            </div>
          </div>
          <div className="settings-actions">
            <button
              type="button"
              className="primary"
              onClick={() => void onBackup()}
              disabled={downloading}
              data-testid="workspace-backup"
              style={{ width: "auto", padding: "0.55rem 1.25rem" }}
            >
              {t("settings.workspace.backup.button")}
            </button>
            {downloadErr && (
              <span className="error" data-testid="workspace-backup-error">
                {downloadErr}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
