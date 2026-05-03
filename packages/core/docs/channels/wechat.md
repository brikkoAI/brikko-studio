---
summary: "WeChat channel setup through the external brikko-studio-weixin plugin"
read_when:
  - You want to connect Brikko Studio to WeChat or Weixin
  - You are installing or troubleshooting the brikko-studio-weixin channel plugin
  - You need to understand how external channel plugins run beside the Gateway
title: "WeChat"
---

Brikko Studio connects to WeChat through Tencent's external
`@tencent-weixin/brikko-studio-weixin` channel plugin.

Status: external plugin. Direct chats and media are supported. Group chats are not
advertised by the current plugin capability metadata.

## Naming

- **WeChat** is the user-facing name in these docs.
- **Weixin** is the name used by Tencent's package and by the plugin id.
- `brikko-studio-weixin` is the Brikko Studio channel id.
- `@tencent-weixin/brikko-studio-weixin` is the npm package.

Use `brikko-studio-weixin` in CLI commands and config paths.

## How it works

The WeChat code does not live in the Brikko Studio core repo. Brikko Studio provides the
generic channel plugin contract, and the external plugin provides the
WeChat-specific runtime:

1. `brikko-studio plugins install` installs `@tencent-weixin/brikko-studio-weixin`.
2. The Gateway discovers the plugin manifest and loads the plugin entrypoint.
3. The plugin registers channel id `brikko-studio-weixin`.
4. `brikko-studio channels login --channel brikko-studio-weixin` starts QR login.
5. The plugin stores account credentials under the Brikko Studio state directory.
6. When the Gateway starts, the plugin starts its Weixin monitor for each
   configured account.
7. Inbound WeChat messages are normalized through the channel contract, routed to
   the selected Brikko Studio agent, and sent back through the plugin outbound path.

That separation matters: Brikko Studio core should stay channel-agnostic. WeChat login,
Tencent iLink API calls, media upload/download, context tokens, and account
monitoring are owned by the external plugin.

## Install

Quick install:

```bash
npx -y @tencent-weixin/brikko-studio-weixin-cli install
```

Manual install:

```bash
brikko-studio plugins install "@tencent-weixin/brikko-studio-weixin"
brikko-studio config set plugins.entries.brikko-studio-weixin.enabled true
```

Restart the Gateway after install:

```bash
brikko-studio gateway restart
```

## Login

Run QR login on the same machine that runs the Gateway:

```bash
brikko-studio channels login --channel brikko-studio-weixin
```

Scan the QR code with WeChat on your phone and confirm the login. The plugin saves
the account token locally after a successful scan.

To add another WeChat account, run the same login command again. For multiple
accounts, isolate direct-message sessions by account, channel, and sender:

```bash
brikko-studio config set session.dmScope per-account-channel-peer
```

## Access control

Direct messages use the normal Brikko Studio pairing and allowlist model for channel
plugins.

Approve new senders:

```bash
brikko-studio pairing list brikko-studio-weixin
brikko-studio pairing approve brikko-studio-weixin <CODE>
```

For the full access-control model, see [Pairing](/channels/pairing).

## Compatibility

The plugin checks the host Brikko Studio version at startup.

| Plugin line | Brikko Studio version        | npm tag  |
| ----------- | ----------------------- | -------- |
| `2.x`       | `>=2026.3.22`           | `latest` |
| `1.x`       | `>=2026.1.0 <2026.3.22` | `legacy` |

If the plugin reports that your Brikko Studio version is too old, either update
Brikko Studio or install the legacy plugin line:

```bash
brikko-studio plugins install @tencent-weixin/brikko-studio-weixin@legacy
```

## Sidecar process

The WeChat plugin can run helper work beside the Gateway while it monitors the
Tencent iLink API. In issue #68451, that helper path exposed a bug in Brikko Studio's
generic stale-Gateway cleanup: a child process could try to clean up the parent
Gateway process, causing restart loops under process managers such as systemd.

Current Brikko Studio startup cleanup excludes the current process and its ancestors,
so a channel helper must not kill the Gateway that launched it. This fix is
generic; it is not a WeChat-specific path in core.

## Troubleshooting

Check install and status:

```bash
brikko-studio plugins list
brikko-studio channels status --probe
brikko-studio --version
```

If the channel shows as installed but does not connect, confirm that the plugin is
enabled and restart:

```bash
brikko-studio config set plugins.entries.brikko-studio-weixin.enabled true
brikko-studio gateway restart
```

If the Gateway restarts repeatedly after enabling WeChat, update both Brikko Studio and
the plugin:

```bash
npm view @tencent-weixin/brikko-studio-weixin version
brikko-studio plugins install "@tencent-weixin/brikko-studio-weixin" --force
brikko-studio gateway restart
```

Temporary disable:

```bash
brikko-studio config set plugins.entries.brikko-studio-weixin.enabled false
brikko-studio gateway restart
```

## Related docs

- Channel overview: [Chat Channels](/channels)
- Pairing: [Pairing](/channels/pairing)
- Channel routing: [Channel Routing](/channels/channel-routing)
- Plugin architecture: [Plugin Architecture](/plugins/architecture)
- Channel plugin SDK: [Channel Plugin SDK](/plugins/sdk-channel-plugins)
- External package: [@tencent-weixin/brikko-studio-weixin](https://www.npmjs.com/package/@tencent-weixin/brikko-studio-weixin)
