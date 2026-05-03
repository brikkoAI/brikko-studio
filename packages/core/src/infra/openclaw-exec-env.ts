export const BRIKKO_STUDIO_CLI_ENV_VAR = "BRIKKO_STUDIO_CLI";
export const BRIKKO_STUDIO_CLI_ENV_VALUE = "1";

export function markBrikkoStudioExecEnv<T extends Record<string, string | undefined>>(env: T): T {
  return {
    ...env,
    [BRIKKO_STUDIO_CLI_ENV_VAR]: BRIKKO_STUDIO_CLI_ENV_VALUE,
  };
}

export function ensureBrikkoStudioExecMarkerOnProcess(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  env[BRIKKO_STUDIO_CLI_ENV_VAR] = BRIKKO_STUDIO_CLI_ENV_VALUE;
  return env;
}
