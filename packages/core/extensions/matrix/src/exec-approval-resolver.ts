import { resolveApprovalOverGateway } from "brikko-studio/plugin-sdk/approval-gateway-runtime";
import type { ExecApprovalReplyDecision } from "brikko-studio/plugin-sdk/approval-runtime";
import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { isApprovalNotFoundError } from "brikko-studio/plugin-sdk/error-runtime";

export { isApprovalNotFoundError };

export async function resolveMatrixApproval(params: {
  cfg: Brikko StudioConfig;
  approvalId: string;
  decision: ExecApprovalReplyDecision;
  senderId?: string | null;
  gatewayUrl?: string;
}): Promise<void> {
  await resolveApprovalOverGateway({
    cfg: params.cfg,
    approvalId: params.approvalId,
    decision: params.decision,
    senderId: params.senderId,
    gatewayUrl: params.gatewayUrl,
    clientDisplayName: `Matrix approval (${params.senderId?.trim() || "unknown"})`,
  });
}
