import type { ModelCatalogProvider } from "../types.js";

export type Brikko StudioProviderIndexPluginInstall = {
  clawhubSpec?: string;
  npmSpec?: string;
  defaultChoice?: "clawhub" | "npm";
  minHostVersion?: string;
  expectedIntegrity?: string;
};

export type Brikko StudioProviderIndexPlugin = {
  id: string;
  package?: string;
  source?: string;
  install?: Brikko StudioProviderIndexPluginInstall;
};

export type Brikko StudioProviderIndexProviderAuthChoice = {
  method: string;
  choiceId: string;
  choiceLabel: string;
  choiceHint?: string;
  assistantPriority?: number;
  assistantVisibility?: "visible" | "manual-only";
  groupId?: string;
  groupLabel?: string;
  groupHint?: string;
  optionKey?: string;
  cliFlag?: string;
  cliOption?: string;
  cliDescription?: string;
  onboardingScopes?: readonly ("text-inference" | "image-generation")[];
};

export type Brikko StudioProviderIndexProvider = {
  id: string;
  name: string;
  plugin: Brikko StudioProviderIndexPlugin;
  docs?: string;
  categories?: readonly string[];
  authChoices?: readonly Brikko StudioProviderIndexProviderAuthChoice[];
  previewCatalog?: ModelCatalogProvider;
};

export type Brikko StudioProviderIndex = {
  version: number;
  providers: Readonly<Record<string, Brikko StudioProviderIndexProvider>>;
};
