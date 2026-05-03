import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";

export type SignalAccountConfig = Omit<
  Exclude<NonNullable<Brikko StudioConfig["channels"]>["signal"], undefined>,
  "accounts"
>;
