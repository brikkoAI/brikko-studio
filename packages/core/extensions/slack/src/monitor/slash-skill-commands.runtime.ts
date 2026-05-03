import { listSkillCommandsForAgents as listSkillCommandsForAgentsImpl } from "brikko-studio/plugin-sdk/command-auth";

type ListSkillCommandsForAgents =
  typeof import("brikko-studio/plugin-sdk/command-auth").listSkillCommandsForAgents;

export function listSkillCommandsForAgents(
  ...args: Parameters<ListSkillCommandsForAgents>
): ReturnType<ListSkillCommandsForAgents> {
  return listSkillCommandsForAgentsImpl(...args);
}
