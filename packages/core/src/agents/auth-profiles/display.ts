import type { BrikkoStudioConfig } from "../../config/types.brikko-studio.js";
import { resolveAuthProfileMetadata } from "./identity.js";
import type { AuthProfileStore } from "./types.js";

export function resolveAuthProfileDisplayLabel(params: {
  cfg?: BrikkoStudioConfig;
  store: AuthProfileStore;
  profileId: string;
}): string {
  const { displayName, email } = resolveAuthProfileMetadata(params);
  if (displayName) {
    return `${params.profileId} (${displayName})`;
  }
  if (email) {
    return `${params.profileId} (${email})`;
  }
  return params.profileId;
}
