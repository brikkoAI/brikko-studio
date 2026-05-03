import type { BrikkoStudioConfig } from "../../config/types.js";

export type DirectoryConfigParams = {
  cfg: BrikkoStudioConfig;
  accountId?: string | null;
  query?: string | null;
  limit?: number | null;
};
