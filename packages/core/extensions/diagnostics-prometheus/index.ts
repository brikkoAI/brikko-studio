import { definePluginEntry } from "brikko-studio/plugin-sdk/plugin-entry";
import { createDiagnosticsPrometheusExporter } from "./src/service.js";

const exporter = createDiagnosticsPrometheusExporter();

export default definePluginEntry({
  id: "diagnostics-prometheus",
  name: "Diagnostics Prometheus",
  description: "Expose Brikko Studio diagnostics metrics in Prometheus text format",
  register(api) {
    api.registerService(exporter.service);
    api.registerHttpRoute({
      path: "/api/diagnostics/prometheus",
      auth: "gateway",
      match: "exact",
      gatewayRuntimeScopeSurface: "trusted-operator",
      handler: exporter.handler,
    });
  },
});
