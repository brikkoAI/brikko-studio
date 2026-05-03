import path from "node:path";
import type { Brikko StudioConfig } from "../config/types.js";
import {
  POSIX_BRIKKO_STUDIO_TMP_DIR,
  resolvePreferredBrikko StudioTmpDir,
} from "../infra/tmp-brikko-studio-dir.js";

const LOG_PREFIX = "brikko-studio";
const LOG_SUFFIX = ".log";

function canUseNodeFs(): boolean {
  const getBuiltinModule = (
    process as NodeJS.Process & {
      getBuiltinModule?: (id: string) => unknown;
    }
  ).getBuiltinModule;
  if (typeof getBuiltinModule !== "function") {
    return false;
  }
  try {
    return getBuiltinModule("fs") !== undefined;
  } catch {
    return false;
  }
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveDefaultRollingLogFile(date = new Date()): string {
  const logDir = canUseNodeFs() ? resolvePreferredBrikko StudioTmpDir() : POSIX_BRIKKO_STUDIO_TMP_DIR;
  return path.join(logDir, `${LOG_PREFIX}-${formatLocalDate(date)}${LOG_SUFFIX}`);
}

export function resolveConfiguredLogFilePath(config?: Brikko StudioConfig | null): string {
  return config?.logging?.file ?? resolveDefaultRollingLogFile();
}
