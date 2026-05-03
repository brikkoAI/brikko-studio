---
summary: "CLI reference for `brikko-studio nodes` (status, pairing, invoke, camera/canvas/screen)"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "Nodes"
---

# `brikko-studio nodes`

Manage paired nodes (devices) and invoke node capabilities.

Related:

- Nodes overview: [Nodes](/nodes)
- Camera: [Camera nodes](/nodes/camera)
- Images: [Image nodes](/nodes/images)

Common options:

- `--url`, `--token`, `--timeout`, `--json`

## Common commands

```bash
brikko-studio nodes list
brikko-studio nodes list --connected
brikko-studio nodes list --last-connected 24h
brikko-studio nodes pending
brikko-studio nodes approve <requestId>
brikko-studio nodes reject <requestId>
brikko-studio nodes remove --node <id|name|ip>
brikko-studio nodes rename --node <id|name|ip> --name <displayName>
brikko-studio nodes status
brikko-studio nodes status --connected
brikko-studio nodes status --last-connected 24h
```

`nodes list` prints pending/paired tables. Paired rows include the most recent connect age (Last Connect).
Use `--connected` to only show currently-connected nodes. Use `--last-connected <duration>` to
filter to nodes that connected within a duration (e.g. `24h`, `7d`).
Use `nodes remove --node <id|name|ip>` to delete a stale gateway-owned node pairing record.

Approval note:

- `brikko-studio nodes pending` only needs pairing scope.
- `gateway.nodes.pairing.autoApproveCidrs` can skip the pending step only for
  explicitly trusted, first-time `role: node` device pairing. It is off by
  default and does not approve upgrades.
- `brikko-studio nodes approve <requestId>` inherits extra scope requirements from the
  pending request:
  - commandless request: pairing only
  - non-exec node commands: pairing + write
  - `system.run` / `system.run.prepare` / `system.which`: pairing + admin

## Invoke

```bash
brikko-studio nodes invoke --node <id|name|ip> --command <command> --params <json>
```

Invoke flags:

- `--params <json>`: JSON object string (default `{}`).
- `--invoke-timeout <ms>`: node invoke timeout (default `15000`).
- `--idempotency-key <key>`: optional idempotency key.
- `system.run` and `system.run.prepare` are blocked here; use the `exec` tool with `host=node` for shell execution.

For shell execution on a node, use the `exec` tool with `host=node` instead of `brikko-studio nodes run`.
The `nodes` CLI is now capability-focused: direct RPC via `nodes invoke`, plus pairing, camera,
screen, location, canvas, and notifications.

## Related

- [CLI reference](/cli)
- [Nodes](/nodes)
