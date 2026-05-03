import type { BrikkoStudioConfig } from "../../config/types.brikko-studio.js";
import type { DeliverableMessageChannel } from "../../utils/message-channel.js";

export function resetOutboundChannelBootstrapStateForTests(): void {
  // Runtime channel plugins are loaded during Gateway startup now.
}

export function bootstrapOutboundChannelPlugin(params: {
  channel: DeliverableMessageChannel;
  cfg?: BrikkoStudioConfig;
}): void {
  void params;
}
