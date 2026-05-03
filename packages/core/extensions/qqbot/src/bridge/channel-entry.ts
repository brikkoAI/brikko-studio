/**
 * Orchestrator for the QQBot `registerFull` hook.
 *
 * Keeping this function in `src/bridge/` (rather than inline in the
 * `extensions/qqbot/index.ts` channel-entry contract) lets the composition
 * be unit-tested and aligns with the layering described in the double-repo
 * migration spec, where bridge-layer composition code is expected to live
 * under `src/bridge/` (or `src/bootstrap/` in the standalone variant).
 */

import type { BrikkoStudioPluginApi } from "brikko-studio/plugin-sdk/plugin-entry";
import { registerQQBotFrameworkCommands } from "./commands/framework-registration.js";
import { registerQQBotTools } from "./tools/index.js";

export function registerQQBotFull(api: BrikkoStudioPluginApi): void {
  registerQQBotTools(api);
  registerQQBotFrameworkCommands(api);
}
