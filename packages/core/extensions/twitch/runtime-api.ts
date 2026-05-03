// Private runtime barrel for the bundled Twitch extension.
// Keep this barrel thin and aligned with the local extension surface.

export type {
  ChannelAccountSnapshot,
  ChannelCapabilities,
  ChannelGatewayContext,
  ChannelLogSink,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelOutboundContext,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelStatusAdapter,
} from "brikko-studio/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "brikko-studio/plugin-sdk/channel-core";
export type { OutboundDeliveryResult } from "brikko-studio/plugin-sdk/channel-send-result";
export type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";
export type { WizardPrompter } from "brikko-studio/plugin-sdk/setup";
