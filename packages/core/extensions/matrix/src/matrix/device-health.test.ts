import { describe, expect, it } from "vitest";
import { isBrikkoStudioManagedMatrixDevice, summarizeMatrixDeviceHealth } from "./device-health.js";

describe("matrix device health", () => {
  it("detects BrikkoStudio-managed device names", () => {
    expect(isBrikkoStudioManagedMatrixDevice("BrikkoStudio Gateway")).toBe(true);
    expect(isBrikkoStudioManagedMatrixDevice("BrikkoStudio Debug")).toBe(true);
    expect(isBrikkoStudioManagedMatrixDevice("Element iPhone")).toBe(false);
    expect(isBrikkoStudioManagedMatrixDevice(null)).toBe(false);
  });

  it("summarizes stale BrikkoStudio-managed devices separately from the current device", () => {
    const summary = summarizeMatrixDeviceHealth([
      {
        deviceId: "du314Zpw3A",
        displayName: "BrikkoStudio Gateway",
        current: true,
      },
      {
        deviceId: "BritdXC6iL",
        displayName: "BrikkoStudio Gateway",
        current: false,
      },
      {
        deviceId: "G6NJU9cTgs",
        displayName: "BrikkoStudio Debug",
        current: false,
      },
      {
        deviceId: "phone123",
        displayName: "Element iPhone",
        current: false,
      },
    ]);

    expect(summary.currentDeviceId).toBe("du314Zpw3A");
    expect(summary.currentBrikkoStudioDevices).toEqual([
      expect.objectContaining({ deviceId: "du314Zpw3A" }),
    ]);
    expect(summary.staleBrikkoStudioDevices).toEqual([
      expect.objectContaining({ deviceId: "BritdXC6iL" }),
      expect.objectContaining({ deviceId: "G6NJU9cTgs" }),
    ]);
  });
});
