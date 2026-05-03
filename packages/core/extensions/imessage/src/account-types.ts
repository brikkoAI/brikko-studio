import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";

export type IMessageAccountConfig = Omit<
  NonNullable<NonNullable<BrikkoStudioConfig["channels"]>["imessage"]>,
  "accounts" | "defaultAccount"
>;
