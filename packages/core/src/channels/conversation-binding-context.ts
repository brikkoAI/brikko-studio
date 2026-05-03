import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import {
  resolveCommandConversationResolution,
  type ResolveCommandConversationResolutionInput,
} from "./conversation-resolution.js";

type ConversationBindingContext = {
  channel: string;
  accountId: string;
  conversationId: string;
  parentConversationId?: string;
  threadId?: string;
};

type ResolveConversationBindingContextInput = Omit<
  ResolveCommandConversationResolutionInput,
  "includePlacementHint"
> & {
  cfg: BrikkoStudioConfig;
};

export function resolveConversationBindingContext(
  params: ResolveConversationBindingContextInput,
): ConversationBindingContext | null {
  const resolution = resolveCommandConversationResolution({
    ...params,
    includePlacementHint: false,
  });
  if (!resolution) {
    return null;
  }
  return {
    channel: resolution.canonical.channel,
    accountId: resolution.canonical.accountId,
    conversationId: resolution.canonical.conversationId,
    ...(resolution.canonical.parentConversationId
      ? { parentConversationId: resolution.canonical.parentConversationId }
      : {}),
    ...(resolution.threadId ? { threadId: resolution.threadId } : {}),
  };
}
