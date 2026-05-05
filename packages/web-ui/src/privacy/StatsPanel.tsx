import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { fetchStats } from "../api/privacy.js";
import { useTranslation } from "../i18n/index.js";

export function StatsPanel(): JSX.Element {
  const t = useTranslation();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["privacy", "stats"],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  if (isLoading) return <div data-testid="stats-loading" className="muted">{t("common.loading")}</div>;
  if (isError) return <div className="error" data-testid="stats-error">{String(error)}</div>;
  if (!data) return <></>;

  const sortedCats = Object.entries(data.categories).sort((a, b) => b[1] - a[1]);

  return (
    <div data-testid="stats-panel">
      <div className="stats-grid">
        <Tile label={t("privacy.stats.total_mappings")} value={data.total_mappings} />
        <Tile label={t("privacy.stats.audit_24h")} value={data.audit_events_last_24h} />
        <Tile
          label={t("privacy.stats.degraded")}
          value={data.degraded_mode ? "ON" : "OFF"}
          warn={data.degraded_mode}
        />
      </div>
      <div className="stats-categories" data-testid="stats-categories">
        <h3>{t("privacy.stats.categories")}</h3>
        <ul>
          {sortedCats.length === 0 && <li className="muted">—</li>}
          {sortedCats.map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <span className="num">{v}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface TileProps {
  label: string;
  value: number | string;
  warn?: boolean;
}

function Tile({ label, value, warn = false }: TileProps): JSX.Element {
  return (
    <div className={clsx("stats-tile", warn && "warn")} data-testid="stats-tile">
      <div className="stats-tile-label">{label}</div>
      <div className="stats-tile-value">{value}</div>
    </div>
  );
}
