import type { MarkdownTableMode } from "./types.base.js";
import type { BrikkoStudioConfig } from "./types.brikko-studio.js";

export type ResolveMarkdownTableModeParams = {
  cfg?: Partial<BrikkoStudioConfig>;
  channel?: string | null;
  accountId?: string | null;
};

export type ResolveMarkdownTableMode = (
  params: ResolveMarkdownTableModeParams,
) => MarkdownTableMode;
