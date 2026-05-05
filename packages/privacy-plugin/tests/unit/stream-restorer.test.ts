/**
 * Unit tests for StreamRestorer (the carry-buffer chunk transformer).
 *
 * The StreamRestorer wraps an upstream `AsyncIterable<string>` of LLM
 * deltas in a transformer that:
 *   1. Holds up to 32 chars at the tail in a carry buffer if the tail
 *      contains an incomplete placeholder fragment (`<NAM` waiting for `E_1>`).
 *   2. Forwards each safe-to-emit chunk to the anonymizer via NDJSON over
 *      a streaming POST /restore_stream request.
 *   3. Yields the restored chunks the sidecar streams back.
 *
 * These tests verify both ends:
 *   - The output stream is correctly reassembled from sidecar restored chunks.
 *   - The request body the sidecar receives never contains a fragmented
 *     placeholder (i.e. the carry buffer holds them across source ticks).
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { restoreStream } from "../../src/stream-restorer.js";

const ANON_BASE = "http://anonymizer:8403";
const cfg = {
  anonymizerUrl: ANON_BASE,
  requestTimeoutMs: 1000,
  circuitBreakerMs: 30_000,
  toolPoliciesPath: "/dev/null",
  debugLogging: false,
  maxRetries: 1,
  retryBaseDelayMs: 5,
} as const;

/** Capture what NDJSON chunk payloads the sidecar received. */
let lastReceivedChunks: string[] = [];

function buildHandler() {
  return http.post(`${ANON_BASE}/restore_stream`, async ({ request }) => {
    const body = await request.text();
    const lines = body.split("\n").filter(Boolean);
    const chunks: string[] = [];
    for (const line of lines) {
      const evt = JSON.parse(line);
      if (evt.type === "chunk") chunks.push(evt.text);
    }
    lastReceivedChunks = [...chunks];
    const restored = chunks
      .join("")
      .replace(/<NAME_1>/g, "Иванов")
      .replace(/<INN_1>/g, "7707083893");
    const ndjson =
      JSON.stringify({ type: "chunk", text: restored }) +
      "\n" +
      JSON.stringify({ type: "end", hallucinated: [] }) +
      "\n";
    return new HttpResponse(ndjson, {
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
    });
  });
}

const server = setupServer(buildHandler());
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers(buildHandler());
  lastReceivedChunks = [];
});
afterAll(() => server.close());

async function* fromArray(items: string[]): AsyncIterable<string> {
  for (const i of items) yield i;
}

async function collect(iter: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const x of iter) out.push(x);
  return out;
}

describe("StreamRestorer", () => {
  it("restores single-chunk placeholders", async () => {
    const out = await collect(
      restoreStream({
        cfg,
        workspaceId: "ws_test",
        requestId: "req_1",
        source: fromArray(["Передам <NAME_1> о <INN_1>"]),
      }),
    );
    expect(out.join("")).toBe("Передам Иванов о 7707083893");
  });

  it("restores a placeholder split across two chunks", async () => {
    const out = await collect(
      restoreStream({
        cfg,
        workspaceId: "ws_test",
        requestId: "req_2",
        source: fromArray(["Привет <NAM", "E_1>!"]),
      }),
    );
    expect(out.join("")).toBe("Привет Иванов!");
    // Carry buffer must not let any received chunk contain a partial
    // placeholder (i.e. an unbalanced `<` without a matching `>`).
    for (const c of lastReceivedChunks) {
      const lastLt = c.lastIndexOf("<");
      const lastGt = c.lastIndexOf(">");
      expect(lastLt < 0 || lastGt > lastLt).toBe(true);
    }
  });

  it("restores a placeholder split across three chunks", async () => {
    const out = await collect(
      restoreStream({
        cfg,
        workspaceId: "ws_test",
        requestId: "req_3",
        source: fromArray(["x ", "<", "NAME_1>"]),
      }),
    );
    expect(out.join("")).toBe("x Иванов");
  });

  it("emits trailing carry on flush even if it was incomplete", async () => {
    const out = await collect(
      restoreStream({
        cfg,
        workspaceId: "ws_test",
        requestId: "req_4",
        source: fromArray(["abc <NA"]),
      }),
    );
    // Truncated source: emit as-is, no restoration possible.
    expect(out.join("")).toBe("abc <NA");
  });

  it("propagates AnonymizerUnavailableError when sidecar is offline", async () => {
    server.use(
      http.post(`${ANON_BASE}/restore_stream`, () => HttpResponse.error()),
    );
    await expect(
      collect(
        restoreStream({
          cfg,
          workspaceId: "ws_test",
          requestId: "req_5",
          source: fromArray(["<NAME_1>"]),
        }),
      ),
    ).rejects.toThrow(/Anonymizer/i);
  });

  it("forwards workspace_id and request_id in the control header line", async () => {
    let receivedHeader: { workspace_id?: string; request_id?: string } = {};
    server.use(
      http.post(`${ANON_BASE}/restore_stream`, async ({ request }) => {
        const body = await request.text();
        const firstLine = body.split("\n")[0] ?? "";
        receivedHeader = JSON.parse(firstLine);
        return new HttpResponse(
          JSON.stringify({ type: "end" }) + "\n",
          { status: 200, headers: { "content-type": "application/x-ndjson" } },
        );
      }),
    );
    await collect(
      restoreStream({
        cfg,
        workspaceId: "ws_42",
        requestId: "req_42",
        source: fromArray([""]),
      }),
    );
    expect(receivedHeader.workspace_id).toBe("ws_42");
    expect(receivedHeader.request_id).toBe("req_42");
  });
});
