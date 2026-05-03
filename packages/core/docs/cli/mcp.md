---
summary: "Expose Brikko Studio channel conversations over MCP and manage saved MCP server definitions"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to Brikko Studio-backed channels
  - Running `brikko-studio mcp serve`
  - Managing Brikko Studio-saved MCP server definitions
title: "MCP"
sidebarTitle: "MCP"
---

`brikko-studio mcp` has two jobs:

- run Brikko Studio as an MCP server with `brikko-studio mcp serve`
- manage Brikko Studio-owned outbound MCP server definitions with `list`, `show`, `set`, and `unset`

In other words:

- `serve` is Brikko Studio acting as an MCP server
- `list` / `show` / `set` / `unset` is Brikko Studio acting as an MCP client-side registry for other MCP servers its runtimes may consume later

Use [`brikko-studio acp`](/cli/acp) when Brikko Studio should host a coding harness session itself and route that runtime through ACP.

## Brikko Studio as an MCP server

This is the `brikko-studio mcp serve` path.

### When to use `serve`

Use `brikko-studio mcp serve` when:

- Codex, Claude Code, or another MCP client should talk directly to Brikko Studio-backed channel conversations
- you already have a local or remote Brikko Studio Gateway with routed sessions
- you want one MCP server that works across Brikko Studio's channel backends instead of running separate per-channel bridges

Use [`brikko-studio acp`](/cli/acp) instead when Brikko Studio should host the coding runtime itself and keep the agent session inside Brikko Studio.

### How it works

`brikko-studio mcp serve` starts a stdio MCP server. The MCP client owns that process. While the client keeps the stdio session open, the bridge connects to a local or remote Brikko Studio Gateway over WebSocket and exposes routed channel conversations over MCP.

<Steps>
  <Step title="Client spawns the bridge">
    The MCP client spawns `brikko-studio mcp serve`.
  </Step>
  <Step title="Bridge connects to Gateway">
    The bridge connects to the Brikko Studio Gateway over WebSocket.
  </Step>
  <Step title="Sessions become MCP conversations">
    Routed sessions become MCP conversations and transcript/history tools.
  </Step>
  <Step title="Live events queue">
    Live events are queued in memory while the bridge is connected.
  </Step>
  <Step title="Optional Claude push">
    If Claude channel mode is enabled, the same session can also receive Claude-specific push notifications.
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Important behavior">
    - live queue state starts when the bridge connects
    - older transcript history is read with `messages_read`
    - Claude push notifications only exist while the MCP session is alive
    - when the client disconnects, the bridge exits and the live queue is gone
    - one-shot agent entry points such as `brikko-studio agent` and `brikko-studio infer model run` retire any bundled MCP runtimes they open when the reply completes, so repeated scripted runs do not accumulate stdio MCP child processes
    - stdio MCP servers launched by Brikko Studio (bundled or user-configured) are torn down as a process tree on shutdown, so child subprocesses started by the server do not survive after the parent stdio client exits
    - deleting or resetting a session disposes that session's MCP clients through the shared runtime cleanup path, so there are no lingering stdio connections tied to a removed session

  </Accordion>
</AccordionGroup>

### Choose a client mode

Use the same bridge in two different ways:

<Tabs>
  <Tab title="Generic MCP clients">
    Standard MCP tools only. Use `conversations_list`, `messages_read`, `events_poll`, `events_wait`, `messages_send`, and the approval tools.
  </Tab>
  <Tab title="Claude Code">
    Standard MCP tools plus the Claude-specific channel adapter. Enable `--claude-channel-mode on` or leave the default `auto`.
  </Tab>
</Tabs>

<Note>
Today, `auto` behaves the same as `on`. There is no client capability detection yet.
</Note>

### What `serve` exposes

The bridge uses existing Gateway session route metadata to expose channel-backed conversations. A conversation appears when Brikko Studio already has session state with a known route such as:

- `channel`
- recipient or destination metadata
- optional `accountId`
- optional `threadId`

This gives MCP clients one place to:

- list recent routed conversations
- read recent transcript history
- wait for new inbound events
- send a reply back through the same route
- see approval requests that arrive while the bridge is connected

