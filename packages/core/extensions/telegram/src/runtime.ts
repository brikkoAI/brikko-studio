import { createPluginRuntimeStore } from "brikko-studio/plugin-sdk/runtime-store";
import type { TelegramRuntime } from "./runtime.types.js";

const {
  setRuntime: setTelegramRuntime,
  clearRuntime: clearTelegramRuntime,
  getRuntime: getTelegramRuntime,
} = createPluginRuntimeStore<TelegramRuntime>({
  pluginId: "telegram",
  errorMessage: "Telegram runtime not initialized",
});
export { clearTelegramRuntime, getTelegramRuntime, setTelegramRuntime };
