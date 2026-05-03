import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";

export type SignalAccountConfig = Omit<
  Exclude<NonNullable<BrikkoStudioConfig["channels"]>["signal"], undefined>,
  "accounts"
>;
