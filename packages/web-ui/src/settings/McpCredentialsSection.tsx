/**
 * Settings → MCP credentials section.
 *
 * Two sub-forms (Bitrix24, 1С) sharing the same pattern:
 *   - Public fields (portal_url / odata_url / username) are pre-filled from
 *     the GET status endpoint and editable in place.
 *   - Secret fields (webhook_token / password) are NEVER returned by GET.
 *     If `has_token` / `has_password` is true, the input is shown empty with
 *     placeholder "Введите новый…" and a 'Rotate' label. Otherwise the
 *     placeholder is the format hint.
 *   - 'Save' POSTs creds → server stores via keytar (spec hard constraint #4).
 *   - 'Test' calls the server's no-op connectivity check; the test button
 *     only enables when creds are already saved.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBitrixStatus,
  fetchOneCStatus,
  saveBitrixCreds,
  saveOneCCreds,
  testBitrix,
  testOneC,
} from "../api/settings.js";
import { useTranslation } from "../i18n/index.js";

export function McpCredentialsSection(): JSX.Element {
  const t = useTranslation();
  return (
    <section className="settings-section" data-testid="mcp-section">
      <h2>{t("settings.mcp.title")}</h2>
      <BitrixForm />
      <OneCForm />
    </section>
  );
}

function BitrixForm(): JSX.Element {
  const t = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings", "bitrix24"],
    queryFn: fetchBitrixStatus,
  });
  const [portalUrl, setPortalUrl] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (data?.portal_url) setPortalUrl(data.portal_url);
  }, [data?.portal_url]);

  const save = useMutation({
    mutationFn: () => saveBitrixCreds({ portal_url: portalUrl, webhook_token: token }),
    onSuccess: () => {
      setToken("");
      qc.invalidateQueries({ queryKey: ["settings", "bitrix24"] });
    },
  });

  const test = useMutation({ mutationFn: testBitrix });

  const hasToken = data?.has_token ?? false;
  const tokenPlaceholder = hasToken
    ? t("settings.mcp.bitrix24.webhook.placeholder.new")
    : t("settings.mcp.bitrix24.webhook.placeholder.first");

  return (
    <div data-testid="bitrix-form" style={{ marginBottom: "1.25rem" }}>
      <h3>{t("settings.mcp.bitrix24.title")}</h3>
      <div className="settings-row">
        <label htmlFor="bx-portal">{t("settings.mcp.bitrix24.portal_url")}</label>
        <input
          id="bx-portal"
          className="settings-input"
          type="url"
          value={portalUrl}
          placeholder="https://acme.bitrix24.ru"
          onChange={(e) => setPortalUrl(e.target.value)}
          data-testid="bitrix-portal"
        />
      </div>
      <div className="settings-row">
        <label htmlFor="bx-token">
          {t("settings.mcp.bitrix24.webhook")}
          {hasToken && (
            <span className="hint" data-testid="bitrix-token-saved">
              {" "}— {t("settings.mcp.bitrix24.webhook.saved")}
            </span>
          )}
        </label>
        <input
          id="bx-token"
          className="settings-input mono"
          type="password"
          value={token}
          placeholder={tokenPlaceholder}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          data-testid="bitrix-token"
        />
      </div>
      <div className="settings-actions">
        <button
          type="button"
          className="primary"
          style={{ width: "auto", padding: "0.5rem 1.1rem" }}
          disabled={!portalUrl || !token || save.isPending}
          onClick={() => save.mutate()}
          data-testid="bitrix-save"
        >
          {hasToken
            ? t("settings.mcp.bitrix24.rotate")
            : t("settings.mcp.bitrix24.save")}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!hasToken || test.isPending}
          onClick={() => test.mutate()}
          data-testid="bitrix-test"
        >
          {t("settings.mcp.bitrix24.test")}
        </button>
        {test.data?.ok && (
          <span className="settings-test-ok" data-testid="bitrix-test-ok">
            ✓ {t("settings.mcp.bitrix24.test.ok")}
          </span>
        )}
        {test.data && !test.data.ok && (
          <span className="settings-test-err" data-testid="bitrix-test-err">
            ✗ {test.data.error ?? "—"}
          </span>
        )}
        {save.isError && (
          <span className="error" data-testid="bitrix-save-err">
            {String(save.error)}
          </span>
        )}
      </div>
    </div>
  );
}

function OneCForm(): JSX.Element {
  const t = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings", "1c"],
    queryFn: fetchOneCStatus,
  });
  const [odataUrl, setOdataUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (data?.odata_url) setOdataUrl(data.odata_url);
    if (data?.username) setUsername(data.username);
  }, [data?.odata_url, data?.username]);

  const save = useMutation({
    mutationFn: () =>
      saveOneCCreds({ odata_url: odataUrl, username, password }),
    onSuccess: () => {
      setPassword("");
      qc.invalidateQueries({ queryKey: ["settings", "1c"] });
    },
  });
  const test = useMutation({ mutationFn: testOneC });

  const hasPwd = data?.has_password ?? false;
  const pwdPlaceholder = hasPwd
    ? t("settings.mcp.1c.password.placeholder.new")
    : "";

  return (
    <div data-testid="1c-form">
      <h3>{t("settings.mcp.1c.title")}</h3>
      <div className="settings-row">
        <label htmlFor="oc-url">{t("settings.mcp.1c.odata_url")}</label>
        <input
          id="oc-url"
          className="settings-input"
          type="url"
          value={odataUrl}
          placeholder="https://1c.example.com/odata/standard.odata"
          onChange={(e) => setOdataUrl(e.target.value)}
          data-testid="1c-url"
        />
      </div>
      <div className="settings-row">
        <label htmlFor="oc-user">{t("settings.mcp.1c.username")}</label>
        <input
          id="oc-user"
          className="settings-input"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          data-testid="1c-user"
        />
      </div>
      <div className="settings-row">
        <label htmlFor="oc-pwd">
          {t("settings.mcp.1c.password")}
          {hasPwd && (
            <span className="hint" data-testid="1c-pwd-saved">
              {" "}— {t("settings.mcp.1c.password.saved")}
            </span>
          )}
        </label>
        <input
          id="oc-pwd"
          className="settings-input"
          type="password"
          value={password}
          placeholder={pwdPlaceholder}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          data-testid="1c-pwd"
        />
      </div>
      <div className="settings-actions">
        <button
          type="button"
          className="primary"
          style={{ width: "auto", padding: "0.5rem 1.1rem" }}
          disabled={!odataUrl || !username || !password || save.isPending}
          onClick={() => save.mutate()}
          data-testid="1c-save"
        >
          {hasPwd ? t("settings.mcp.1c.rotate") : t("settings.mcp.1c.save")}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!hasPwd || test.isPending}
          onClick={() => test.mutate()}
          data-testid="1c-test"
        >
          {t("settings.mcp.1c.test")}
        </button>
        {test.data?.ok && (
          <span className="settings-test-ok" data-testid="1c-test-ok">
            ✓ {t("settings.mcp.bitrix24.test.ok")}
          </span>
        )}
        {test.data && !test.data.ok && (
          <span className="settings-test-err" data-testid="1c-test-err">
            ✗ {test.data.error ?? "—"}
          </span>
        )}
        {save.isError && (
          <span className="error" data-testid="1c-save-err">
            {String(save.error)}
          </span>
        )}
      </div>
    </div>
  );
}
