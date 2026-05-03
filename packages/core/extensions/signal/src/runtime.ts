import type { PluginRuntime } from "brikko-studio/plugin-sdk/core";
import { createPluginRuntimeStore } from "brikko-studio/plugin-sdk/runtime-store";

const { setRuntime: setSignalRuntime, clearRuntime: clearSignalRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "signal",
    errorMessage: "Signal runtime not initialized",
  });
export { clearSignalRuntime, setSignalRuntime };
