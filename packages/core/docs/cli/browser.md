---
summary: "CLI reference for `brikko-studio browser` (lifecycle, profiles, tabs, actions, state, and debugging)"
read_when:
  - You use `brikko-studio browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "Browser"
---

# `brikko-studio browser`

Manage Brikko Studio's browser control surface and run browser actions (lifecycle, profiles, tabs, snapshots, screenshots, navigation, input, state emulation, and debugging).

Related:

- Browser tool + API: [Browser tool](/tools/browser)

## Common flags

- `--url <gatewayWsUrl>`: Gateway WebSocket URL (defaults to config).
- `--token <token>`: Gateway token (if required).
- `--timeout <ms>`: request timeout (ms).
- `--expect-final`: wait for a final Gateway response.
- `--browser-profile <name>`: choose a browser profile (default from config).
- `--json`: machine-readable output (where supported).

## Quick start (local)

```bash
brikko-studio browser profiles
brikko-studio browser --browser-profile brikko-studio start
brikko-studio browser --browser-profile brikko-studio open https://example.com
brikko-studio browser --browser-profile brikko-studio snapshot
```

Agents can run the same readiness check with `browser({ action: "doctor" })`.

## Quick troubleshooting

If `start` fails with `not reachable after start`, troubleshoot CDP readiness first. If `start` and `tabs` succeed but `open` or `navigate` fails, the browser control plane is healthy and the failure is usually navigation SSRF policy.

Minimal sequence:

```bash
brikko-studio browser --browser-profile brikko-studio doctor
brikko-studio browser --browser-profile brikko-studio start
brikko-studio browser --browser-profile brikko-studio tabs
brikko-studio browser --browser-profile brikko-studio open https://example.com
```

Detailed guidance: [Browser troubleshooting](/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## Lifecycle

```bash
brikko-studio browser status
brikko-studio browser doctor
brikko-studio browser doctor --deep
brikko-studio browser start
brikko-studio browser start --headless
brikko-studio browser stop
brikko-studio browser --browser-profile brikko-studio reset-profile
```

Notes:

- `doctor --deep` adds a live snapshot probe. It is useful when basic CDP
  readiness is green but you want proof that the current tab can be inspected.
- For `attachOnly` and remote CDP profiles, `brikko-studio browser stop` closes the
  active control session and clears temporary emulation overrides even when
  Brikko Studio did not launch the browser process itself.
- For local managed profiles, `brikko-studio browser stop` stops the spawned browser
  process.
- `brikko-studio browser start --headless` applies only to that start request and
  only when Brikko Studio launches a local managed browser. It does not rewrite
  `browser.headless` or profile config, and it is a no-op for an already-running
  browser.
- On Linux hosts without `DISPLAY` or `WAYLAND_DISPLAY`, local managed profiles
  run headless automatically unless `BRIKKO_STUDIO_BROWSER_HEADLESS=0`,
  `browser.headless=false`, or `browser.profiles.<name>.headless=false`
  explicitly requests a visible browser.

## If the command is missing

If `brikko-studio browser` is an unknown command, check `plugins.allow` in
`~/.brikko-studio/brikko-studio.json`.

When `plugins.allow` is present, list the bundled browser plugin explicitly
unless the config already has a root `browser` block:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

An explicit root `browser` block, for example `browser.enabled=true` or
`browser.profiles.<name>`, also activates the bundled browser plugin under a
restrictive plugin allowlist.

Related: [Browser tool](/tools/browser#missing-browser-command-or-tool)

## Profiles

Profiles are named browser routing configs. In practice:

- `brikko-studio`: launches or attaches to a dedicated Brikko Studio-managed Chrome instance (isolated user data dir).
- `user`: controls your existing signed-in Chrome session via Chrome DevTools MCP.
- custom CDP profiles: point at a local or remote CDP endpoint.

```bash
brikko-studio browser profiles
brikko-studio browser create-profile --name work --color "#FF5A36"
brikko-studio browser create-profile --name chrome-live --driver existing-session
brikko-studio browser create-profile --name remote --cdp-url https://browser-host.example.com
brikko-studio browser delete-profile --name work
```

Use a specific profile:

```bash
brikko-studio browser --browser-profile work tabs
```

## Tabs

```bash
brikko-studio browser tabs
brikko-studio browser tab new --label docs
brikko-studio browser tab label t1 docs
brikko-studio browser tab select 2
brikko-studio browser tab close 2
brikko-studio browser open https://docs.brikko-studio.ai --label docs
brikko-studio browser focus docs
brikko-studio browser close t1
```

`tabs` returns `suggestedTargetId` first, then the stable `tabId` such as `t1`,
the optional label, and the raw `targetId`. Agents should pass
`suggestedTargetId` back into `focus`, `close`, snapshots, and actions. You can
assign a label with `open --label`, `tab new --label`, or `tab label`; labels,
tab ids, raw target ids, and unique target-id prefixes are all accepted.
When Chromium replaces the underlying raw target during a navigation or form
submit, Brikko Studio keeps the stable `tabId`/label attached to the replacement tab
when it can prove the match. Raw target ids remain volatile; prefer
`suggestedTargetId`.

## Snapshot / screenshot / actions

Snapshot:

```bash
brikko-studio browser snapshot
brikko-studio browser snapshot --urls
```

Screenshot:

```bash
brikko-studio browser screenshot
brikko-studio browser screenshot --full-page
brikko-studio browser screenshot --ref e12
brikko-studio browser screenshot --labels
```

Notes:

- `--full-page` is for page captures only; it cannot be combined with `--ref`
  or `--element`.
- `existing-session` / `user` profiles support page screenshots and `--ref`
  screenshots from snapshot output, but not CSS `--element` screenshots.
- `--labels` overlays current snapshot refs on the screenshot.
- `snapshot --urls` appends discovered link destinations to AI snapshots so
  agents can choose direct navigation targets instead of guessing from link
  text alone.

Navigate/click/type (ref-based UI automation):

```bash
brikko-studio browser navigate https://example.com
brikko-studio browser click <ref>
brikko-studio browser click-coords 120 340
brikko-studio browser type <ref> "hello"
brikko-studio browser press Enter
brikko-studio browser hover <ref>
brikko-studio browser scrollintoview <ref>
brikko-studio browser drag <startRef> <endRef>
brikko-studio browser select <ref> OptionA OptionB
brikko-studio browser fill --fields '[{"ref":"1","value":"Ada"}]'
brikko-studio browser wait --text "Done"
brikko-studio browser evaluate --fn '(el) => el.textContent' --ref <ref>
```

Action responses return the current raw `targetId` after action-triggered page
replacement when Brikko Studio can prove the replacement tab. Scripts should still
store and pass `suggestedTargetId`/labels for long-lived workflows.

File + dialog helpers:

```bash
brikko-studio browser upload /tmp/brikko-studio/uploads/file.pdf --ref <ref>
brikko-studio browser waitfordownload
brikko-studio browser download <ref> report.pdf
brikko-studio browser dialog --accept
```

Managed Chrome profiles save ordinary click-triggered downloads into the Brikko Studio
downloads directory (`/tmp/brikko-studio/downloads` by default, or the configured temp
root). Use `waitfordownload` or `download` when the agent needs to wait for a
specific file and return its path; those explicit waiters own the next download.

## State and storage

Viewport + emulation:

```bash
brikko-studio browser resize 1280 720
brikko-studio browser set viewport 1280 720
brikko-studio browser set offline on
brikko-studio browser set media dark
brikko-studio browser set timezone Europe/London
brikko-studio browser set locale en-GB
brikko-studio browser set geo 51.5074 -0.1278 --accuracy 25
brikko-studio browser set device "iPhone 14"
brikko-studio browser set headers '{"x-test":"1"}'
brikko-studio browser set credentials myuser mypass
```

Cookies + storage:

```bash
brikko-studio browser cookies
brikko-studio browser cookies set session abc123 --url https://example.com
brikko-studio browser cookies clear
brikko-studio browser storage local get
brikko-studio browser storage local set token abc123
brikko-studio browser storage session clear
```

## Debugging

```bash
brikko-studio browser console --level error
brikko-studio browser pdf
brikko-studio browser responsebody "**/api"
brikko-studio browser highlight <ref>
brikko-studio browser errors --clear
brikko-studio browser requests --filter api
brikko-studio browser trace start
brikko-studio browser trace stop --out trace.zip
```

## Existing Chrome via MCP

Use the built-in `user` profile, or create your own `existing-session` profile:

```bash
brikko-studio browser --browser-profile user tabs
brikko-studio browser create-profile --name chrome-live --driver existing-session
brikko-studio browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
brikko-studio browser --browser-profile chrome-live tabs
```

This path is host-only. For Docker, headless servers, Browserless, or other remote setups, use a CDP profile instead.

Current existing-session limits:

- snapshot-driven actions use refs, not CSS selectors
- `browser.actionTimeoutMs` defaults supported `act` requests to 60000 ms when
  callers omit `timeoutMs`; per-call `timeoutMs` still wins.
- `click` is left-click only
- `type` does not support `slowly=true`
- `press` does not support `delayMs`
- `hover`, `scrollintoview`, `drag`, `select`, `fill`, and `evaluate` reject
  per-call timeout overrides
- `select` supports one value only
- `wait --load networkidle` is not supported
- file uploads require `--ref` / `--input-ref`, do not support CSS
  `--element`, and currently support one file at a time
- dialog hooks do not support `--timeout`
- screenshots support page captures and `--ref`, but not CSS `--element`
- `responsebody`, download interception, PDF export, and batch actions still
  require a managed browser or raw CDP profile

## Remote browser control (node host proxy)

If the Gateway runs on a different machine than the browser, run a **node host** on the machine that has Chrome/Brave/Edge/Chromium. The Gateway will proxy browser actions to that node (no separate browser control server required).

Use `gateway.nodes.browser.mode` to control auto-routing and `gateway.nodes.browser.node` to pin a specific node if multiple are connected.

Security + remote setup: [Browser tool](/tools/browser), [Remote access](/gateway/remote), [Tailscale](/gateway/tailscale), [Security](/gateway/security)

## Related

- [CLI reference](/cli)
- [Browser](/tools/browser)