### Usage

<Tabs>
  <Tab title="Local Gateway">
    ```bash
    brikko-studio mcp serve
    ```
  </Tab>
  <Tab title="Remote Gateway (token)">
    ```bash
    brikko-studio mcp serve --url wss://gateway-host:18789 --token-file ~/.brikko-studio/gateway.token
    ```
  </Tab>
  <Tab title="Remote Gateway (password)">
    ```bash
    brikko-studio mcp serve --url wss://gateway-host:18789 --password-file ~/.brikko-studio/gateway.password
    ```
  </Tab>
  <Tab title="Verbose / Claude off">
    ```bash
    brikko-studio mcp serve --verbose
    brikko-studio mcp serve --claude-channel-mode off
    ```
  </Tab>
</Tabs>

### Bridge tools

The current bridge exposes these MCP tools:

<AccordionGroup>
  <Accordion title="conversations_list">
    Lists recent session-backed conversations that already have route metadata in Gateway session state.

    Useful filters:

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    Returns one conversation by `session_key` using a direct Gateway session lookup.
  </Accordion>
  <Accordion title="messages_read">
    Reads recent transcript messages for one session-backed conversation.
  </Accordion>
  <Accordion title="attachments_fetch">
    Extracts non-text message content blocks from one transcript message. This is a metadata view over transcript content, not a standalone durable attachment blob store.
  </Accordion>
  <Accordion title="events_poll">
    Reads queued live events since a numeric cursor.
  </Accordion>
  <Accordion title="events_wait">
    Long-polls until the next matching queued event arrives or a timeout expires.

    Use this when a generic MCP client needs near-real-time delivery without a Claude-specific push protocol.

  </Accordion>
  <Accordion title="messages_send">
    Sends text back through the same route already recorded on the session.

    Current behavior:

    - requires an existing conversation route
    - uses the session's channel, recipient, account id, and thread id
    - sends text only

  </Accordion>
  <Accordion title="permissions_list_open">
    Lists pending exec/plugin approval requests the bridge has observed since it connected to the Gateway.
  </Accordion>
  <Accordion title="permissions_respond">
    Resolves one pending exec/plugin approval request with:

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### Event model

The bridge keeps an in-memory event queue while it is connected.

Current event types:

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- the queue is live-only; it starts when the MCP bridge starts
- `events_poll` and `events_wait` do not replay older Gateway history by themselves
- durable backlog should be read with `messages_read`

</Warning>

### Claude channel notifications

The bridge can also expose Claude-specific channel notifications. This is the Brikko Studio equivalent of a Claude Code channel adapter: standard MCP tools remain available, but live inbound messages can also arrive as Claude-specific MCP notifications.

<Tabs>
  <Tab title="off">
    `--claude-channel-mode off`: standard MCP tools only.
  </Tab>
  <Tab title="on">
    `--claude-channel-mode on`: enable Claude channel notifications.
  </Tab>
  <Tab title="auto (default)">
    `--claude-channel-mode auto`: current default; same bridge behavior as `on`.
  </Tab>
</Tabs>

When Claude channel mode is enabled, the server advertises Claude experimental capabilities and can emit:

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Current bridge behavior:

- inbound `user` transcript messages are forwarded as `notifications/claude/channel`
- Claude permission requests received over MCP are tracked in-memory
- if the linked conversation later sends `yes abcde` or `no abcde`, the bridge converts that to `notifications/claude/channel/permission`
- these notifications are live-session only; if the MCP client disconnects, there is no push target

This is intentionally client-specific. Generic MCP clients should rely on the standard polling tools.

### MCP client config

Example stdio client config:

```json
{
  "mcpServers": {
    "brikko-studio": {
      "command": "brikko-studio",
      "args": [
        "mcp",
        "serve",
        "--url",
        "wss://gateway-host:18789",
        "--token-file",
        "/path/to/gateway.token"
      ]
    }
  }
}
```

For most generic MCP clients, start with the standard tool surface and ignore Claude mode. Turn Claude mode on only for clients that actually understand the Claude-specific notification methods.

