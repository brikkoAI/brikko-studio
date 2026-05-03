import { definePluginEntry, type Brikko StudioPluginApi } from "./runtime-api.js";

export default definePluginEntry({
  id: "open-prose",
  name: "OpenProse",
  description: "Plugin-shipped prose skills bundle",
  register(_api: Brikko StudioPluginApi) {
    // OpenProse is delivered via plugin-shipped skills.
  },
});
