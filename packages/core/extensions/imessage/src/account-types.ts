import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";

export type IMessageAccountConfig = Omit<
  NonNullable<NonNullable<Brikko StudioConfig["channels"]>["imessage"]>,
  "accounts" | "defaultAccount"
>;
