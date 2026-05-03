import type { ChannelOutboundPayloadHint } from "brikko-studio/plugin-sdk/channel-contract";
import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
import type { DiscordExecApprovalConfig } from "brikko-studio/plugin-sdk/config-types";
import type { ReplyPayload } from "brikko-studio/plugin-sdk/reply-dispatch-runtime";
import { resolveDiscordAccount } from "./accounts.js";
import {
  getExecApprovalReplyMetadata,
  isChannelExecApprovalClientEnabledFromConfig,
  matchesApprovalRequestFilters,
  resolveApprovalApprovers,
} from "./approval-runtime.js";
import { parseDiscordTarget } from "./target-parsing.js";

function normalizeDiscordApproverId(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const target = parseDiscordTarget(trimmed);
    return target?.kind === "user" ? target.id : undefined;
  } catch {
    return undefined;
  }
}

function resolveDiscordOwnerApprovers(cfg: Brikko StudioConfig): string[] {
  const ownerAllowFrom = cfg.commands?.ownerAllowFrom;
  if (!Array.isArray(ownerAllowFrom) || ownerAllowFrom.length === 0) {
    return [];
  }
  return resolveApprovalApprovers({
    explicit: ownerAllowFrom,
    normalizeApprover: (value) => normalizeDiscordApproverId(String(value)),
  });
}

export function getDiscordExecApprovalApprovers(params: {
  cfg: Brikko StudioConfig;
  accountId?: string | null;
  configOverride?: DiscordExecApprovalConfig | null;
}): string[] {
  return resolveApprovalApprovers({
    explicit:
      params.configOverride?.approvers ??
      resolveDiscordAccount(params).config.execApprovals?.approvers ??
      resolveDiscordOwnerApprovers(params.cfg),
    normalizeApprover: (value) => normalizeDiscordApproverId(String(value)),
  });
}

export function isDiscordExecApprovalClientEnabled(params: {
  cfg: Brikko StudioConfig;
  accountId?: string | null;
  configOverride?: DiscordExecApprovalConfig | null;
}): boolean {
  const config = params.configOverride ?? resolveDiscordAccount(params).config.execApprovals;
  return isChannelExecApprovalClientEnabledFromConfig({
    enabled: config?.enabled,
    approverCount: getDiscordExecApprovalApprovers({
      cfg: params.cfg,
      accountId: params.accountId,
      configOverride: params.configOverride,
    }).length,
  });
}

export function isDiscordExecApprovalApprover(params: {
  cfg: Brikko StudioConfig;
  accountId?: string | null;
  senderId?: string | null;
  configOverride?: DiscordExecApprovalConfig | null;
}): boolean {
  const senderId = params.senderId?.trim();
  if (!senderId) {
    return false;
  }
  return getDiscordExecApprovalApprovers({
    cfg: params.cfg,
    accountId: params.accountId,
    configOverride: params.configOverride,
  }).includes(senderId);
}

export function shouldSuppressLocalDiscordExecApprovalPrompt(params: {
  cfg: Brikko StudioConfig;
  accountId?: string | null;
  payload: ReplyPayload;
  hint?: ChannelOutboundPayloadHint;
}): boolean {
  const metadata = getExecApprovalReplyMetadata(params.payload);
  const config = resolveDiscordAccount(params).config.execApprovals;
  return (
    params.hint?.kind === "approval-pending" &&
    params.hint.nativeRouteActive === true &&
    isDiscordExecApprovalClientEnabled(params) &&
    metadata !== null &&
    matchesApprovalRequestFilters({
      request: {
        agentId: metadata.agentId,
        sessionKey: metadata.sessionKey,
      },
      agentFilter: config?.agentFilter,
      sessionFilter: config?.sessionFilter,
    })
  );
}
