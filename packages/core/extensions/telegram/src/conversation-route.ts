import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
import {
  resolveConfiguredBindingRoute,
  resolveRuntimeConversationBindingRoute,
  type ConfiguredBindingRouteResult,
} from "brikko-studio/plugin-sdk/conversation-runtime";
import {
  buildAgentSessionKey,
  deriveLastRoutePolicy,
  normalizeAccountId,
  resolveAgentRoute,
} from "brikko-studio/plugin-sdk/routing";
import { buildAgentMainSessionKey, sanitizeAgentId } from "brikko-studio/plugin-sdk/routing";
import { logVerbose } from "brikko-studio/plugin-sdk/runtime-env";
import { normalizeLowercaseStringOrEmpty } from "brikko-studio/plugin-sdk/text-runtime";
import { resolveDefaultTelegramAccountId } from "./accounts.js";
import {
  buildTelegramGroupPeerId,
  buildTelegramParentPeer,
  resolveTelegramDirectPeerId,
} from "./bot/helpers.js";

export function resolveTelegramConversationRoute(params: {
  cfg: BrikkoStudioConfig;
  accountId: string;
  chatId: number | string;
  isGroup: boolean;
  resolvedThreadId?: number;
  replyThreadId?: number;
  senderId?: string | number | null;
  topicAgentId?: string | null;
}): {
  route: ReturnType<typeof resolveAgentRoute>;
  configuredBinding: ConfiguredBindingRouteResult["bindingResolution"];
  configuredBindingSessionKey: string;
} {
  const peerId = params.isGroup
    ? buildTelegramGroupPeerId(params.chatId, params.resolvedThreadId)
    : resolveTelegramDirectPeerId({
        chatId: params.chatId,
        senderId: params.senderId,
      });
  const parentPeer = buildTelegramParentPeer({
    isGroup: params.isGroup,
    resolvedThreadId: params.resolvedThreadId,
    chatId: params.chatId,
  });
  let route = resolveAgentRoute({
    cfg: params.cfg,
    channel: "telegram",
    accountId: params.accountId,
    peer: {
      kind: params.isGroup ? "group" : "direct",
      id: peerId,
    },
    parentPeer,
  });

  const rawTopicAgentId = params.topicAgentId?.trim();
  if (rawTopicAgentId) {
    // Preserve the configured topic agent ID so topic-bound sessions stay stable
    // even when that agent is not present in the current config snapshot.
    const topicAgentId = sanitizeAgentId(rawTopicAgentId);
    const sessionKey = normalizeLowercaseStringOrEmpty(
      buildAgentSessionKey({
        agentId: topicAgentId,
        channel: "telegram",
        accountId: params.accountId,
        peer: { kind: params.isGroup ? "group" : "direct", id: peerId },
        dmScope: params.cfg.session?.dmScope,
        identityLinks: params.cfg.session?.identityLinks,
      }),
    );
    const mainSessionKey = normalizeLowercaseStringOrEmpty(
      buildAgentMainSessionKey({
        agentId: topicAgentId,
      }),
    );
    route = {
      ...route,
      agentId: topicAgentId,
      sessionKey,
      mainSessionKey,
      lastRoutePolicy: deriveLastRoutePolicy({
        sessionKey,
        mainSessionKey,
      }),
    };
    logVerbose(
      `telegram: topic route override: topic=${params.resolvedThreadId ?? params.replyThreadId} agent=${topicAgentId} sessionKey=${route.sessionKey}`,
    );
  }

  const configuredRoute = resolveConfiguredBindingRoute({
    cfg: params.cfg,
    route,
    conversation: {
      channel: "telegram",
      accountId: params.accountId,
      conversationId: peerId,
      parentConversationId: params.isGroup ? String(params.chatId) : undefined,
    },
  });
  let configuredBinding = configuredRoute.bindingResolution;
  let configuredBindingSessionKey = configuredRoute.boundSessionKey ?? "";
  route = configuredRoute.route;

  const runtimeBindingConversationId =
    params.replyThreadId != null
      ? `${params.chatId}:topic:${params.replyThreadId}`
      : String(params.chatId);
  const runtimeRoute = resolveRuntimeConversationBindingRoute({
    route,
    conversation: {
      channel: "telegram",
      accountId: params.accountId,
      conversationId: runtimeBindingConversationId,
    },
  });
  route = runtimeRoute.route;
  if (runtimeRoute.bindingRecord) {
    configuredBinding = null;
    configuredBindingSessionKey = "";
    logVerbose(
      runtimeRoute.boundSessionKey
        ? `telegram: routed via bound conversation ${runtimeBindingConversationId} -> ${runtimeRoute.boundSessionKey}`
        : `telegram: plugin-bound conversation ${runtimeBindingConversationId}`,
    );
  }

  return {
    route,
    configuredBinding,
    configuredBindingSessionKey,
  };
}

export function resolveTelegramConversationBaseSessionKey(params: {
  cfg: BrikkoStudioConfig;
  route: Pick<
    ReturnType<typeof resolveTelegramConversationRoute>["route"],
    "agentId" | "accountId" | "matchedBy" | "sessionKey"
  >;
  chatId: number | string;
  isGroup: boolean;
  senderId?: string | number | null;
}): string {
  const routeAccountId = normalizeAccountId(params.route.accountId);
  const defaultAccountId = normalizeAccountId(resolveDefaultTelegramAccountId(params.cfg));
  const isNamedAccountFallback =
    routeAccountId !== defaultAccountId && params.route.matchedBy === "default";
  if (!isNamedAccountFallback || params.isGroup) {
    return params.route.sessionKey;
  }
  return normalizeLowercaseStringOrEmpty(
    buildAgentSessionKey({
      agentId: params.route.agentId,
      channel: "telegram",
      accountId: params.route.accountId,
      peer: {
        kind: "direct",
        id: resolveTelegramDirectPeerId({
          chatId: params.chatId,
          senderId: params.senderId,
        }),
      },
      dmScope: "per-account-channel-peer",
      identityLinks: params.cfg.session?.identityLinks,
    }),
  );
}
