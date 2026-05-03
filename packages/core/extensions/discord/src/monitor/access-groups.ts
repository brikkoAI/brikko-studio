import {
  resolveAccessGroupAllowFromMatches,
  type AccessGroupMembershipResolver,
} from "brikko-studio/plugin-sdk/command-auth";
import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { logVerbose } from "brikko-studio/plugin-sdk/runtime-env";
import type { RequestClient } from "../internal/discord.js";
import { canViewDiscordGuildChannel } from "../send.permissions.js";

export function createDiscordAccessGroupMembershipResolver(params: {
  token?: string;
  rest?: RequestClient;
}): AccessGroupMembershipResolver {
  return async ({ cfg, name, group, accountId, senderId }) => {
    if (group.type !== "discord.channelAudience") {
      return false;
    }
    const membership = group.membership ?? "canViewChannel";
    if (membership !== "canViewChannel") {
      return false;
    }
    return await canViewDiscordGuildChannel(group.guildId, group.channelId, senderId, {
      cfg,
      accountId,
      token: params.token,
      rest: params.rest,
    }).catch((err) => {
      logVerbose(`discord: accessGroup:${name} lookup failed for user ${senderId}: ${String(err)}`);
      return false;
    });
  };
}

export async function resolveDiscordDmAccessGroupEntries(params: {
  cfg?: BrikkoStudioConfig;
  allowFrom: string[];
  sender: { id: string };
  accountId: string;
  token?: string;
  rest?: RequestClient;
  isSenderAllowed?: (senderId: string, allowFrom: string[]) => boolean;
}): Promise<string[]> {
  return await resolveAccessGroupAllowFromMatches({
    cfg: params.cfg,
    allowFrom: params.allowFrom,
    channel: "discord",
    accountId: params.accountId,
    senderId: params.sender.id,
    isSenderAllowed: params.isSenderAllowed,
    resolveMembership: createDiscordAccessGroupMembershipResolver({
      token: params.token,
      rest: params.rest,
    }),
  });
}
