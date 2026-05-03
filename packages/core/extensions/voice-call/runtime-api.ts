// Private runtime barrel for the bundled Voice Call extension.
// Keep this barrel thin and aligned with the local extension surface.

export { definePluginEntry } from "brikko-studio/plugin-sdk/plugin-entry";
export type { Brikko StudioPluginApi } from "brikko-studio/plugin-sdk/plugin-entry";
export type { GatewayRequestHandlerOptions } from "brikko-studio/plugin-sdk/gateway-runtime";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "brikko-studio/plugin-sdk/webhook-request-guards";
export { fetchWithSsrFGuard, isBlockedHostnameOrIp } from "brikko-studio/plugin-sdk/ssrf-runtime";
export type { SessionEntry } from "brikko-studio/plugin-sdk/session-store-runtime";
export {
  TtsAutoSchema,
  TtsConfigSchema,
  TtsModeSchema,
  TtsProviderSchema,
} from "brikko-studio/plugin-sdk/tts-runtime";
export { sleep } from "brikko-studio/plugin-sdk/runtime-env";
