export type Brikko StudioPiCodingAgentSkillSourceAugmentation = never;

declare module "@mariozechner/pi-coding-agent" {
  interface Skill {
    // Brikko Studio relies on the source identifier returned by pi skill loaders.
    source: string;
  }
}
