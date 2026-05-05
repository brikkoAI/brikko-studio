/**
 * Minimal WebSocket client for Studio Core's `/ws/chat` endpoint.
 *
 * Wire format:
 *   client → server: { type: "user_message", session_id, request_id, text, model }
 *   server → client: { type: "delta",   request_id, text }            (one or more)
 *   server → client: { type: "done",    request_id, hallucinated?: [{ placeholder }] }
 *   server → client: { type: "error",   request_id, message }
 *
 * Connection lifecycle: caller `connect()` → `send()` → callbacks fire →
 * caller `close()`. The class does NOT auto-reconnect; callers re-instantiate.
 */

export interface ChatDelta { type: "delta"; request_id: string; text: string; }
export interface ChatDone { type: "done"; request_id: string; hallucinated?: Array<{ placeholder: string }>; }
export interface ChatError { type: "error"; request_id: string; message: string; }
export type ServerMessage = ChatDelta | ChatDone | ChatError;

export interface ChatClientOpts {
  url: string;
  onDelta(d: ChatDelta): void;
  onDone(d: ChatDone): void;
  onError(d: ChatError): void;
  onTransportError(err: Error): void;
}

export interface SendPayload {
  session_id: string;
  request_id: string;
  text: string;
  model?: string;
}

export class ChatClient {
  private ws: WebSocket | null = null;
  private opts: ChatClientOpts;

  constructor(opts: ChatClientOpts) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.opts.url);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      const ws = this.ws;

      const onOpen = () => { cleanup(); resolve(); };
      const onErrorBeforeOpen = () => { cleanup(); reject(new Error("ws_open_failed")); };
      const cleanup = () => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onErrorBeforeOpen);
      };

      ws.addEventListener("open", onOpen);
      ws.addEventListener("error", onErrorBeforeOpen);
      ws.addEventListener("message", (ev: MessageEvent) => {
        let msg: ServerMessage;
        try {
          const raw = typeof ev.data === "string"
            ? ev.data
            : ev.data instanceof ArrayBuffer
              ? new TextDecoder().decode(ev.data)
              : String(ev.data);
          msg = JSON.parse(raw) as ServerMessage;
        } catch {
          this.opts.onTransportError(new Error("malformed_json"));
          return;
        }
        if (msg.type === "delta") this.opts.onDelta(msg);
        else if (msg.type === "done") this.opts.onDone(msg);
        else if (msg.type === "error") this.opts.onError(msg);
      });
      ws.addEventListener("close", () => { this.ws = null; });
    });
  }

  send(payload: SendPayload): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.opts.onTransportError(new Error("ws_not_open"));
      return;
    }
    this.ws.send(JSON.stringify({ type: "user_message", ...payload }));
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  get isOpen(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}
