export type MatrixManagedDeviceInfo = {
  deviceId: string;
  displayName: string | null;
  current: boolean;
};

export type MatrixDeviceHealthSummary = {
  currentDeviceId: string | null;
  staleBrikko StudioDevices: MatrixManagedDeviceInfo[];
  currentBrikko StudioDevices: MatrixManagedDeviceInfo[];
};

const BRIKKO_STUDIO_DEVICE_NAME_PREFIX = "Brikko Studio ";

export function isBrikko StudioManagedMatrixDevice(displayName: string | null | undefined): boolean {
  return displayName?.startsWith(BRIKKO_STUDIO_DEVICE_NAME_PREFIX) === true;
}

export function summarizeMatrixDeviceHealth(
  devices: MatrixManagedDeviceInfo[],
): MatrixDeviceHealthSummary {
  const currentDeviceId = devices.find((device) => device.current)?.deviceId ?? null;
  const openClawDevices = devices.filter((device) =>
    isBrikko StudioManagedMatrixDevice(device.displayName),
  );
  return {
    currentDeviceId,
    staleBrikko StudioDevices: openClawDevices.filter((device) => !device.current),
    currentBrikko StudioDevices: openClawDevices.filter((device) => device.current),
  };
}
