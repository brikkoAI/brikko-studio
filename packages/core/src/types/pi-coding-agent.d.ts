export type BrikkoStudioPiCodingAgentSkillSourceAugmentation = never;

declare module "@mariozechner/pi-coding-agent" {
  interface Skill {
    // BrikkoStudio relies on the source identifier returned by pi skill loaders.
    source: string;
  }
}
