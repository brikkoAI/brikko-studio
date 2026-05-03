import { describe, expect, it } from "vitest";
import { isBrikko StudioManagedMatrixDevice, summarizeMatrixDeviceHealth } from "./device-health.js";

describe("matrix device health", () => {
  it("detects Brikko Studio-managed device names", () => {
    expect(isBrikko StudioManagedMatrixDevice("Brikko Studio Gateway")).toBe(true);
    expect(isBrikko StudioManagedMatrixDevice("Brikko Studio Debug")).toBe(true);
    expect(isBrikko StudioManagedMatrixDevice("Element iPhone")).toBe(false);
    expect(isBrikko StudioManagedMatrixDevice(null)).toBe(false);
  });

  it("summarizes stale Brikko Studio-managed devices separately from the current device", () => {
    const summary = summarizeMatrixDeviceHealth([
      {
        deviceId: "du314Zpw3A",
        displayName: "Brikko Studio Gateway",
        current: true,
      },
      {
        deviceId: "BritdXC6iL",
        displayName: "Brikko Studio Gateway",
        current: false,
      },
      {
        deviceId: "G6NJU9cTgs",
        displayName: "Brikko Studio Debug",
        current: false,
      },
      {
        deviceId: "phone123",
        displayName: "Element iPhone",
        current: false,
      },
    ]);

    expect(summary.currentDeviceId).toBe("du314Zpw3A");
    expect(summary.currentBrikko StudioDevices).toEqual([
      expect.objectContaining({ deviceId: "du314Zpw3A" }),
    ]);
    expect(summary.staleBrikko StudioDevices).toEqual([
      expect.objectContaining({ deviceId: "BritdXC6iL" }),
      expect.objectContaining({ deviceId: "G6NJU9cTgs" }),
    ]);
  });
});
