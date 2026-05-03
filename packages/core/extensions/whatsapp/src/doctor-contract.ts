import type { ChannelDoctorConfigMutation } from "brikko-studio/plugin-sdk/channel-contract";
import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { normalizeCompatibilityConfig as normalizeCompatibilityConfigImpl } from "./doctor.js";

export function normalizeCompatibilityConfig({
  cfg,
}: {
  cfg: BrikkoStudioConfig;
}): ChannelDoctorConfigMutation {
  return normalizeCompatibilityConfigImpl({ cfg });
}
