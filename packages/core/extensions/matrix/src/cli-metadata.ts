import type { BrikkoStudioPluginApi } from "brikko-studio/plugin-sdk/channel-plugin-common";

export function registerMatrixCliMetadata(api: BrikkoStudioPluginApi) {
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
