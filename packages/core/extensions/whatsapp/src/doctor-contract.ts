import type { ChannelDoctorConfigMutation } from "brikko-studio/plugin-sdk/channel-contract";
import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { normalizeCompatibilityConfig as normalizeCompatibilityConfigImpl } from "./doctor.js";

export function normalizeCompatibilityConfig({
  cfg,
}: {
  cfg: Brikko StudioConfig;
}): ChannelDoctorConfigMutation {
  return normalizeCompatibilityConfigImpl({ cfg });
}
