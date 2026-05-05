// Placeholder for Task 20 build to succeed.
// Full implementation lands in Task 21.
import { useTranslation } from "../i18n/index.js";

export function ChatLayout(): JSX.Element {
  const t = useTranslation();
  return (
    <div className="page" data-testid="chat-placeholder">
      <h1>{t("chat.title")}</h1>
      <p className="muted">— Task 21 —</p>
    </div>
  );
}
