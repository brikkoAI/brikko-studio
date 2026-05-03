---
summary: "CLI reference for `brikko-studio tui` (Gateway-backed or local embedded terminal UI)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
  - You want to run the TUI in local embedded mode without a Gateway
  - You want to use brikko-studio chat or brikko-studio tui --local
title: "TUI"
---

# `brikko-studio tui`

Open the terminal UI connected to the Gateway, or run it in local embedded
mode.

Related:

- TUI guide: [TUI](/web/tui)

Notes:

- `chat` and `terminal` are aliases for `brikko-studio tui --local`.
- `--local` cannot be combined with `--url`, `--token`, or `--password`.
- `tui` resolves configured gateway auth SecretRefs for token/password auth when possible (`env`/`file`/`exec` providers).
- When launched from inside a configured agent workspace directory, TUI auto-selects that agent for the session key default (unless `--session` is explicitly `agent:<id>:...`).
- Local mode uses the embedded agent runtime directly. Most local tools work, but Gateway-only features are unavailable.
- Local mode adds `/auth [provider]` inside the TUI command surface.
- Plugin approval gates still apply in local mode. Tools that require approval prompt for a decision in the terminal; nothing is silently auto-approved because the Gateway is not involved.

## Examples

```bash
brikko-studio chat
brikko-studio tui --local
brikko-studio tui
brikko-studio tui --url ws://127.0.0.1:18789 --token <token>
brikko-studio tui --session main --deliver
brikko-studio chat --message "Compare my config to the docs and tell me what to fix"
# when run inside an agent workspace, infers that agent automatically
brikko-studio tui --session bugfix
```

## Config repair loop

Use local mode when the current config already validates and you want the
embedded agent to inspect it, compare it against the docs, and help repair it
from the same terminal:

If `brikko-studio config validate` is already failing, use `brikko-studio configure` or
`brikko-studio doctor --fix` first. `brikko-studio chat` does not bypass the invalid-
config guard.

```bash
brikko-studio chat
```

Then inside the TUI:

```text
!brikko-studio config file
!brikko-studio docs gateway auth token secretref
!brikko-studio config validate
!brikko-studio doctor
```

Apply targeted fixes with `brikko-studio config set` or `brikko-studio configure`, then
rerun `brikko-studio config validate`. See [TUI](/web/tui) and [Config](/cli/config).

## Related

- [CLI reference](/cli)
- [TUI](/web/tui)
