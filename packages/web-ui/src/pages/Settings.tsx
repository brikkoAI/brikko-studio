import { WorkspaceSection } from "../settings/WorkspaceSection.js";
import { McpCredentialsSection } from "../settings/McpCredentialsSection.js";
import { ThemeSection } from "../settings/ThemeSection.js";
import { useTranslation } from "../i18n/index.js";

export function Settings(): JSX.Element {
  const t = useTranslation();
  return (
    <div className="settings-page" data-testid="settings-page">
      <h1>{t("settings.title")}</h1>
      <WorkspaceSection />
      <McpCredentialsSection />
      <ThemeSection />
    </div>
  );
}
