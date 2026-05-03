import { formatTrimmedAllowFromEntries } from "brikko-studio/plugin-sdk/channel-config-helpers";
import { PAIRING_APPROVED_MESSAGE } from "brikko-studio/plugin-sdk/channel-status";
import {
  DEFAULT_ACCOUNT_ID,
  getChatChannelMeta,
  type ChannelPlugin,
} from "brikko-studio/plugin-sdk/core";
import { resolveChannelMediaMaxBytes } from "brikko-studio/plugin-sdk/media-runtime";
import { collectStatusIssuesFromLastError } from "brikko-studio/plugin-sdk/status-helpers";
import { normalizeIMessageMessagingTarget } from "./normalize.js";
export { chunkTextForOutbound } from "brikko-studio/plugin-sdk/text-chunking";

export {
  collectStatusIssuesFromLastError,
  DEFAULT_ACCOUNT_ID,
  formatTrimmedAllowFromEntries,
  getChatChannelMeta,
  normalizeIMessageMessagingTarget,
  PAIRING_APPROVED_MESSAGE,
  resolveChannelMediaMaxBytes,
};

export type { ChannelPlugin };