### Options

`brikko-studio mcp serve` supports:

<ParamField path="--url" type="string">
  Gateway WebSocket URL.
</ParamField>
<ParamField path="--token" type="string">
  Gateway token.
</ParamField>
<ParamField path="--token-file" type="string">
  Read token from file.
</ParamField>
<ParamField path="--password" type="string">
  Gateway password.
</ParamField>
<ParamField path="--password-file" type="string">
  Read password from file.
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Claude notification mode.
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  Verbose logs on stderr.
</ParamField>

<Tip>
Prefer `--token-file` or `--password-file` over inline secrets when possible.
</Tip>

### Security and trust boundary

The bridge does not invent routing. It only exposes conversations that Gateway already knows how to route.

That means:

- sender allowlists, pairing, and channel-level trust still belong to the underlying Brikko Studio channel configuration
- `messages_send` can only reply through an existing stored route
- approval state is live/in-memory only for the current bridge session
- bridge auth should use the same Gateway token or password controls you would trust for any other remote Gateway client

If a conversation is missing from `conversations_list`, the usual cause is not MCP configuration. It is missing or incomplete route metadata in the underlying Gateway session.

### Testing

Brikko Studio ships a deterministic Docker smoke for this bridge:

```bash
pnpm test:docker:mcp-channels
```

That smoke:

- starts a seeded Gateway container
- starts a second container that spawns `brikko-studio mcp serve`
- verifies conversation discovery, transcript reads, attachment metadata reads, live event queue behavior, and outbound send routing
- validates Claude-style channel and permission notifications over the real stdio MCP bridge

This is the fastest way to prove the bridge works without wiring a real Telegram, Discord, or iMessage account into the test run.

For broader testing context, see [Testing](/help/testing).

### Troubleshooting

<AccordionGroup>
  <Accordion title="No conversations returned">
    Usually means the Gateway session is not already routable. Confirm that the underlying session has stored channel/provider, recipient, and optional account/thread route metadata.
  </Accordion>
  <Accordion title="events_poll or events_wait misses older messages">
    Expected. The live queue starts when the bridge connects. Read older transcript history with `messages_read`.
  </Accordion>
  <Accordion title="Claude notifications do not show up">
    Check all of these:

    - the client kept the stdio MCP session open
    - `--claude-channel-mode` is `on` or `auto`
    - the client actually understands the Claude-specific notification methods
    - the inbound message happened after the bridge connected

  </Accordion>
  <Accordion title="Approvals are missing">
    `permissions_list_open` only shows approval requests observed while the bridge was connected. It is not a durable approval history API.
  </Accordion>
</AccordionGroup>

## Brikko Studio as an MCP client registry

This is the `brikko-studio mcp list`, `show`, `set`, and `unset` path.

These commands do not expose Brikko Studio over MCP. They manage Brikko Studio-owned MCP server definitions under `mcp.servers` in Brikko Studio config.

Those saved definitions are for runtimes that Brikko Studio launches or configures later, such as embedded Pi and other runtime adapters. Brikko Studio stores the definitions centrally so those runtimes do not need to keep their own duplicate MCP server lists.

<AccordionGroup>
  <Accordion title="Important behavior">
    - these commands only read or write Brikko Studio config
    - they do not connect to the target MCP server
    - they do not validate whether the command, URL, or remote transport is reachable right now
    - runtime adapters decide which transport shapes they actually support at execution time
    - embedded Pi exposes configured MCP tools in normal `coding` and `messaging` tool profiles; `minimal` still hides them, and `tools.deny: ["bundle-mcp"]` disables them explicitly
    - session-scoped bundled MCP runtimes are reaped after `mcp.sessionIdleTtlMs` milliseconds of idle time (default 10 minutes; set `0` to disable) and one-shot embedded runs clean them up at run end

  </Accordion>
</AccordionGroup>

Runtime adapters may normalize this shared registry into the shape their downstream client expects. For example, embedded Pi consumes Brikko Studio `transport` values directly, while Claude Code and Gemini receive CLI-native `type` values such as `http`, `sse`, or `stdio`.

