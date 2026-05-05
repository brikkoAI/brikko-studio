import type { PluginConfig } from "./config.js";
import {
  AnonymizerRequestError,
  AnonymizerUnavailableError,
  StreamProtocolError,
} from "./errors.js";

/**
 * Streaming PII restorer.
 *
 * The 32-char carry buffer holds a tail-fragment that *might* be the head
 * of an incomplete placeholder, e.g. `<NAM` waiting for `E_1>`. We never
 * forward such a fragment to the anonymizer until either:
 *   (a) the next chunk completes the placeholder (we send the whole thing), or
 *   (b) the source stream ends (we emit the fragment verbatim — the LLM
 *       genuinely produced a literal `<NA`).
 *
 * Why 32 chars: the largest placeholder we mint is `<BANK_ACCOUNT_999>`
 * (18 chars). Doubling that gives a 14-char safety margin for future
 * categories without churning the constant.
 *
 * Wire protocol (NDJSON over a streaming POST request):
 *   line 1 (control header): {"workspace_id": "...", "request_id": "..."}
 *   line N (chunk events):   {"type":"chunk","text":"..."}
 *   final line:              {"type":"end"}
 *
 * Response (NDJSON streamed back):
 *   chunk events: {"type":"chunk","text":"..."}
 *   end event:    {"type":"end","hallucinated":[...]}
 *
 * Mirrors `apps/gateway/voltari_gateway/pii/streaming.py` carry-buffer
 * semantics so the gateway and Studio share one model under audit review.
 */

const CARRY_BUFFER_SIZE = 32;

export interface RestoreStreamOptions {
  cfg: PluginConfig;
  workspaceId: string;
  requestId: string;
  source: AsyncIterable<string>;
}

/**
 * Wrap the upstream LLM's text-delta stream with a transformer that
 * proxies through POST /restore_stream and yields restored chunks.
 */
export async function* restoreStream(
  opts: RestoreStreamOptions,
): AsyncIterable<string> {
  const url = opts.cfg.anonymizerUrl + "/restore_stream";
  const { source, workspaceId, requestId } = opts;

  // Build the request body as a ReadableStream<Uint8Array>. Native fetch
  // (Node 22) accepts a ReadableStream body when `duplex: "half"` is set.
  const encoder = new TextEncoder();
  const requestBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Control header line.
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              workspace_id: workspaceId,
              request_id: requestId,
            }) + "\n",
          ),
        );

        let carry = "";
        for await (const chunk of source) {
          const combined = carry + chunk;
          // If the tail looks like an incomplete placeholder (a `<` with no
          // matching `>` after it, within the carry-buffer window),
          // hold the suffix back until the next chunk arrives.
          const tailWindowStart = Math.max(
            0,
            combined.length - CARRY_BUFFER_SIZE,
          );
          const lastLt = combined.lastIndexOf("<");
          const safeBoundary =
            lastLt >= tailWindowStart && combined.indexOf(">", lastLt) < 0
              ? lastLt
              : -1;
          let toSend: string;
          if (safeBoundary >= 0) {
            toSend = combined.slice(0, safeBoundary);
            carry = combined.slice(safeBoundary);
          } else {
            toSend = combined;
            carry = "";
          }
          if (toSend) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "chunk", text: toSend }) + "\n",
              ),
            );
          }
        }
        // Flush whatever remained in carry — even if it's a partial
        // placeholder, the source is over and we must not eat user-visible text.
        if (carry) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "chunk", text: carry }) + "\n",
            ),
          );
        }
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "end" }) + "\n"),
        );
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  // Send the request. Native fetch + AbortSignal.timeout for headers timeout.
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-ndjson" },
      body: requestBody,
      // duplex: "half" is required by the WHATWG fetch spec when sending
      // a ReadableStream body. Node 22 supports it; the type isn't in lib.dom
      // yet, so cast through `RequestInit & {duplex: string}`.
      ...({ duplex: "half" } as { duplex: "half" }),
      signal: AbortSignal.timeout(opts.cfg.requestTimeoutMs),
    } as RequestInit & { duplex: "half" });
  } catch (err) {
    throw new AnonymizerUnavailableError(url, err);
  }

  if (res.status >= 400) {
    const body = await res.text();
    throw new AnonymizerRequestError(res.status, body);
  }
  if (!res.body) {
    throw new StreamProtocolError("response had no body");
  }

  // Parse NDJSON response chunks.
  const decoder = new TextDecoder("utf-8");
  let buf = "";
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        let evt: { type: string; text?: string };
        try {
          evt = JSON.parse(line) as { type: string; text?: string };
        } catch {
          throw new StreamProtocolError(
            `malformed NDJSON line: ${line.slice(0, 80)}`,
          );
        }
        if (evt.type === "chunk" && typeof evt.text === "string") {
          yield evt.text;
        } else if (evt.type === "end") {
          // hallucinated info is dropped on the floor in the iterable form.
          // Callers needing it should use restoreStreamWithMetadata() (Task 21).
          return;
        } else {
          throw new StreamProtocolError(
            `unknown NDJSON event type: ${String(evt.type)}`,
          );
        }
      }
    }
    // Trailing buffered line without newline (e.g. malformed sidecar).
    if (buf.trim()) {
      throw new StreamProtocolError(
        `unterminated NDJSON line: ${buf.slice(0, 80)}`,
      );
    }
  } finally {
    reader.releaseLock();
  }
}
