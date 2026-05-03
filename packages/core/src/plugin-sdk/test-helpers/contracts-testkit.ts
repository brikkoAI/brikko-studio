import type { BrikkoStudioPluginApi } from "../plugin-entry.js";
import {
  createPluginRecord,
  createPluginRegistry,
  registerProviderPlugins as registerProviders,
  requireRegisteredProvider as requireProvider,
  type BrikkoStudioConfig,
  type PluginRecord,
  type PluginRuntime,
} from "../testing.js";
export { assertNoImportTimeSideEffects } from "./import-side-effects.js";
import { uniqueSortedStrings } from "./string-utils.js";

export { registerProviders, requireProvider, uniqueSortedStrings };

export function createPluginRegistryFixture(config = {} as BrikkoStudioConfig) {
  return {
    config,
    registry: createPluginRegistry({
      logger: {
        info() {},
        warn() {},
        error() {},
        debug() {},
      },
      runtime: {} as PluginRuntime,
    }),
  };
}

export function registerTestPlugin(params: {
  registry: ReturnType<typeof createPluginRegistry>;
  config: BrikkoStudioConfig;
  record: PluginRecord;
  register(api: BrikkoStudioPluginApi): void;
}) {
  params.registry.registry.plugins.push(params.record);
  params.register(
    params.registry.createApi(params.record, {
      config: params.config,
    }),
  );
}

export function registerVirtualTestPlugin(params: {
  registry: ReturnType<typeof createPluginRegistry>;
  config: BrikkoStudioConfig;
  id: string;
  name: string;
  source?: string;
  kind?: PluginRecord["kind"];
  contracts?: PluginRecord["contracts"];
  register(this: void, api: BrikkoStudioPluginApi): void;
}) {
  registerTestPlugin({
    registry: params.registry,
    config: params.config,
    record: createPluginRecord({
      id: params.id,
      name: params.name,
      source: params.source ?? `/virtual/${params.id}/index.ts`,
      ...(params.kind ? { kind: params.kind } : {}),
      ...(params.contracts ? { contracts: params.contracts } : {}),
    }),
    register: params.register,
  });
}
