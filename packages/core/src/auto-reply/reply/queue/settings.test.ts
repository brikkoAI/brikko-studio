import { describe, expect, it } from "vitest";
import type { BrikkoStudioConfig } from "../../../config/types.brikko-studio.js";
import { resolveQueueSettings } from "./settings.js";

describe("resolveQueueSettings", () => {
  it("defaults inbound channels to steer with a short followup debounce", () => {
    expect(resolveQueueSettings({ cfg: {} as BrikkoStudioConfig })).toEqual({
      mode: "steer",
      debounceMs: 500,
      cap: 20,
      dropPolicy: "summarize",
    });
  });

  it("uses the short debounce when collect is selected globally", () => {
    expect(
      resolveQueueSettings({
        cfg: {
          messages: {
            queue: {
              mode: "collect",
            },
          },
        } as BrikkoStudioConfig,
      }),
    ).toEqual({
      mode: "collect",
      debounceMs: 500,
      cap: 20,
      dropPolicy: "summarize",
    });
  });

  it("keeps explicit channel queue overrides ahead of defaults", () => {
    expect(
      resolveQueueSettings({
        cfg: {
          messages: {
            queue: {
              mode: "steer",
              debounceMs: 750,
              byChannel: {
                discord: "collect",
              },
            },
          },
        } as BrikkoStudioConfig,
        channel: "discord",
      }),
    ).toEqual({
      mode: "collect",
      debounceMs: 750,
      cap: 20,
      dropPolicy: "summarize",
    });
  });

  it("keeps legacy queue mode distinct from steer", () => {
    expect(
      resolveQueueSettings({
        cfg: {
          messages: {
            queue: {
              mode: "queue",
            },
          },
        } as BrikkoStudioConfig,
      }),
    ).toMatchObject({
      mode: "queue",
    });
  });
});
