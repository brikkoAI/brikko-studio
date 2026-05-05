/**
 * REST fallback for `/api/chat/completions` — used when WebSocket is unavailable
 * (e.g. during dev when core's WS endpoint isn't booted yet).
 *
 * Wire format mirrors the OpenAI chat-completions response shape so swapping
 * to a streaming SSE/WS transport is a drop-in.
 */
import type { ChatMessage } from "../chat/types.js";

export interface ChatCompletionRequest {
  session_id: string;
  request_id: string;
  model: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export interface ChatCompletionResponse {
  request_id: string;
  message: { role: "assistant"; content: string };
  hallucinated?: Array<{ placeholder: string }>;
  latency_ms?: number;
  model?: string;
}

const ENDPOINT = "/api/chat/completions";

export async function postChatCompletion(
  req: ChatCompletionRequest,
  signal?: AbortSignal,
): Promise<ChatCompletionResponse> {
  const t0 = performance.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`chat_completion_failed:${res.status}:${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as ChatCompletionResponse;
  if (data.latency_ms == null) data.latency_ms = Math.round(performance.now() - t0);
  return data;
}

/**
 * Convert UI message history to API request payload.
 * Filters out streaming/error placeholders.
 */
export function messagesToApiPayload(
  messages: ChatMessage[],
): ChatCompletionRequest["messages"] {
  return messages
    .filter((m) => !m.error && (m.role === "user" || (m.role === "assistant" && m.text.length > 0)))
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.text }));
}
