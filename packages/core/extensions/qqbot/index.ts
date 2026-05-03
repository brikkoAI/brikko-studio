import {
  defineBundledChannelEntry,
  loadBundledEntryExportSync,
  type BrikkoStudioPluginApi,
} from "brikko-studio/plugin-sdk/channel-entry-contract";

function registerQQBotFull(api: BrikkoStudioPluginApi): void {
  const register = loadBundledEntryExportSync<(api: BrikkoStudioPluginApi) => void>(import.meta.url, {
    specifier: "./api.js",
    exportName: "registerQQBotFull",
  });
  register(api);
}

export default defineBundledChannelEntry({
  id: "qqbot",
  name: "QQ Bot",
  description: "QQ Bot channel plugin",
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./channel-plugin-api.js",
    exportName: "qqbotPlugin",
  },
  secrets: {
    specifier: "./secret-contract-api.js",
    exportName: "channelSecrets",
  },
  runtime: {
    specifier: "./runtime-api.js",
    exportName: "setQQBotRuntime",
  },
  registerFull: registerQQBotFull,
});
