---
summary: "Community-maintained Brikko Studio plugins: browse, install, and submit your own"
read_when:
  - You want to find third-party Brikko Studio plugins
  - You want to publish or list your own plugin
title: "Community plugins"
---

Community plugins are third-party packages that extend Brikko Studio with new
channels, tools, providers, or other capabilities. They are built and maintained
by the community, usually published on [ClawHub](/tools/clawhub), and installable
with a single command. Npm remains the launch default for bare package specs
while ClawHub pack installs roll out.

ClawHub is the canonical discovery surface for community plugins. Do not open
docs-only PRs just to add your plugin here for discoverability; publish it on
ClawHub instead.

```bash
brikko-studio plugins install clawhub:<package-name>
```

Use `brikko-studio plugins install <package-name>` for npm-hosted packages.

## Listed plugins

### Apify

Scrape data from any website with 20,000+ ready-made scrapers. Let your agent
extract data from Instagram, Facebook, TikTok, YouTube, Google Maps, Google
Search, e-commerce sites, and more — just by asking.

- **npm:** `@apify/apify-brikko-studio-plugin`
- **repo:** [github.com/apify/apify-brikko-studio-plugin](https://github.com/apify/apify-brikko-studio-plugin)

```bash
brikko-studio plugins install @apify/apify-brikko-studio-plugin
```

### Codex App Server Bridge

Independent Brikko Studio bridge for Codex App Server conversations. Bind a chat to
a Codex thread, talk to it with plain text, and control it with chat-native
commands for resume, planning, review, model selection, compaction, and more.

- **npm:** `brikko-studio-codex-app-server`
- **repo:** [github.com/pwrdrvr/brikko-studio-codex-app-server](https://github.com/pwrdrvr/brikko-studio-codex-app-server)

```bash
brikko-studio plugins install brikko-studio-codex-app-server
```

### DingTalk

Enterprise robot integration using Stream mode. Supports text, images, and
file messages via any DingTalk client.

- **npm:** `@largezhou/ddingtalk`
- **repo:** [github.com/largezhou/brikko-studio-dingtalk](https://github.com/largezhou/brikko-studio-dingtalk)

```bash
brikko-studio plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

Lossless Context Management plugin for Brikko Studio. DAG-based conversation
summarization with incremental compaction — preserves full context fidelity
while reducing token usage.

- **npm:** `@martian-engineering/lossless-claw`
- **repo:** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
brikko-studio plugins install @martian-engineering/lossless-claw
```

### Opik

Official plugin that exports agent traces to Opik. Monitor agent behavior,
cost, tokens, errors, and more.

- **npm:** `@opik/opik-brikko-studio`
- **repo:** [github.com/comet-ml/opik-brikko-studio](https://github.com/comet-ml/opik-brikko-studio)

```bash
brikko-studio plugins install @opik/opik-brikko-studio
```

### Prometheus Avatar

Give your Brikko Studio agent a Live2D avatar with real-time lip-sync, emotion
expressions, and text-to-speech. Includes creator tools for AI asset generation
and one-click deployment to the Prometheus Marketplace. Currently in alpha.

- **npm:** `@prometheusavatar/brikko-studio-plugin`
- **repo:** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
brikko-studio plugins install @prometheusavatar/brikko-studio-plugin
```

### QQbot

Connect Brikko Studio to QQ via the QQ Bot API. Supports private chats, group
mentions, channel messages, and rich media including voice, images, videos,
and files.

Current Brikko Studio releases bundle QQ Bot. Use the bundled setup in
[QQ Bot](/channels/qqbot) for normal installs; install this external plugin only
when you intentionally want the Tencent-maintained standalone package.

- **npm:** `@tencent-connect/brikko-studio-qqbot`
- **repo:** [github.com/tencent-connect/brikko-studio-qqbot](https://github.com/tencent-connect/brikko-studio-qqbot)

```bash
brikko-studio plugins install @tencent-connect/brikko-studio-qqbot
```

### wecom

WeCom channel plugin for Brikko Studio by the Tencent WeCom team. Powered by
WeCom Bot WebSocket persistent connections, it supports direct messages & group
chats, streaming replies, proactive messaging, image/file processing, Markdown
formatting, built-in access control, and document/meeting/messaging skills.

- **npm:** `@wecom/wecom-brikko-studio-plugin`
- **repo:** [github.com/WecomTeam/wecom-brikko-studio-plugin](https://github.com/WecomTeam/wecom-brikko-studio-plugin)

```bash
brikko-studio plugins install @wecom/wecom-brikko-studio-plugin
```

### Yuanbao

Yuanbao channel plugin for Brikko Studio by the Tencent Yuanbao team. Powered by
WebSocket persistent connections, it supports direct messages & group chats,
streaming replies, proactive messaging, image/file/audio/video processing,
Markdown formatting, built-in access control, and slash-command menus.

- **npm:** `brikko-studio-plugin-yuanbao`
- **repo:** [github.com/YuanbaoTeam/yuanbao-brikko-studio-plugin](https://github.com/YuanbaoTeam/yuanbao-brikko-studio-plugin)

```bash
brikko-studio plugins install brikko-studio-plugin-yuanbao
```

## Submit your plugin

We welcome community plugins that are useful, documented, and safe to operate.

<Steps>
  <Step title="Publish to ClawHub or npm">
    Your plugin must be installable via `brikko-studio plugins install \<package-name\>`.
    Publish to [ClawHub](/tools/clawhub) unless you specifically need npm-only
    distribution.
    See [Building Plugins](/plugins/building-plugins) for the full guide.

  </Step>

  <Step title="Host on GitHub">
    Source code must be in a public repository with setup docs and an issue
    tracker.

  </Step>

  <Step title="Use docs PRs only for source-doc changes">
    You do not need a docs PR just to make your plugin discoverable. Publish it
    on ClawHub instead.

    Open a docs PR only when Brikko Studio's source docs need an actual content
    change, such as correcting install guidance or adding cross-repo
    documentation that belongs in the main docs set.

  </Step>
</Steps>

## Quality bar

| Requirement                 | Why                                           |
| --------------------------- | --------------------------------------------- |
| Published on ClawHub or npm | Users need `brikko-studio plugins install` to work |
| Public GitHub repo          | Source review, issue tracking, transparency   |
| Setup and usage docs        | Users need to know how to configure it        |
| Active maintenance          | Recent updates or responsive issue handling   |

Low-effort wrappers, unclear ownership, or unmaintained packages may be declined.

## Related

- [Install and Configure Plugins](/tools/plugin) — how to install any plugin
- [Building Plugins](/plugins/building-plugins) — create your own
- [Plugin Manifest](/plugins/manifest) — manifest schema
