import type { PluginRuntime } from "brikko-studio/plugin-sdk/plugin-runtime";
import { createPluginRuntimeStore } from "brikko-studio/plugin-sdk/runtime-store";

const { setRuntime: setTlonRuntime, getRuntime: getTlonRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "tlon",
    errorMessage: "Tlon runtime not initialized",
  });
export { getTlonRuntime, setTlonRuntime };
