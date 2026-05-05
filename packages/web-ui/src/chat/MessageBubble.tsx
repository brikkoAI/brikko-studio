import clsx from "clsx";
import { PlaceholderRender } from "./PlaceholderRender.js";
import type { ChatMessage } from "./types.js";

export interface BubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: BubbleProps): JSX.Element {
  const { role, text, hallucinated, streaming, latency_ms, model, error } = message;
  return (
    <div
      className={clsx("bubble", role === "user" ? "bubble-user" : "bubble-assistant")}
      data-testid={`bubble-${role}`}
    >
      {streaming && text.length === 0 ? (
        <span className="muted">…</span>
      ) : (
        <PlaceholderRender text={text} hallucinated={hallucinated ?? []} />
      )}
      {role === "assistant" && !streaming && !error && (latency_ms != null || model) && (
        <div className="bubble-meta">
          {model ? `${model}` : null}
          {model && latency_ms != null ? " · " : null}
          {latency_ms != null ? `${latency_ms} мс` : null}
        </div>
      )}
    </div>
  );
}
