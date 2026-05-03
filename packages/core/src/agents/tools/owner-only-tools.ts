export const BRIKKO_STUDIO_OWNER_ONLY_CORE_TOOL_NAMES = ["cron", "gateway", "nodes"] as const;

const BRIKKO_STUDIO_OWNER_ONLY_CORE_TOOL_NAME_SET: ReadonlySet<string> = new Set(
  BRIKKO_STUDIO_OWNER_ONLY_CORE_TOOL_NAMES,
);

export function isBrikkoStudioOwnerOnlyCoreToolName(toolName: string): boolean {
  return BRIKKO_STUDIO_OWNER_ONLY_CORE_TOOL_NAME_SET.has(toolName);
}
