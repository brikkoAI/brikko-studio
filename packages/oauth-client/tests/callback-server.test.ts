import { describe, it, expect } from "vitest";
import { startCallbackServer } from "../src/callback-server.js";

describe("startCallbackServer", () => {
  it("resolves with code+state on a valid GET /callback", async () => {
    const handle = await startCallbackServer({ port: 0, expectedState: "abc123" });
    const port = handle.port;
    const fetchPromise = fetch(`http://127.0.0.1:${port}/callback?code=xyz&state=abc123`);
    const result = await handle.waitForCallback();
    const resp = await fetchPromise;
    expect(result).toEqual({ code: "xyz", state: "abc123" });
    expect(resp.status).toBe(200);
    const body = await resp.text();
    expect(body).toContain("Brikko Studio");
    await handle.close();
  });

  it("rejects when state does not match", async () => {
    const handle = await startCallbackServer({ port: 0, expectedState: "expected" });
    const fetchPromise = fetch(`http://127.0.0.1:${handle.port}/callback?code=xyz&state=wrong`);
    await expect(handle.waitForCallback()).rejects.toThrow(/state mismatch/);
    const resp = await fetchPromise;
    expect(resp.status).toBe(400);
    await handle.close();
  });

  it("rejects when code is missing", async () => {
    const handle = await startCallbackServer({ port: 0, expectedState: "s" });
    const fetchPromise = fetch(`http://127.0.0.1:${handle.port}/callback?state=s`);
    await expect(handle.waitForCallback()).rejects.toThrow(/missing code/);
    await fetchPromise;
    await handle.close();
  });
});
