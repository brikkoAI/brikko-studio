export type { ChannelPlugin, BrikkoStudioPluginApi, PluginRuntime } from "brikko-studio/plugin-sdk/core";
export type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
export type {
  BrikkoStudioPluginService,
  BrikkoStudioPluginServiceContext,
  PluginLogger,
} from "brikko-studio/plugin-sdk/core";
export type { ResolvedQQBotAccount, QQBotAccountConfig } from "./src/types.js";
export { getQQBotRuntime, setQQBotRuntime } from "./src/bridge/runtime.js";
