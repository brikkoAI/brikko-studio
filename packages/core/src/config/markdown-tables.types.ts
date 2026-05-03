import type { MarkdownTableMode } from "./types.base.js";
import type { Brikko StudioConfig } from "./types.brikko-studio.js";

export type ResolveMarkdownTableModeParams = {
  cfg?: Partial<Brikko StudioConfig>;
  channel?: string | null;
  accountId?: string | null;
};

export type ResolveMarkdownTableMode = (
  params: ResolveMarkdownTableModeParams,
) => MarkdownTableMode;
