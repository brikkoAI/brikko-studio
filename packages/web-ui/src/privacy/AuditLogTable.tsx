import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAudit } from "../api/privacy.js";
import { useTranslation } from "../i18n/index.js";

const PAGE_SIZE = 50;

const CATEGORIES = [
  "PERSON",
  "INN",
  "PHONE_RU",
  "EMAIL",
  "PASSPORT_RU",
  "SNILS",
  "BANK_ACCOUNT",
  "ADDRESS",
  "ORG",
  "URL",
] as const;

export function AuditLogTable(): JSX.Element {
  const t = useTranslation();
  const [offset, setOffset] = useState(0);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [since, setSince] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["privacy", "audit", offset, category ?? "", since ?? ""],
    queryFn: () => fetchAudit({ limit: PAGE_SIZE, offset, category, since }),
    refetchInterval: 10_000,
  });

  return (
    <div data-testid="audit-table">
      <div className="audit-filters">
        <select
          className="form-select"
          value={category ?? ""}
          onChange={(e) => {
            setOffset(0);
            setCategory(e.target.value || undefined);
          }}
          data-testid="audit-filter-category"
        >
          <option value="">{t("privacy.audit.filter.category")}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="date"
          className="form-input"
          onChange={(e) => {
            setOffset(0);
            setSince(e.target.value ? `${e.target.value}T00:00:00Z` : undefined);
          }}
          data-testid="audit-filter-since"
          aria-label={t("privacy.audit.filter.since")}
        />
      </div>
      {isLoading && <div className="muted" data-testid="audit-loading">{t("common.loading")}</div>}
      {isError && <div className="error" data-testid="audit-error">{String(error)}</div>}
      {data && data.events.length === 0 && (
        <div className="audit-empty" data-testid="audit-empty">{t("privacy.audit.empty")}</div>
      )}
      {data && data.events.length > 0 && (
        <>
          <table className="audit-table">
            <thead>
              <tr>
                <th>{t("privacy.audit.column.time")}</th>
                <th>{t("privacy.audit.column.event")}</th>
                <th>{t("privacy.audit.column.category")}</th>
                <th>{t("privacy.audit.column.placeholder")}</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e, i) => (
                <tr key={`${e.request_id}-${i}`}>
                  <td className="mono">{new Date(e.timestamp).toLocaleString()}</td>
                  <td>{e.event_type}</td>
                  <td>{e.category}</td>
                  <td className="mono">{e.placeholder}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="audit-pagination">
            <button
              className="secondary"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              data-testid="audit-prev"
            >
              {t("common.back")}
            </button>
            <span>
              {offset + 1}–{offset + data.events.length} / {data.total}
            </span>
            <button
              className="secondary"
              disabled={data.next_offset === null}
              onClick={() => data.next_offset !== null && setOffset(data.next_offset)}
              data-testid="audit-next"
            >
              {t("common.next")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
