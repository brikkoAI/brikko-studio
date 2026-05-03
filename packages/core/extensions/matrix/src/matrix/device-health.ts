export type MatrixManagedDeviceInfo = {
  deviceId: string;
  displayName: string | null;
  current: boolean;
};

export type MatrixDeviceHealthSummary = {
  currentDeviceId: string | null;
  staleBrikkoStudioDevices: MatrixManagedDeviceInfo[];
  currentBrikkoStudioDevices: MatrixManagedDeviceInfo[];
};

const BRIKKO_STUDIO_DEVICE_NAME_PREFIX = "BrikkoStudio ";

export function isBrikkoStudioManagedMatrixDevice(displayName: string | null | undefined): boolean {
  return displayName?.startsWith(BRIKKO_STUDIO_DEVICE_NAME_PREFIX) === true;
}

export function summarizeMatrixDeviceHealth(
  devices: MatrixManagedDeviceInfo[],
): MatrixDeviceHealthSummary {
  const currentDeviceId = devices.find((device) => device.current)?.deviceId ?? null;
  const openClawDevices = devices.filter((device) =>
    isBrikkoStudioManagedMatrixDevice(device.displayName),
  );
  return {
    currentDeviceId,
    staleBrikkoStudioDevices: openClawDevices.filter((device) => !device.current),
    currentBrikkoStudioDevices: openClawDevices.filter((device) => device.current),
  };
}
