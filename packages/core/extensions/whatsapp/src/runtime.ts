import type { PluginRuntime } from "brikko-studio/plugin-sdk/core";
import { createPluginRuntimeStore } from "brikko-studio/plugin-sdk/runtime-store";

const { setRuntime: setWhatsAppRuntime, getRuntime: getWhatsAppRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "whatsapp",
    errorMessage: "WhatsApp runtime not initialized",
  });
export { getWhatsAppRuntime, setWhatsAppRuntime };
