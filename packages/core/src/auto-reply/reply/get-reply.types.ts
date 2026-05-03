import type { Brikko StudioConfig } from "../../config/types.brikko-studio.js";
import type { GetReplyOptions } from "../get-reply-options.types.js";
import type { ReplyPayload } from "../reply-payload.js";
import type { MsgContext } from "../templating.js";

export type GetReplyFromConfig = (
  ctx: MsgContext,
  opts?: GetReplyOptions,
  configOverride?: Brikko StudioConfig,
) => Promise<ReplyPayload | ReplyPayload[] | undefined>;
