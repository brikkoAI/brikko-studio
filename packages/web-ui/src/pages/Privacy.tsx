import * as Tabs from "@radix-ui/react-tabs";
import { StatsPanel } from "../privacy/StatsPanel.js";
import { AuditLogTable } from "../privacy/AuditLogTable.js";
import { PolicyEditor } from "../privacy/PolicyEditor.js";
import { ToolPoliciesEditor } from "../privacy/ToolPoliciesEditor.js";
import { PurgeButton } from "../privacy/PurgeButton.js";
import { useTranslation } from "../i18n/index.js";

export function Privacy(): JSX.Element {
  const t = useTranslation();
  return (
    <div className="page" data-testid="privacy-page">
      <h1>{t("privacy.title")}</h1>
      <Tabs.Root defaultValue="stats">
        <Tabs.List className="tabs-list">
          <Tabs.Trigger value="stats" className="tabs-trigger" data-testid="tab-stats">
            {t("privacy.tab.stats")}
          </Tabs.Trigger>
          <Tabs.Trigger value="audit" className="tabs-trigger" data-testid="tab-audit">
            {t("privacy.tab.audit")}
          </Tabs.Trigger>
          <Tabs.Trigger value="policy" className="tabs-trigger" data-testid="tab-policy">
            {t("privacy.tab.policy")}
          </Tabs.Trigger>
          <Tabs.Trigger value="tools" className="tabs-trigger" data-testid="tab-tools">
            {t("privacy.tab.tools")}
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="stats">
          <StatsPanel />
          <PurgeButton />
        </Tabs.Content>
        <Tabs.Content value="audit">
          <AuditLogTable />
        </Tabs.Content>
        <Tabs.Content value="policy">
          <PolicyEditor />
        </Tabs.Content>
        <Tabs.Content value="tools">
          <ToolPoliciesEditor />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
