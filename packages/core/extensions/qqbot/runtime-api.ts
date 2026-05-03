export type { ChannelPlugin, Brikko StudioPluginApi, PluginRuntime } from "brikko-studio/plugin-sdk/core";
export type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
export type {
  Brikko StudioPluginService,
  Brikko StudioPluginServiceContext,
  PluginLogger,
} from "brikko-studio/plugin-sdk/core";
export type { ResolvedQQBotAccount, QQBotAccountConfig } from "./src/types.js";
export { getQQBotRuntime, setQQBotRuntime } from "./src/bridge/runtime.js";
