import {
  getRuntimeConfigSnapshot,
  getRuntimeConfigSourceSnapshot,
} from "../config/runtime-snapshot.js";
import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";

export function resolvePluginActivationSourceConfig(params: {
  config?: BrikkoStudioConfig;
  activationSourceConfig?: BrikkoStudioConfig;
}): BrikkoStudioConfig {
  if (params.activationSourceConfig !== undefined) {
    return params.activationSourceConfig;
  }
  const sourceSnapshot = getRuntimeConfigSourceSnapshot();
  if (sourceSnapshot && params.config === getRuntimeConfigSnapshot()) {
    return sourceSnapshot;
  }
  return params.config ?? {};
}