### Saved MCP server definitions

Brikko Studio also stores a lightweight MCP server registry in config for surfaces that want Brikko Studio-managed MCP definitions.

Commands:

- `brikko-studio mcp list`
- `brikko-studio mcp show [name]`
- `brikko-studio mcp set <name> <json>`
- `brikko-studio mcp unset <name>`

Notes:

- `list` sorts server names.
- `show` without a name prints the full configured MCP server object.
- `set` expects one JSON object value on the command line.
- Use `transport: "streamable-http"` for Streamable HTTP MCP servers. `brikko-studio mcp set` also normalizes CLI-native `type: "http"` to the same canonical config shape for compatibility.
- `unset` fails if the named server does not exist.

Examples:

```bash
brikko-studio mcp list
brikko-studio mcp show context7 --json
brikko-studio mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
brikko-studio mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
brikko-studio mcp unset context7
```

Example config shape:

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com",
        "transport": "streamable-http"
      }
    }
  }
}
```

### Stdio transport

Launches a local child process and communicates over stdin/stdout.

| Field                      | Description                       |
| -------------------------- | --------------------------------- |
| `command`                  | Executable to spawn (required)    |
| `args`                     | Array of command-line arguments   |
| `env`                      | Extra environment variables       |
| `cwd` / `workingDirectory` | Working directory for the process |

<Warning>
**Stdio env safety filter**

Brikko Studio rejects interpreter-startup env keys that can alter how a stdio MCP server starts up before the first RPC, even if they appear in a server's `env` block. Blocked keys include `NODE_OPTIONS`, `PYTHONSTARTUP`, `PYTHONPATH`, `PERL5OPT`, `RUBYOPT`, `SHELLOPTS`, `PS4`, and similar runtime-control variables. Startup rejects these with a configuration error so they cannot inject an implicit prelude, swap the interpreter, or enable a debugger against the stdio process. Ordinary credential, proxy, and server-specific env vars (`GITHUB_TOKEN`, `HTTP_PROXY`, custom `*_API_KEY`, etc.) are unaffected.

If your MCP server genuinely needs one of the blocked variables, set it on the gateway host process instead of under the stdio server's `env`.
</Warning>

### SSE / HTTP transport

Connects to a remote MCP server over HTTP Server-Sent Events.

| Field                 | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `url`                 | HTTP or HTTPS URL of the remote server (required)                |
| `headers`             | Optional key-value map of HTTP headers (for example auth tokens) |
| `connectionTimeoutMs` | Per-server connection timeout in ms (optional)                   |

Example:

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

Sensitive values in `url` (userinfo) and `headers` are redacted in logs and status output.

### Streamable HTTP transport

`streamable-http` is an additional transport option alongside `sse` and `stdio`. It uses HTTP streaming for bidirectional communication with remote MCP servers.

| Field                 | Description                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- |
| `url`                 | HTTP or HTTPS URL of the remote server (required)                                      |
| `transport`           | Set to `"streamable-http"` to select this transport; when omitted, Brikko Studio uses `sse` |
| `headers`             | Optional key-value map of HTTP headers (for example auth tokens)                       |
| `connectionTimeoutMs` | Per-server connection timeout in ms (optional)                                         |

Brikko Studio config uses `transport: "streamable-http"` as the canonical spelling. CLI-native MCP `type: "http"` values are accepted when saved through `brikko-studio mcp set` and repaired by `brikko-studio doctor --fix` in existing config, but `transport` is what embedded Pi consumes directly.

Example:

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

<Note>
These commands manage saved config only. They do not start the channel bridge, open a live MCP client session, or prove the target server is reachable.
</Note>

## Current limits

This page documents the bridge as shipped today.

Current limits:

- conversation discovery depends on existing Gateway session route metadata
- no generic push protocol beyond the Claude-specific adapter
- no message edit or react tools yet
- HTTP/SSE/streamable-http transport connects to a single remote server; no multiplexed upstream yet
- `permissions_list_open` only includes approvals observed while the bridge is connected

## Related

- [CLI reference](/cli)
- [Plugins](/cli/plugins)
