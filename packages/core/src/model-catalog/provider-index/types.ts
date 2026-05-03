import type { ModelCatalogProvider } from "../types.js";

export type BrikkoStudioProviderIndexPluginInstall = {
  clawhubSpec?: string;
  npmSpec?: string;
  defaultChoice?: "clawhub" | "npm";
  minHostVersion?: string;
  expectedIntegrity?: string;
};

export type BrikkoStudioProviderIndexPlugin = {
  id: string;
  package?: string;
  source?: string;
  install?: BrikkoStudioProviderIndexPluginInstall;
};

export type BrikkoStudioProviderIndexProviderAuthChoice = {
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

export type BrikkoStudioProviderIndexProvider = {
  id: string;
  name: string;
  plugin: BrikkoStudioProviderIndexPlugin;
  docs?: string;
  categories?: readonly string[];
  authChoices?: readonly BrikkoStudioProviderIndexProviderAuthChoice[];
  previewCatalog?: ModelCatalogProvider;
};

export type BrikkoStudioProviderIndex = {
  version: number;
  providers: Readonly<Record<string, BrikkoStudioProviderIndexProvider>>;
};
