import { resolveChannelGroupRequireMention } from "brikko-studio/plugin-sdk/channel-policy";
import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/core";

type GoogleChatGroupContext = {
  cfg: Brikko StudioConfig;
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
