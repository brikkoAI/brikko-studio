import { describe, expect, it } from "vitest";
import type { BrikkoStudioConfig } from "../config/config.js";
import {
  applyOpencodeZenModelDefault,
  OPENCODE_ZEN_DEFAULT_MODEL,
} from "../plugin-sdk/opencode.js";

function expectPrimaryModelChanged(
  applied: { changed: boolean; next: BrikkoStudioConfig },
  primary: string,
) {
  expect(applied.changed).toBe(true);
  expect(applied.next.agents?.defaults?.model).toEqual({ primary });
}

function expectConfigUnchanged(
  applied: { changed: boolean; next: BrikkoStudioConfig },
  cfg: BrikkoStudioConfig,
) {
  expect(applied.changed).toBe(false);
  expect(applied.next).toEqual(cfg);
}

describe("applyOpencodeZenModelDefault", () => {
  it("sets defaults when model is unset", () => {
    const cfg: BrikkoStudioConfig = { agents: { defaults: {} } };
    const applied = applyOpencodeZenModelDefault(cfg);
    expectPrimaryModelChanged(applied, OPENCODE_ZEN_DEFAULT_MODEL);
  });

  it("overrides existing models", () => {
    const cfg = {
      agents: { defaults: { model: "anthropic/claude-opus-4-6" } },
    } as BrikkoStudioConfig;
    const applied = applyOpencodeZenModelDefault(cfg);
    expectPrimaryModelChanged(applied, OPENCODE_ZEN_DEFAULT_MODEL);
  });

  it("no-ops when already legacy opencode-zen default", () => {
    const cfg = {
      agents: { defaults: { model: "opencode-zen/claude-opus-4-5" } },
    } as BrikkoStudioConfig;
    const applied = applyOpencodeZenModelDefault(cfg);
    expectConfigUnchanged(applied, cfg);
  });

  it("preserves fallbacks when setting primary", () => {
    const cfg: BrikkoStudioConfig = {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-opus-4-6",
            fallbacks: ["google/gemini-3-pro"],
          },
        },
      },
    };
    const applied = applyOpencodeZenModelDefault(cfg);
    expect(applied.changed).toBe(true);
    expect(applied.next.agents?.defaults?.model).toEqual({
      primary: OPENCODE_ZEN_DEFAULT_MODEL,
      fallbacks: ["google/gemini-3-pro"],
    });
  });

  it("no-ops when already on the current default", () => {
    const cfg = {
      agents: { defaults: { model: OPENCODE_ZEN_DEFAULT_MODEL } },
    } as BrikkoStudioConfig;
    const applied = applyOpencodeZenModelDefault(cfg);
    expectConfigUnchanged(applied, cfg);
  });
});
