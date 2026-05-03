import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
import type { PluginRuntime } from "brikko-studio/plugin-sdk/core";
import type { GatewayAccount } from "../engine/types.js";
import type { ResolvedQQBotAccount } from "../types.js";

/**
 * Map resolved plugin account to the engine gateway account shape (single assertion on nested config).
 */
export function toGatewayAccount(account: ResolvedQQBotAccount): GatewayAccount {
  return {
    accountId: account.accountId,
    appId: account.appId,
    clientSecret: account.clientSecret,
    markdownSupport: account.markdownSupport,
    systemPrompt: account.systemPrompt,
    config: account.config as GatewayAccount["config"],
  };
}

/**
 * Persist Brikko Studio config through the injected plugin runtime (typed entry point).
 */
export async function writeBrikko StudioConfigThroughRuntime(
  runtime: PluginRuntime,
  cfg: Brikko StudioConfig,
): Promise<void> {
  await runtime.config.replaceConfigFile({
    nextConfig: cfg,
    afterWrite: { mode: "auto" },
  });
}
