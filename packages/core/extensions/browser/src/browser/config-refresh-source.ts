import {
  getRuntimeConfig,
  getRuntimeConfigSourceSnapshot,
  type BrikkoStudioConfig,
} from "../config/config.js";

export function loadBrowserConfigForRuntimeRefresh(): BrikkoStudioConfig {
  return getRuntimeConfigSourceSnapshot() ?? getRuntimeConfig();
}
