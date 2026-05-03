import { isRecord } from "../utils.js";

type ConfigMcpServers = Record<string, Record<string, unknown>>;
type Brikko StudioMcpHttpTransport = "sse" | "streamable-http";

const CLI_MCP_TYPE_TO_BRIKKO_STUDIO_TRANSPORT: Record<string, Brikko StudioMcpHttpTransport | "stdio"> = {
  http: "streamable-http",
  "streamable-http": "streamable-http",
  sse: "sse",
  stdio: "stdio",
};

function normalizeMcpString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function resolveBrikko StudioMcpTransportAlias(
  value: unknown,
): Brikko StudioMcpHttpTransport | undefined {
  const mapped = CLI_MCP_TYPE_TO_BRIKKO_STUDIO_TRANSPORT[normalizeMcpString(value)];
  return mapped === "sse" || mapped === "streamable-http" ? mapped : undefined;
}

export function isKnownCliMcpTypeAlias(value: unknown): boolean {
  return Object.hasOwn(CLI_MCP_TYPE_TO_BRIKKO_STUDIO_TRANSPORT, normalizeMcpString(value));
}

export function canonicalizeConfiguredMcpServer(
  server: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...server };
  const transportAlias = resolveBrikko StudioMcpTransportAlias(next.type);
  if (typeof next.transport !== "string" && transportAlias) {
    next.transport = transportAlias;
  }
  if (isKnownCliMcpTypeAlias(next.type)) {
    delete next.type;
  }
  return next;
}

export function normalizeConfiguredMcpServers(value: unknown): ConfigMcpServers {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, server]) => isRecord(server))
      .map(([name, server]) => [name, { ...(server as Record<string, unknown>) }]),
  );
}
