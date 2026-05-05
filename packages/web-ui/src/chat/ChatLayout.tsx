/**
 * Chat page composition.
 *
 * Transport: tries WebSocket first (`/ws/chat`), falls back to REST POST
 * (`/api/chat/completions`) if the WS handshake fails. The fallback path is
 * what makes the page usable during dev when core's WS endpoint isn't booted —
 * full streaming will be re-enabled once core ships /ws/chat.
 */
import { useCallback, useState } from "react";
import { ChatClient } from "./ws-client.js";
import { postChatCompletion, messagesToApiPayload } from "../api/chat.js";
import { MessageList } from "./MessageList.js";
import { ChatInput } from "./ChatInput.js";
import { SessionSidebar } from "./SessionSidebar.js";
import { ModelPicker } from "./ModelPicker.js";
import { useTranslation } from "../i18n/index.js";
import { DEFAULT_MODEL_ID, QUICK_EXAMPLES } from "./types.js";
import type { ChatMessage, Session } from "./types.js";

function wsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:3737/ws/chat";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/chat`;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ChatLayout(): JSX.Element {
  const t = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newSession = useCallback((): string => {
    const id = newId("ses");
    const session: Session = {
      id,
      title: `Диалог ${new Date().toLocaleTimeString()}`,
      created_at: new Date().toISOString(),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveId(id);
    setMessages((m) => ({ ...m, [id]: [] }));
    return id;
  }, []);

  const sendViaWs = useCallback(
    (sid: string, reqId: string, text: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const t0 = performance.now();
        const client = new ChatClient({
          url: wsUrl(),
          onDelta: (d) => {
            setMessages((m) => ({
              ...m,
              [sid]: (m[sid] ?? []).map((msg) =>
                msg.request_id === reqId && msg.role === "assistant"
                  ? { ...msg, text: msg.text + d.text }
                  : msg,
              ),
            }));
          },
          onDone: (d) => {
            const elapsed = Math.round(performance.now() - t0);
            setMessages((m) => ({
              ...m,
              [sid]: (m[sid] ?? []).map((msg) =>
                msg.request_id === reqId && msg.role === "assistant"
                  ? { ...msg, streaming: false, hallucinated: d.hallucinated, latency_ms: elapsed, model }
                  : msg,
              ),
            }));
            client.close();
            resolve();
          },
          onError: (e) => {
            client.close();
            reject(new Error(e.message));
          },
          onTransportError: (e) => {
            client.close();
            reject(e);
          },
        });
        client.connect()
          .then(() => client.send({ session_id: sid, request_id: reqId, text, model }))
          .catch((err) => reject(err instanceof Error ? err : new Error(String(err))));
      }),
    [model],
  );

  const sendViaRest = useCallback(
    async (sid: string, reqId: string, _text: string): Promise<void> => {
      // Get current message history (everything before our streaming-empty assistant).
      const history = (messages[sid] ?? []).filter(
        (m) => !(m.request_id === reqId && m.role === "assistant"),
      );
      const data = await postChatCompletion({
        session_id: sid,
        request_id: reqId,
        model,
        messages: messagesToApiPayload(history),
      });
      setMessages((m) => ({
        ...m,
        [sid]: (m[sid] ?? []).map((msg) =>
          msg.request_id === reqId && msg.role === "assistant"
            ? {
                ...msg,
                text: data.message.content,
                streaming: false,
                hallucinated: data.hallucinated,
                latency_ms: data.latency_ms,
                model: data.model ?? model,
              }
            : msg,
        ),
      }));
    },
    [messages, model],
  );

  const send = useCallback(
    async (text: string) => {
      let sid = activeId;
      if (!sid) sid = newSession();
      const reqId = newId("req");

      // Append user + streaming-assistant messages.
      setMessages((m) => ({
        ...m,
        [sid!]: [
          ...(m[sid!] ?? []),
          { request_id: reqId, role: "user", text },
          { request_id: reqId, role: "assistant", text: "", streaming: true, model },
        ],
      }));
      setBusy(true);
      setError(null);

      try {
        await sendViaWs(sid, reqId, text);
      } catch (wsErr) {
        // Fall back to REST. Dev mode: core's /ws/chat may not exist yet.
        try {
          await sendViaRest(sid, reqId, text);
        } catch (restErr) {
          const msg = restErr instanceof Error ? restErr.message : String(restErr);
          setError(msg);
          setMessages((m) => ({
            ...m,
            [sid!]: (m[sid!] ?? []).map((mm) =>
              mm.request_id === reqId && mm.role === "assistant"
                ? { ...mm, streaming: false, error: true, text: t("common.error.generic") }
                : mm,
            ),
          }));
          // Note: wsErr is intentionally swallowed — REST result is what user sees.
          void wsErr;
        }
      } finally {
        setBusy(false);
      }
    },
    [activeId, newSession, sendViaWs, sendViaRest, model, t],
  );

  const visibleMessages = activeId ? messages[activeId] ?? [] : [];

  return (
    <div className="chat-shell" data-testid="chat-shell">
      <SessionSidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={(id) => setActiveId(id)}
        onNew={newSession}
      />
      <div className="chat-main">
        <div className="chat-header">
          <ModelPicker value={model} onChange={setModel} disabled={busy} />
        </div>
        {error && (
          <div className="chat-banner error" data-testid="chat-error">
            {error}
          </div>
        )}
        <MessageList messages={visibleMessages} />
        {visibleMessages.length === 0 && (
          <div className="examples" data-testid="examples">
            <span className="muted" style={{ fontSize: "0.8rem", marginRight: "0.4rem" }}>
              {t("chat.examples.label")}:
            </span>
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                className="example-chip"
                onClick={() => send(ex.prompt)}
                disabled={busy}
                data-testid={`example-${ex.label}`}
              >
                {ex.label}
              </button>
            ))}
          </div>
        )}
        <ChatInput onSend={send} disabled={busy} />
        <div className="disclaimer">{t("chat.disclaimer")}</div>
      </div>
    </div>
  );
}
