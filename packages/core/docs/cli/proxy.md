---
summary: "CLI reference for `brikko-studio proxy`, including operator-managed proxy validation and the local debug proxy capture inspector"
read_when:
  - You need to validate operator-managed proxy routing before deployment
  - You need to capture Brikko Studio transport traffic locally for debugging
  - You want to inspect debug proxy sessions, blobs, or built-in query presets
title: "Proxy"
---

# `brikko-studio proxy`

Validate operator-managed proxy routing, or run the local explicit debug proxy
and inspect captured traffic.

Use `validate` to preflight an operator-managed forward proxy before enabling
Brikko Studio proxy routing. The other commands are debugging tools for
transport-level investigation: they can start a local proxy, run a child command
with capture enabled, list capture sessions, query common traffic patterns, read
captured blobs, and purge local capture data.

## Commands

```bash
brikko-studio proxy start [--host <host>] [--port <port>]
brikko-studio proxy run [--host <host>] [--port <port>] -- <cmd...>
brikko-studio proxy validate [--json] [--proxy-url <url>] [--allowed-url <url>] [--denied-url <url>] [--timeout-ms <ms>]
brikko-studio proxy coverage
brikko-studio proxy sessions [--limit <count>]
brikko-studio proxy query --preset <name> [--session <id>]
brikko-studio proxy blob --id <blobId>
brikko-studio proxy purge
```

## Validate

`brikko-studio proxy validate` checks the effective operator-managed proxy URL from
`--proxy-url`, config, or `BRIKKO_STUDIO_PROXY_URL`. It reports a config problem when
no proxy is enabled and configured; use `--proxy-url` for a one-off preflight
before changing config. By default it verifies that a public destination succeeds
through the proxy and that the proxy cannot reach a temporary loopback canary.
Custom denied destinations are fail-closed: HTTP responses and ambiguous
transport failures both fail unless you can verify a deployment-specific denial
signal separately.

Options:

- `--json`: print machine-readable JSON.
- `--proxy-url <url>`: validate this proxy URL instead of config or env.
- `--allowed-url <url>`: add a destination expected to succeed through the proxy. Repeat to check multiple destinations.
- `--denied-url <url>`: add a destination expected to be blocked by the proxy. Repeat to check multiple destinations.
- `--timeout-ms <ms>`: per-request timeout in milliseconds.

See [Network Proxy](/security/network-proxy) for deployment guidance and denial
semantics.

## Query presets

`brikko-studio proxy query --preset <name>` accepts:

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## Notes

- `start` defaults to `127.0.0.1` unless `--host` is set.
- `run` starts a local debug proxy and then runs the command after `--`.
- `validate` exits with code 1 when proxy config or destination checks fail.
- Captures are local debugging data; use `brikko-studio proxy purge` when finished.

## Related

- [CLI reference](/cli)
- [Network Proxy](/security/network-proxy)
- [Trusted proxy auth](/gateway/trusted-proxy-auth)
