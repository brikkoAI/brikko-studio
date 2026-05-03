import {
  defineBundledChannelEntry,
  loadBundledEntryExportSync,
  type Brikko StudioPluginApi,
} from "brikko-studio/plugin-sdk/channel-entry-contract";

function registerQQBotFull(api: Brikko StudioPluginApi): void {
  const register = loadBundledEntryExportSync<(api: Brikko StudioPluginApi) => void>(import.meta.url, {
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
