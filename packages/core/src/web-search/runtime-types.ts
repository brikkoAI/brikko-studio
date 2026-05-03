import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import type {
  PluginWebSearchProviderEntry,
  WebSearchProviderToolDefinition,
} from "../plugins/web-provider-types.js";
import type { RuntimeWebSearchMetadata } from "../secrets/runtime-web-tools.types.js";

type WebSearchConfig = NonNullable<BrikkoStudioConfig["tools"]>["web"] extends infer Web
  ? Web extends { search?: infer Search }
    ? Search
    : undefined
  : undefined;

export type ResolveWebSearchDefinitionParams = {
  config?: BrikkoStudioConfig;
  sandboxed?: boolean;
  runtimeWebSearch?: RuntimeWebSearchMetadata;
  providerId?: string;
  preferRuntimeProviders?: boolean;
};

export type RunWebSearchParams = ResolveWebSearchDefinitionParams & {
  args: Record<string, unknown>;
  signal?: AbortSignal;
};

export type RunWebSearchResult = {
  provider: string;
  result: Record<string, unknown>;
};

export type ListWebSearchProvidersParams = {
  config?: BrikkoStudioConfig;
};

export type RuntimeWebSearchProviderEntry = PluginWebSearchProviderEntry;
export type RuntimeWebSearchToolDefinition = WebSearchProviderToolDefinition;
export type RuntimeWebSearchConfig = WebSearchConfig;
