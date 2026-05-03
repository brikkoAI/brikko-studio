import type { BrikkoStudioConfig } from "../../config/types.brikko-studio.js";
import { listChannelPlugins } from "./registry.js";

type ChannelStartupLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

export async function runChannelPluginStartupMaintenance(params: {
  cfg: BrikkoStudioConfig;
  env?: NodeJS.ProcessEnv;
  log: ChannelStartupLogger;
  trigger?: string;
  logPrefix?: string;
}): Promise<void> {
  for (const plugin of listChannelPlugins()) {
    const runStartupMaintenance = plugin.lifecycle?.runStartupMaintenance;
    if (!runStartupMaintenance) {
      continue;
    }
    try {
      await runStartupMaintenance(params);
    } catch (err) {
      params.log.warn?.(
        `${params.logPrefix?.trim() || "gateway"}: ${plugin.id} startup maintenance failed; continuing: ${String(err)}`,
      );
    }
  }
}
