# Plugin Architecture (Brikko Studio M2)

This document records the plugin contract Brikko Studio Core inherits from upstream OpenClaw, as observed on 2026-05-04 at upstream commit `cdc00614`. It is the basis for the `@brikko/privacy-plugin` design.

## Hard constraint

The plugin MUST NOT modify any file inside `packages/core/src/`. The only permitted touchpoints in `packages/core/` are:
- `packages/core/extensions/brikko-privacy/` — our plugin's own directory (a sibling of upstream's built-in plugins)

If a future hook need exceeds the upstream API, escalate to the CEO before editing core. There is no fallback "monkey-patch" path.

## Upstream plugin loader

- **File:** `packages/core/src/plugins/loader.ts`
- **Discovery:** the loader scans `packages/core/extensions/*/` for directories containing `openclaw.plugin.json`. Any plugin manifest with `"activation": { "onStartup": true }` is loaded automatically when Studio Core starts.
- **Externally installed plugins** are tracked in `installed-plugin-index-store.ts` (state file under user data dir). For Brikko Privacy we use the in-tree path; npm distribution comes later.

There is **no** monolithic `plugins.json` config file to edit. Activation is a property of each plugin's own manifest.

## Plugin manifest shape (`openclaw.plugin.json`)

```json
{
  "id": "brikko-privacy",
  "name": "Brikko Privacy",
  "description": "Reversible PII anonymization via local sidecar",
  "activation": { "onStartup": true },
  "configSchema": { "type": "object", "additionalProperties": false, "properties": { /* ... */ } },
  "uiHints": { /* per-field labels for the Settings UI */ }
}
```

`id` must be unique across all loaded plugins. `configSchema` is JSON-Schema and validates `pluginConfig` passed to `register(api)` at runtime.

## Plugin entry shape (`index.ts`)

```typescript
import {
  definePluginEntry,
  type OpenClawPluginApi,
} from "@brikko/studio-core/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "brikko-privacy",
  name: "Brikko Privacy",
  description: "...",
  register(api: OpenClawPluginApi) {
    api.on("before_prompt_build", async (event, ctx) => { /* mutate */ });
    api.on("message_received", async (event, ctx) => { /* observe */ });
    // ... more api.on(...) calls
  },
});
```

`register(api)` runs once per plugin load (at startup). All hook subscriptions happen here. The plugin holds module-scoped state (e.g. the `AnonymizerClient`).

## OpenClawPluginApi surface (subset used by Brikko Privacy)

- `api.on<K extends PluginHookName>(hookName, handler, opts?)` — subscribe to a lifecycle hook
- `api.logger.info|warn|error|debug(msg, fields?)` — structured logging
- `api.runtime.config.current()` — read live config
- `api.pluginConfig` — our plugin's section of the workspace config (validated against `configSchema`)
- `api.id`, `api.version`, `api.source` — plugin metadata

## Hook lifecycle (the seven we use)

Upstream defines 35 hook names. Brikko Privacy subscribes to exactly seven. Each hook receives an `event` (data) and a `ctx` (agent/session/tool context, depending on hook category). Handlers may return `void` (accept) or a typed result object (mutate / block).

### 1. `message_received` (observe)
**Fires:** when a user message arrives at the inbox, before any agent processing.
**Event:** `PluginHookMessageReceivedEvent` — `{ text, channel, sessionKey, ... }`
**Mutation:** none — observation only. Used for **audit-log writes** (record the raw PII detection at the boundary, regardless of whether anonymization later succeeds).

### 2. `before_prompt_build` (mutate)
**Fires:** after `before_model_resolve`, immediately before the prompt is assembled for the LLM call. This is the choke point where we replace PII with placeholders.
**Event:** `PluginHookBeforePromptBuildEvent` — includes the user prompt text and message history.
**Result:** `PluginHookBeforePromptBuildResult` — return `{ prompt: maskedText, ... }` to substitute.
**Used for:** the actual anonymization call. The handler does `client.anonymize({ text: event.prompt, ... })` and returns the masked text.

### 3. `before_agent_reply` (mutate)
**Fires:** non-streaming path, after the LLM finishes generating but before the reply is dispatched to the user.
**Event:** `PluginHookBeforeAgentReplyEvent` — `{ cleanedBody: string }`
**Result:** `PluginHookBeforeAgentReplyResult` — `{ reply?: ReplyPayload, handled?: boolean }`.
**Used for:** restoring placeholders (`<NAME_1>` → `Иванов`) in the LLM's response before the user sees it.

