import {
  getRuntimeConfigSnapshot,
  getRuntimeConfigSourceSnapshot,
} from "../config/runtime-snapshot.js";
import type { Brikko StudioConfig } from "../config/types.brikko-studio.js";

export function resolvePluginActivationSourceConfig(params: {
  config?: Brikko StudioConfig;
  activationSourceConfig?: Brikko StudioConfig;
}): Brikko StudioConfig {
  if (params.activationSourceConfig !== undefined) {
    return params.activationSourceConfig;
  }
  const sourceSnapshot = getRuntimeConfigSourceSnapshot();
  if (sourceSnapshot && params.config === getRuntimeConfigSnapshot()) {
    return sourceSnapshot;
  }
  return params.config ?? {};
}
