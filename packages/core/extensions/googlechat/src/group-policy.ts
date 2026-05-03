import { resolveChannelGroupRequireMention } from "brikko-studio/plugin-sdk/channel-policy";
import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/core";

type GoogleChatGroupContext = {
  cfg: BrikkoStudioConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveGoogleChatGroupRequireMention(params: GoogleChatGroupContext): boolean {
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "googlechat",
    groupId: params.groupId,
    accountId: params.accountId,
  });
}