### 4. `message_sending` (mutate)
**Fires:** streaming path, before each outbound message chunk is sent.
**Event:** `PluginHookMessageSendingEvent` — `{ text, channel, ... }`
**Result:** `PluginHookMessageSendingResult` — return `{ text: restored }` to substitute.
**Used for:** stream-mode placeholder restoration (chunked).

### 5. `before_tool_call` (mutate / block)
**Fires:** before any tool is invoked by the agent.
**Event:** `PluginHookBeforeToolCallEvent` — `{ toolName, params, runId, toolCallId }`
**Result:** `PluginHookBeforeToolCallResult` — return `{ params: rewritten }` to substitute args, or `{ block: true, blockReason: "..." }` to abort.
**Used for:** trust-policy enforcement (block forbidden tools like `third_party_ai.send` when policy denies) AND placeholder de-anonymization for trusted tools (replace `<NAME_1>` in `args.client` with real `Иванов` before the tool call goes out).

### 6. `tool_result_persist` (mutate)
**Fires:** before a tool result is written into the conversation transcript.
**Event:** `PluginHookToolResultPersistEvent` — `{ toolName, message: AgentMessage, isSynthetic? }`
**Result:** `PluginHookToolResultPersistResult` — return `{ message: rewritten }` to substitute.
**Used for:** anonymizing PII that comes BACK from external APIs in tool results (e.g. CRM returns `client.full_name = "Иванов"` → we mask before the LLM sees the next prompt iteration).

### 7. `before_message_write` (mutate / block)
**Fires:** before any agent message (assistant turn, tool result, system note) is persisted to the session transcript.
**Event:** `PluginHookBeforeMessageWriteEvent` — `{ message: AgentMessage, sessionKey, agentId }`
**Result:** `PluginHookBeforeMessageWriteResult` — return `{ message: rewritten }` or `{ block: true }`.
**Used for:** memory-write anonymization (when memory layer derives long-term notes from session transcripts, ensure stored notes contain placeholders, not raw PII). Maps to spec §4.1 `pre_memory_write`.

## Spec-to-upstream hook map

Brikko Privacy spec §4.1 defines six conceptual hooks. They map to seven upstream hooks because OpenClaw splits observation from mutation for two of them:

| Spec hook | Upstream hook(s) | Purpose |
|---|---|---|
| `pre_user_message` | `message_received` + `before_prompt_build` | Audit log first, then mutate prompt |
| `post_llm_response` (non-stream) | `before_agent_reply` | Restore placeholders pre-dispatch |
| `post_llm_response` (stream) | `message_sending` | Restore placeholders per-chunk |
| `pre_tool_call` | `before_tool_call` | Policy + de-anonymize args |
| `post_tool_result` | `tool_result_persist` | Re-anonymize tool output |
| `pre_llm_call` | `before_prompt_build` (same as above) | Final mutation point pre-LLM |
| `pre_memory_write` | `before_message_write` | Anonymize before transcript persist |

Coverage is complete. No core modifications required. Full research notes (with file:line refs and risk register) are at `brikko-studio-research/M2_NOTES.md` (not committed to this repo).

## How `@brikko/privacy-plugin` registers

The plugin lives at `packages/core/extensions/brikko-privacy/`:
- `openclaw.plugin.json` — manifest with `activation.onStartup: true`
- `index.ts` — entry that calls `definePluginEntry({ register(api) { /* api.on(...) */ } })`
- `src/`, `tests/` — implementation and test source

Because the path is under `packages/core/extensions/*` (already a pnpm workspace member per `pnpm-workspace.yaml`) AND the manifest declares startup activation, the upstream loader picks it up automatically. **No edit to any file inside `packages/core/src/` is needed.**

## References

- Upstream plugin types: `packages/core/src/plugins/types.ts`
- Upstream hook contract: `packages/core/src/plugins/hook-types.ts` (lines 70-105 for hook names, 789-937 for handler signatures)
- Reference plugin (good pattern): `packages/core/extensions/active-memory/index.ts`
- Plugin SDK barrel: `@brikko/studio-core/plugin-sdk/plugin-entry` (re-exports `definePluginEntry`, `OpenClawPluginApi`)
