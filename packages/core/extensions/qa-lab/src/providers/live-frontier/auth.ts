import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
import {
  applyAuthProfileConfig,
  validateAnthropicSetupToken,
} from "brikko-studio/plugin-sdk/provider-auth";
import { resolveQaAgentAuthDir, writeQaAuthProfiles } from "../shared/auth-store.js";

export const QA_LIVE_ANTHROPIC_SETUP_TOKEN_ENV = "BRIKKO_STUDIO_QA_LIVE_ANTHROPIC_SETUP_TOKEN";
export const QA_LIVE_SETUP_TOKEN_VALUE_ENV = "BRIKKO_STUDIO_LIVE_SETUP_TOKEN_VALUE";
const QA_LIVE_ANTHROPIC_SETUP_TOKEN_PROFILE_ENV = "BRIKKO_STUDIO_QA_LIVE_ANTHROPIC_SETUP_TOKEN_PROFILE";
const QA_LIVE_ANTHROPIC_SETUP_TOKEN_PROFILE_ID = "anthropic:qa-setup-token";

function resolveQaLiveAnthropicSetupToken(env: NodeJS.ProcessEnv = process.env) {
  const token = (
    env[QA_LIVE_ANTHROPIC_SETUP_TOKEN_ENV]?.trim() ||
    env[QA_LIVE_SETUP_TOKEN_VALUE_ENV]?.trim() ||
    ""
  ).replaceAll(/\s+/g, "");
  if (!token) {
    return null;
  }
  const tokenError = validateAnthropicSetupToken(token);
  if (tokenError) {
    throw new Error(`Invalid QA Anthropic setup-token: ${tokenError}`);
  }
  const profileId =
    env[QA_LIVE_ANTHROPIC_SETUP_TOKEN_PROFILE_ENV]?.trim() ||
    QA_LIVE_ANTHROPIC_SETUP_TOKEN_PROFILE_ID;
  return { token, profileId };
}

export async function stageQaLiveAnthropicSetupToken(params: {
  cfg: BrikkoStudioConfig;
  stateDir: string;
  env?: NodeJS.ProcessEnv;
}): Promise<BrikkoStudioConfig> {
  const resolved = resolveQaLiveAnthropicSetupToken(params.env);
  if (!resolved) {
    return params.cfg;
  }
  await writeQaAuthProfiles({
    agentDir: resolveQaAgentAuthDir({ stateDir: params.stateDir, agentId: "main" }),
    profiles: {
      [resolved.profileId]: {
        type: "token",
        provider: "anthropic",
        token: resolved.token,
      },
    },
  });
  return applyAuthProfileConfig(params.cfg, {
    profileId: resolved.profileId,
    provider: "anthropic",
    mode: "token",
    displayName: "QA setup-token",
  });
}
