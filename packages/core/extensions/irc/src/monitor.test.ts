import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#brikko-studio",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#brikko-studio",
      rawTarget: "#brikko-studio",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "brikko-studio-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "brikko-studio-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "brikko-studio-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "brikko-studio-bot",
      rawTarget: "brikko-studio-bot",
    });
  });
});
