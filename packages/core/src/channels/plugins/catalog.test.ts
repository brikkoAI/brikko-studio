import { describe, expect, it } from "vitest";
import { getChannelPluginCatalogEntry } from "./catalog.js";

describe("channel plugin catalog", () => {
  it("keeps third-party official channel ids mapped to their published plugin ids", () => {
    const options = {
      workspaceDir: "/tmp/brikko-studio-channel-catalog-empty-workspace",
      env: {},
    };

    expect(getChannelPluginCatalogEntry("wecom", options)).toEqual(
      expect.objectContaining({
        id: "wecom",
        pluginId: "wecom-brikko-studio-plugin",
        trustedSourceLinkedOfficialInstall: true,
        install: expect.objectContaining({
          npmSpec: "@wecom/wecom-brikko-studio-plugin@2026.4.23",
        }),
      }),
    );
    expect(getChannelPluginCatalogEntry("yuanbao", options)).toEqual(
      expect.objectContaining({
        id: "yuanbao",
        pluginId: "brikko-studio-plugin-yuanbao",
        trustedSourceLinkedOfficialInstall: true,
        install: expect.objectContaining({
          npmSpec: "brikko-studio-plugin-yuanbao@2.11.0",
        }),
      }),
    );
  });
});
