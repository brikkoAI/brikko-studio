import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MOCK_PNG_BASE64, MOCK_PNG_DATA_URL, toDataURL } = vi.hoisted(() => {
  const MOCK_PNG_BASE64 = "ZmFrZXBuZw==";
  const MOCK_PNG_DATA_URL = `data:image/png;base64,${MOCK_PNG_BASE64}`;
  return {
    MOCK_PNG_BASE64,
    MOCK_PNG_DATA_URL,
    toDataURL: vi.fn(async () => MOCK_PNG_DATA_URL),
  };
});

vi.mock("qrcode", () => ({
  default: {
    toDataURL,
  },
}));

import {
  formatQrPngDataUrl,
  renderQrPngBase64,
  renderQrPngDataUrl,
  writeQrPngTempFile,
} from "./qr-image.ts";

describe("renderQrPngBase64", () => {
  const tmpRoot = path.join(os.tmpdir(), "brikko-studio-qr-image-tests");

  beforeEach(() => {
    toDataURL.mockClear();
    toDataURL.mockResolvedValue(MOCK_PNG_DATA_URL);
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it("delegates PNG rendering to qrcode", async () => {
    await expect(renderQrPngBase64("brikko-studio", { scale: 8, marginModules: 2 })).resolves.toBe(
      MOCK_PNG_BASE64,
    );
    expect(toDataURL).toHaveBeenCalledWith("brikko-studio", {
      margin: 2,
      scale: 8,
      type: "image/png",
    });
  });

  it("uses the default PNG rendering options", async () => {
    await renderQrPngBase64("brikko-studio");
    expect(toDataURL).toHaveBeenCalledWith("brikko-studio", {
      margin: 4,
      scale: 6,
      type: "image/png",
    });
  });

  it("floors finite PNG rendering options before delegating", async () => {
    await renderQrPngBase64("brikko-studio", { scale: 8.9, marginModules: 2.9 });
    expect(toDataURL).toHaveBeenCalledWith("brikko-studio", {
      margin: 2,
      scale: 8,
      type: "image/png",
    });
  });

  it.each([
    ["scale", 0, 4, "scale must be between 1 and 12."],
    ["scale", 13, 4, "scale must be between 1 and 12."],
    ["scale", Number.NaN, 4, "scale must be a finite number."],
    ["marginModules", 6, -1, "marginModules must be between 0 and 16."],
    ["marginModules", 6, 17, "marginModules must be between 0 and 16."],
    ["marginModules", 6, Number.POSITIVE_INFINITY, "marginModules must be a finite number."],
  ])("rejects invalid %s values", async (_name, scale, marginModules, message) => {
    await expect(renderQrPngBase64("brikko-studio", { scale, marginModules })).rejects.toThrow(message);
    expect(toDataURL).not.toHaveBeenCalled();
  });

  it("rejects non-PNG qrcode data URLs", async () => {
    toDataURL.mockResolvedValue("data:image/svg+xml;base64,PHN2Zz4=");
    await expect(renderQrPngBase64("brikko-studio")).rejects.toThrow(
      "Expected qrcode to return a PNG data URL.",
    );
  });

  it("formats QR PNG data URLs", async () => {
    expect(formatQrPngDataUrl(MOCK_PNG_BASE64)).toBe(`data:image/png;base64,${MOCK_PNG_BASE64}`);
    await expect(renderQrPngDataUrl("brikko-studio")).resolves.toBe(
      `data:image/png;base64,${MOCK_PNG_BASE64}`,
    );
  });

  it("writes QR PNGs to a scoped temp file", async () => {
    await fs.mkdir(tmpRoot, { recursive: true });

    const result = await writeQrPngTempFile("brikko-studio", {
      tmpRoot,
      dirPrefix: "pair-",
      fileName: "pair-qr.png",
    });

    expect(path.basename(result.filePath)).toBe("pair-qr.png");
    expect(path.basename(result.dirPath)).toMatch(/^pair-/);
    expect(result.mediaLocalRoots).toEqual([result.dirPath]);
    await expect(fs.readFile(result.filePath, "utf8")).resolves.toBe("fakepng");
  });

  it.each([
    ["dirPrefix", { dirPrefix: "../pair-", fileName: "qr.png" }],
    ["fileName", { dirPrefix: "pair-", fileName: "../qr.png" }],
  ])("rejects pathful QR temp %s values", async (name, opts) => {
    await expect(
      writeQrPngTempFile("brikko-studio", {
        tmpRoot,
        dirPrefix: opts.dirPrefix,
        fileName: opts.fileName,
      }),
    ).rejects.toThrow(`${name} must be a non-empty filename segment.`);
    expect(toDataURL).not.toHaveBeenCalled();
  });
});
