import type { Brikko StudioConfig } from "../../config/types.brikko-studio.js";
import type { DeliverableMessageChannel } from "../../utils/message-channel.js";

export function resetOutboundChannelBootstrapStateForTests(): void {
  // Runtime channel plugins are loaded during Gateway startup now.
}

export function bootstrapOutboundChannelPlugin(params: {
  channel: DeliverableMessageChannel;
  cfg?: Brikko StudioConfig;
}): void {
  void params;
}
