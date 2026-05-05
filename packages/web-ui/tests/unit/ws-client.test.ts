/**
 * Tests for ws-client.ts — uses a fake WebSocket implementation registered
 * on globalThis to drive the lifecycle without a real server.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChatClient, type ChatDelta, type ChatDone, type ChatError } from "../../src/chat/ws-client.js";

interface FakeListeners {
  open: Array<() => void>;
  message: Array<(ev: { data: string }) => void>;
  error: Array<() => void>;
  close: Array<() => void>;
}

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  readyState = 0;
  sent: string[] = [];
  listeners: FakeListeners = { open: [], message: [], error: [], close: [] };

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener<K extends keyof FakeListeners>(
    type: K,
    cb: FakeListeners[K][number],
  ): void {
    (this.listeners[type] as Array<typeof cb>).push(cb);
  }

  removeEventListener<K extends keyof FakeListeners>(
    type: K,
    cb: FakeListeners[K][number],
  ): void {
    const arr = this.listeners[type] as Array<typeof cb>;
    const i = arr.indexOf(cb);
    if (i >= 0) arr.splice(i, 1);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    for (const cb of this.listeners.close) cb();
  }

  // Test helpers
  fireOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    for (const cb of this.listeners.open) cb();
  }

  fireMessage(payload: unknown): void {
    for (const cb of this.listeners.message) cb({ data: JSON.stringify(payload) });
  }

  fireError(): void {
    for (const cb of this.listeners.error) cb();
  }
}

describe("ChatClient", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    (globalThis as unknown as { WebSocket: typeof FakeWebSocket }).WebSocket = FakeWebSocket;
  });

  afterEach(() => {
    delete (globalThis as { WebSocket?: unknown }).WebSocket;
  });

  it("connects, sends user_message, receives delta + done", async () => {
    const deltas: ChatDelta[] = [];
    const dones: ChatDone[] = [];
    const errors: ChatError[] = [];
    const transportErrors: string[] = [];

    const client = new ChatClient({
      url: "ws://x/ws/chat",
      onDelta: (d) => deltas.push(d),
      onDone: (d) => dones.push(d),
      onError: (e) => errors.push(e),
      onTransportError: (e) => transportErrors.push(e.message),
    });

    const connectPromise = client.connect();
    const fake = FakeWebSocket.instances[0]!;
    expect(fake.url).toBe("ws://x/ws/chat");

    fake.fireOpen();
    await connectPromise;

    client.send({ session_id: "s1", request_id: "r1", text: "hi", model: "m" });
    expect(fake.sent).toHaveLength(1);
    expect(JSON.parse(fake.sent[0]!)).toEqual({
      type: "user_message",
      session_id: "s1",
      request_id: "r1",
      text: "hi",
      model: "m",
    });

    fake.fireMessage({ type: "delta", request_id: "r1", text: "Hello " });
    fake.fireMessage({ type: "delta", request_id: "r1", text: "world" });
    fake.fireMessage({ type: "done", request_id: "r1", hallucinated: [{ placeholder: "<NAME_99>" }] });

    expect(deltas.map((d) => d.text)).toEqual(["Hello ", "world"]);
    expect(dones).toHaveLength(1);
    expect(dones[0]!.hallucinated).toEqual([{ placeholder: "<NAME_99>" }]);
    expect(errors).toEqual([]);
    expect(transportErrors).toEqual([]);
  });

  it("rejects connect() if ws errors before open", async () => {
    const client = new ChatClient({
      url: "ws://bad/ws",
      onDelta: () => {},
      onDone: () => {},
      onError: () => {},
      onTransportError: () => {},
    });
    const promise = client.connect();
    const fake = FakeWebSocket.instances[0]!;
    fake.fireError();
    await expect(promise).rejects.toThrow(/ws_open_failed/);
  });

  it("emits transport error on send when not connected", () => {
    const transportErrors: string[] = [];
    const client = new ChatClient({
      url: "ws://x/ws/chat",
      onDelta: () => {},
      onDone: () => {},
      onError: () => {},
      onTransportError: (e) => transportErrors.push(e.message),
    });
    client.send({ session_id: "s", request_id: "r", text: "hi" });
    expect(transportErrors).toEqual(["ws_not_open"]);
  });

  it("reports transport error on malformed JSON", async () => {
    const transportErrors: string[] = [];
    const client = new ChatClient({
      url: "ws://x/ws/chat",
      onDelta: () => {},
      onDone: () => {},
      onError: () => {},
      onTransportError: (e) => transportErrors.push(e.message),
    });
    const connectPromise = client.connect();
    const fake = FakeWebSocket.instances[0]!;
    fake.fireOpen();
    await connectPromise;

    // Bypass fireMessage's JSON.stringify to inject malformed data:
    for (const cb of fake.listeners.message) cb({ data: "{not-json" });
    expect(transportErrors).toEqual(["malformed_json"]);
  });

  it("dispatches error type to onError callback", async () => {
    const errors: ChatError[] = [];
    const client = new ChatClient({
      url: "ws://x/ws/chat",
      onDelta: () => {},
      onDone: () => {},
      onError: (e) => errors.push(e),
      onTransportError: () => {},
    });
    const connectPromise = client.connect();
    const fake = FakeWebSocket.instances[0]!;
    fake.fireOpen();
    await connectPromise;
    fake.fireMessage({ type: "error", request_id: "r1", message: "model_failed" });
    expect(errors).toEqual([{ type: "error", request_id: "r1", message: "model_failed" }]);
  });
});
