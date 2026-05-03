import { vi } from "vitest";

const registryJitiMocks = vi.hoisted(() => ({
  createJiti: vi.fn(),
  discoverBrikkoStudioPlugins: vi.fn(),
  loadPluginManifestRegistry: vi.fn(),
  loadPluginRegistrySnapshot: vi.fn(),
}));

vi.mock("jiti", () => ({
  createJiti: (...args: Parameters<typeof registryJitiMocks.createJiti>) =>
    registryJitiMocks.createJiti(...args),
}));

vi.mock("../discovery.js", () => ({
  discoverBrikkoStudioPlugins: (
    ...args: Parameters<typeof registryJitiMocks.discoverBrikkoStudioPlugins>
  ) => registryJitiMocks.discoverBrikkoStudioPlugins(...args),
}));

vi.mock("../manifest-registry.js", () => ({
  loadPluginManifestRegistry: (
    ...args: Parameters<typeof registryJitiMocks.loadPluginManifestRegistry>
  ) => registryJitiMocks.loadPluginManifestRegistry(...args),
}));

vi.mock("../manifest-registry-installed.js", () => ({
  loadPluginManifestRegistryForInstalledIndex: (
    ...args: Parameters<typeof registryJitiMocks.loadPluginManifestRegistry>
  ) => registryJitiMocks.loadPluginManifestRegistry(...args),
}));

vi.mock("../plugin-registry.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../plugin-registry.js")>();
  return {
    ...actual,
    loadPluginRegistrySnapshot: (
      ...args: Parameters<typeof registryJitiMocks.loadPluginRegistrySnapshot>
    ) => registryJitiMocks.loadPluginRegistrySnapshot(...args),
    loadPluginManifestRegistryForPluginRegistry: (
      ...args: Parameters<typeof registryJitiMocks.loadPluginManifestRegistry>
    ) => registryJitiMocks.loadPluginManifestRegistry(...args),
  };
});
export function resetRegistryJitiMocks(): void {
  registryJitiMocks.createJiti.mockReset();
  registryJitiMocks.discoverBrikkoStudioPlugins.mockReset();
  registryJitiMocks.loadPluginManifestRegistry.mockReset();
  registryJitiMocks.loadPluginRegistrySnapshot.mockReset();
  registryJitiMocks.discoverBrikkoStudioPlugins.mockReturnValue({
    candidates: [],
    diagnostics: [],
  });
  registryJitiMocks.loadPluginRegistrySnapshot.mockReturnValue({
    diagnostics: [],
    plugins: [],
  });
  registryJitiMocks.createJiti.mockImplementation(
    (_modulePath: string, _options?: Record<string, unknown>) => () => ({ default: {} }),
  );
}

export function getRegistryJitiMocks() {
  return registryJitiMocks;
}
