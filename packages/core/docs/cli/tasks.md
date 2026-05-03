---
summary: "CLI reference for `brikko-studio tasks` (background task ledger and Task Flow state)"
read_when:
  - You want to inspect, audit, or cancel background task records
  - You are documenting Task Flow commands under `brikko-studio tasks flow`
title: "`brikko-studio tasks`"
---

Inspect durable background tasks and Task Flow state. With no subcommand,
`brikko-studio tasks` is equivalent to `brikko-studio tasks list`.

See [Background Tasks](/automation/tasks) for the lifecycle and delivery model.

## Usage

```bash
brikko-studio tasks
brikko-studio tasks list
brikko-studio tasks list --runtime acp
brikko-studio tasks list --status running
brikko-studio tasks show <lookup>
brikko-studio tasks notify <lookup> state_changes
brikko-studio tasks cancel <lookup>
brikko-studio tasks audit
brikko-studio tasks maintenance
brikko-studio tasks maintenance --apply
brikko-studio tasks flow list
brikko-studio tasks flow show <lookup>
brikko-studio tasks flow cancel <lookup>
```

## Root Options

- `--json`: output JSON.
- `--runtime <name>`: filter by kind: `subagent`, `acp`, `cron`, or `cli`.
- `--status <name>`: filter by status: `queued`, `running`, `succeeded`, `failed`, `timed_out`, `cancelled`, or `lost`.

## Subcommands

### `list`

```bash
brikko-studio tasks list [--runtime <name>] [--status <name>] [--json]
```

Lists tracked background tasks newest first.

### `show`

```bash
brikko-studio tasks show <lookup> [--json]
```

Shows one task by task ID, run ID, or session key.

### `notify`

```bash
brikko-studio tasks notify <lookup> <done_only|state_changes|silent>
```

Changes the notification policy for a running task.

### `cancel`

```bash
brikko-studio tasks cancel <lookup>
```

Cancels a running background task.

### `audit`

```bash
brikko-studio tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

Surfaces stale, lost, delivery-failed, or otherwise inconsistent task and Task Flow records. Lost tasks retained until `cleanupAfter` are warnings; expired or unstamped lost tasks are errors.

### `maintenance`

```bash
brikko-studio tasks maintenance [--apply] [--json]
```

Previews or applies task and Task Flow reconciliation, cleanup stamping, and pruning.
For cron tasks, reconciliation uses persisted run logs/job state before marking an
old active task `lost`, so completed cron runs do not become false audit errors
just because the in-memory Gateway runtime state is gone. Offline CLI audit is
not authoritative for the Gateway's process-local cron active-job set.

### `flow`

```bash
brikko-studio tasks flow list [--status <name>] [--json]
brikko-studio tasks flow show <lookup> [--json]
brikko-studio tasks flow cancel <lookup>
```

Inspects or cancels durable Task Flow state under the task ledger.

## Related

- [CLI reference](/cli)
- [Background tasks](/automation/tasks)
