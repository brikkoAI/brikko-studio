import type { BrikkoStudioConfig } from "../../config/types.brikko-studio.js";
import type { GetReplyOptions, SourceReplyDeliveryMode } from "../get-reply-options.types.js";
import type { FinalizedMsgContext } from "../templating.js";
import type { FormatAbortReplyText, TryFastAbortFromMessage } from "./abort.runtime-types.js";
import type { GetReplyFromConfig } from "./get-reply.types.js";
import type { ReplyDispatchKind, ReplyDispatcher } from "./reply-dispatcher.types.js";

export type DispatchFromConfigResult = {
  queuedFinal: boolean;
  counts: Record<ReplyDispatchKind, number>;
  sourceReplyDeliveryMode?: SourceReplyDeliveryMode;
};

export type DispatchFromConfigParams = {
  ctx: FinalizedMsgContext;
  cfg: BrikkoStudioConfig;
  dispatcher: ReplyDispatcher;
  replyOptions?: Omit<GetReplyOptions, "onBlockReply">;
  replyResolver?: GetReplyFromConfig;
  fastAbortResolver?: TryFastAbortFromMessage;
  formatAbortReplyTextResolver?: FormatAbortReplyText;
  /** Optional patch applied to the already loaded config before reply resolution. */
  configOverride?: BrikkoStudioConfig;
};

export type DispatchReplyFromConfig = (
  params: DispatchFromConfigParams,
) => Promise<DispatchFromConfigResult>;
