import type { AnonymizerClient } from "./anonymizer-client.js";

/**
 * Mask `content` for the long-term memory layer.
 *
 * Per spec §4.6, persisted memory must never contain real PII — the
 * mappings live in the anonymizer's workspace store with `scope=workspace`
 * so future reads can resolve placeholders back to originals.
 *
 * Kept as a standalone helper so future call sites (e.g. an explicit
 * `memory write` REST endpoint) can reuse the same masking semantics.
 */
export async function maskMemoryContent(
  client: AnonymizerClient,
  workspaceId: string,
  requestId: string,
  content: string,
): Promise<string> {
  const out = await client.anonymize({
    workspace_id: workspaceId,
    request_id: requestId,
    text: content,
  });
  return out.masked_text;
}
