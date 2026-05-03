import {
  getRuntimeConfig,
  getRuntimeConfigSourceSnapshot,
  type Brikko StudioConfig,
} from "../config/config.js";

export function loadBrowserConfigForRuntimeRefresh(): Brikko StudioConfig {
  return getRuntimeConfigSourceSnapshot() ?? getRuntimeConfig();
}
