import clsx from "clsx";
import { useTranslation } from "../i18n/index.js";
import type { Session } from "./types.js";

export interface SessionSidebarProps {
  sessions: Session[];
  activeId: string | null;
  onSelect(id: string): void;
  onNew(): void;
}

export function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
}: SessionSidebarProps): JSX.Element {
  const t = useTranslation();
  return (
    <aside className="chat-sidebar" data-testid="session-sidebar">
      <button
        onClick={onNew}
        className="new-session-btn"
        data-testid="new-session"
      >
        + {t("chat.session.new")}
      </button>
      <ul className="session-list" data-testid="session-list">
        {sessions.length === 0 && (
          <li className="chat-empty">{t("chat.session.empty")}</li>
        )}
        {sessions.map((s) => (
          <li
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={clsx("session-item", activeId === s.id && "active")}
            data-testid={`session-${s.id}`}
          >
            {s.title}
          </li>
        ))}
      </ul>
    </aside>
  );
}
