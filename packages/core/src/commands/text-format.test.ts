import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("brikko-studio", 16)).toBe("brikko-studio");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("brikko-studio-status-output", 10)).toBe("brikko-studio-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});
