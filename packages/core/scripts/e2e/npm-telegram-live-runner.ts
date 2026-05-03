// Telegram package Docker harness.
// Runs QA live transport code against the package candidate installed in Docker.

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function parseBoolean(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function splitCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function resolveCredentialSource(env: NodeJS.ProcessEnv) {
  return env.BRIKKO_STUDIO_NPM_TELEGRAM_CREDENTIAL_SOURCE ?? env.BRIKKO_STUDIO_QA_CREDENTIAL_SOURCE;
}

function resolveCredentialRole(env: NodeJS.ProcessEnv) {
  return env.BRIKKO_STUDIO_NPM_TELEGRAM_CREDENTIAL_ROLE ?? env.BRIKKO_STUDIO_QA_CREDENTIAL_ROLE;
}

async function resolveTrustedBrikko StudioCommand(rawCommand: string) {
  if (!path.isAbsolute(rawCommand)) {
    throw new Error("BRIKKO_STUDIO_NPM_TELEGRAM_SUT_COMMAND must be an absolute path.");
  }
  const commandName = path.basename(rawCommand);
  if (commandName !== "brikko-studio" && commandName !== "brikko-studio.cmd") {
    throw new Error(
      `BRIKKO_STUDIO_NPM_TELEGRAM_SUT_COMMAND must point to brikko-studio; got: ${commandName}`,
    );
  }
  const npmPrefix = process.env.NPM_CONFIG_PREFIX?.trim();
  if (!npmPrefix) {
    throw new Error("Missing NPM_CONFIG_PREFIX for installed brikko-studio command validation.");
  }
  const [realCommand, realPrefix] = await Promise.all([
    fs.realpath(rawCommand),
    fs.realpath(npmPrefix),
  ]);
  if (realCommand !== realPrefix && !realCommand.startsWith(`${realPrefix}${path.sep}`)) {
    throw new Error("BRIKKO_STUDIO_NPM_TELEGRAM_SUT_COMMAND must resolve inside NPM_CONFIG_PREFIX.");
  }
  return rawCommand;
}

async function main() {
  const { runTelegramQaLive } =
    await import("../../extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts");
  const rawSutBrikko StudioCommand = process.env.BRIKKO_STUDIO_NPM_TELEGRAM_SUT_COMMAND?.trim();
  if (!rawSutBrikko StudioCommand) {
    throw new Error("Missing BRIKKO_STUDIO_NPM_TELEGRAM_SUT_COMMAND.");
  }
  const sutBrikko StudioCommand = await resolveTrustedBrikko StudioCommand(rawSutBrikko StudioCommand);

  const repoRoot = path.resolve(process.env.BRIKKO_STUDIO_NPM_TELEGRAM_REPO_ROOT ?? process.cwd());
  const outputDir =
    process.env.BRIKKO_STUDIO_NPM_TELEGRAM_OUTPUT_DIR?.trim() ||
    path.join(repoRoot, ".artifacts", "qa-e2e", `npm-telegram-live-${Date.now().toString(36)}`);
  const result = await runTelegramQaLive({
    repoRoot,
    outputDir,
    sutBrikko StudioCommand,
    preflightInstalledOnboarding: true,
    providerMode: process.env.BRIKKO_STUDIO_NPM_TELEGRAM_PROVIDER_MODE,
    primaryModel: process.env.BRIKKO_STUDIO_NPM_TELEGRAM_MODEL,
    alternateModel: process.env.BRIKKO_STUDIO_NPM_TELEGRAM_ALT_MODEL,
    fastMode: parseBoolean(process.env.BRIKKO_STUDIO_NPM_TELEGRAM_FAST),
    scenarioIds: splitCsv(process.env.BRIKKO_STUDIO_NPM_TELEGRAM_SCENARIOS),
    sutAccountId: process.env.BRIKKO_STUDIO_NPM_TELEGRAM_SUT_ACCOUNT,
    credentialSource: resolveCredentialSource(process.env),
    credentialRole: resolveCredentialRole(process.env),
  });

  process.stdout.write(`Package Telegram QA report: ${result.reportPath}\n`);
  process.stdout.write(`Package Telegram QA summary: ${result.summaryPath}\n`);
  process.stdout.write(`Package Telegram QA observed messages: ${result.observedMessagesPath}\n`);
  if (
    !parseBoolean(process.env.BRIKKO_STUDIO_NPM_TELEGRAM_ALLOW_FAILURES) &&
    result.scenarios.some((scenario) => scenario.status === "fail")
  ) {
    process.exitCode = 1;
  }
}

async function formatRunnerErrorMessage(error: unknown) {
  try {
    const { formatErrorMessage } = await import("../../dist/infra/errors.js");
    return formatErrorMessage(error);
  } catch {
    return error instanceof Error ? error.message : String(error);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async (error) => {
    process.stderr.write(
      `package telegram live e2e failed: ${await formatRunnerErrorMessage(error)}\n`,
    );
    process.exitCode = 1;
  });
}

export const __testing = {
  resolveCredentialRole,
  resolveCredentialSource,
};
