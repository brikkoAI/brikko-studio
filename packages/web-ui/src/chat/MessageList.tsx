import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble.js";
import type { ChatMessage } from "./types.js";

export interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message OR streaming-text growth.
  // We use length + last-message-text-length as the dependency so chunk
  // streaming triggers scroll without a deep equality check.
  const last = messages[messages.length - 1];
  const lastLen = last?.text.length ?? 0;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, lastLen]);

  return (
    <div ref={ref} className="message-list" data-testid="message-list">
      {messages.map((m, i) => (
        <MessageBubble key={`${m.request_id}-${m.role}-${i}`} message={m} />
      ))}
    </div>
  );
}
