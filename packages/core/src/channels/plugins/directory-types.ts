import type { Brikko StudioConfig } from "../../config/types.js";

export type DirectoryConfigParams = {
  cfg: Brikko StudioConfig;
  accountId?: string | null;
  query?: string | null;
  limit?: number | null;
};
