import { jsonResult, readStringParam } from "brikko-studio/plugin-sdk/channel-actions";
import type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
} from "brikko-studio/plugin-sdk/channel-contract";
import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { createLazyRuntimeNamedExport } from "brikko-studio/plugin-sdk/lazy-runtime";
import { extractToolSend } from "brikko-studio/plugin-sdk/tool-send";
import { listEnabledZaloAccounts, resolveZaloAccount } from "./accounts.js";

const loadZaloActionsRuntime = createLazyRuntimeNamedExport(
  () => import("./actions.runtime.js"),
  "zaloActionsRuntime",
);

const providerId = "zalo";

function listEnabledAccounts(cfg: BrikkoStudioConfig, accountId?: string | null) {
  return (
    accountId ? [resolveZaloAccount({ cfg, accountId })] : listEnabledZaloAccounts(cfg)
  ).filter((account) => account.enabled && account.tokenSource !== "none");
}

export const zaloMessageActions: ChannelMessageActionAdapter = {
  describeMessageTool: ({ cfg, accountId }) => {
    const accounts = listEnabledAccounts(cfg, accountId);
    if (accounts.length === 0) {
      return null;
    }
    const actions = new Set<ChannelMessageActionName>(["send"]);
    return { actions: Array.from(actions), capabilities: [] };
  },
  extractToolSend: ({ args }) => extractToolSend(args, "sendMessage"),
  handleAction: async ({ action, params, cfg, accountId }) => {
    if (action === "send") {
      const to = readStringParam(params, "to", { required: true });
      const content = readStringParam(params, "message", {
        required: true,
        allowEmpty: true,
      });
      const mediaUrl = readStringParam(params, "media", { trim: false });

      const { sendMessageZalo } = await loadZaloActionsRuntime();
      const result = await sendMessageZalo(to ?? "", content ?? "", {
        accountId: accountId ?? undefined,
        mediaUrl: mediaUrl ?? undefined,
        cfg: cfg,
      });

      if (!result.ok) {
        return jsonResult({
          ok: false,
          error: result.error ?? "Failed to send Zalo message",
        });
      }

      return jsonResult({ ok: true, to, messageId: result.messageId });
    }

    throw new Error(`Action ${action} is not supported for provider ${providerId}.`);
  },
};
