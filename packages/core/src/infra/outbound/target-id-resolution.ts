import type { ChannelDirectoryEntryKind, ChannelId } from "../../channels/plugins/types.public.js";
import type { BrikkoStudioConfig } from "../../config/types.brikko-studio.js";
import { maybeResolvePluginMessagingTarget } from "./target-normalization.js";

export type ResolvedIdLikeTarget = {
  to: string;
  kind: ChannelDirectoryEntryKind | "channel";
  display?: string;
  source: "normalized" | "directory";
};

export async function maybeResolveIdLikeTarget(params: {
  cfg: BrikkoStudioConfig;
  channel: ChannelId;
  input: string;
  accountId?: string | null;
  preferredKind?: ChannelDirectoryEntryKind | "channel";
}): Promise<ResolvedIdLikeTarget | undefined> {
  const target = await maybeResolvePluginMessagingTarget({
    ...params,
    requireIdLike: true,
  });
  if (!target) {
    return undefined;
  }
  return target;
}
