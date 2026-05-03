import type { Brikko StudioPluginApi } from "brikko-studio/plugin-sdk/channel-plugin-common";

export function registerMatrixCliMetadata(api: Brikko StudioPluginApi) {
  api.registerCli(
    async ({ program }) => {
      const { registerMatrixCli } = await import("./cli.js");
      registerMatrixCli({ program });
    },
    {
      descriptors: [
        {
          name: "matrix",
          description: "Manage Matrix accounts, verification, devices, and profile state",
          hasSubcommands: true,
        },
      ],
    },
  );
}
