---
summary: "Updating Brikko Studio safely (global install or source), plus rollback strategy"
read_when:
  - Updating Brikko Studio
  - Something breaks after an update
title: "Updating"
---

Keep Brikko Studio up to date.

## Recommended: `brikko-studio update`

The fastest way to update. It detects your install type (npm or git), fetches the latest version, runs `brikko-studio doctor`, and restarts the gateway.

```bash
brikko-studio update
```

To switch channels or target a specific version:

```bash
brikko-studio update --channel beta
brikko-studio update --channel dev
brikko-studio update --tag main
brikko-studio update --dry-run   # preview without applying
```

`--channel beta` prefers beta, but the runtime falls back to stable/latest when
the beta tag is missing or older than the latest stable release. Use `--tag beta`
if you want the raw npm beta dist-tag for a one-off package update.

See [Development channels](/install/development-channels) for channel semantics.

## Switch between npm and git installs

Use channels when you want to change the install type. The updater keeps your
state, config, credentials, and workspace in `~/.brikko-studio`; it only changes
which Brikko Studio code install the CLI and gateway use.

```bash
# npm package install -> editable git checkout
brikko-studio update --channel dev

# git checkout -> npm package install
brikko-studio update --channel stable
```

Run with `--dry-run` first to preview the exact install-mode switch:

```bash
brikko-studio update --channel dev --dry-run
brikko-studio update --channel stable --dry-run
```

The `dev` channel ensures a git checkout, builds it, and installs the global CLI
from that checkout. The `stable` and `beta` channels use package installs. If the
gateway is already installed, `brikko-studio update` refreshes the service metadata
and restarts it unless you pass `--no-restart`.

## Alternative: re-run the installer

```bash
curl -fsSL https://brikko-studio.ai/install.sh | bash
```

Add `--no-onboard` to skip onboarding. To force a specific install type through
the installer, pass `--install-method git --no-onboard` or
`--install-method npm --no-onboard`.

If `brikko-studio update` fails after the npm package install phase, re-run the
installer. The installer does not call the old updater; it runs the global
package install directly and can recover a partially updated npm install.

```bash
curl -fsSL https://brikko-studio.ai/install.sh | bash -s -- --install-method npm
```

To pin the recovery to a specific version or dist-tag, add `--version`:

```bash
curl -fsSL https://brikko-studio.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## Alternative: manual npm, pnpm, or bun

```bash
npm i -g brikko-studio@latest
```

When `brikko-studio update` manages a global npm install, it installs the target into
a temporary npm prefix first, verifies the packaged `dist` inventory, then swaps
the clean package tree into the real global prefix. That avoids npm overlaying a
new package onto stale files from the old package. If the install command fails,
Brikko Studio retries once with `--omit=optional`. That retry helps hosts where native
optional dependencies cannot compile, while keeping the original failure visible
if the fallback also fails.

```bash
pnpm add -g brikko-studio@latest
```

```bash
bun add -g brikko-studio@latest
```

### Advanced npm install topics

<AccordionGroup>
  <Accordion title="Read-only package tree">
    Brikko Studio treats packaged global installs as read-only at runtime, even when the global package directory is writable by the current user. Plugin package installs live in Brikko Studio-owned npm/git roots under the user config directory, and Gateway startup does not mutate the Brikko Studio package tree.

    Some Linux npm setups install global packages under root-owned directories such as `/usr/lib/node_modules/brikko-studio`. Brikko Studio supports that layout because plugin install/update commands write outside that global package directory.

  </Accordion>
  <Accordion title="Hardened systemd units">
    Give Brikko Studio write access to its config/state roots so explicit plugin installs, plugin updates, and doctor cleanup can persist their changes:

    ```ini
    ReadWritePaths=/var/lib/brikko-studio /home/brikko-studio/.brikko-studio /tmp
    ```

  </Accordion>
  <Accordion title="Disk-space preflight">
    Before package updates and explicit plugin installs, Brikko Studio tries a best-effort disk-space check for the target volume. Low space produces a warning with the checked path, but does not block the update because filesystem quotas, snapshots, and network volumes can change after the check. The actual package-manager install and post-install verification remain authoritative.
  </Accordion>
</AccordionGroup>

## Auto-updater

The auto-updater is off by default. Enable it in `~/.brikko-studio/brikko-studio.json`:

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| Channel  | Behavior                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| `stable` | Waits `stableDelayHours`, then applies with deterministic jitter across `stableJitterHours` (spread rollout). |
| `beta`   | Checks every `betaCheckIntervalHours` (default: hourly) and applies immediately.                              |
| `dev`    | No automatic apply. Use `brikko-studio update` manually.                                                           |

The gateway also logs an update hint on startup (disable with `update.checkOnStart: false`).
For downgrade or incident recovery, set `BRIKKO_STUDIO_NO_AUTO_UPDATE=1` in the gateway environment to block automatic applies even when `update.auto.enabled` is configured. Startup update hints can still run unless `update.checkOnStart` is also disabled.

Package-manager updates requested through the live Gateway control-plane handler
force a non-deferred, no-cooldown update restart after the package swap. That
avoids leaving an old in-memory process around long enough to lazy-load chunks
from a package tree that has already been replaced. Shell `brikko-studio update`
remains the preferred path for supervised installs because it can stop and
restart the service around the update.

## After updating

<Steps>

### Run doctor

```bash
brikko-studio doctor
```

Migrates config, audits DM policies, and checks gateway health. Details: [Doctor](/gateway/doctor)

### Restart the gateway

```bash
brikko-studio gateway restart
```

### Verify

```bash
brikko-studio health
```

</Steps>

## Rollback

### Pin a version (npm)

```bash
npm i -g brikko-studio@<version>
brikko-studio doctor
brikko-studio gateway restart
```

<Tip>
`npm view brikko-studio version` shows the current published version.
</Tip>

### Pin a commit (source)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
brikko-studio gateway restart
```

To return to latest: `git checkout main && git pull`.

## If you are stuck

- Run `brikko-studio doctor` again and read the output carefully.
- For `brikko-studio update --channel dev` on source checkouts, the updater auto-bootstraps `pnpm` when needed. If you see a pnpm/corepack bootstrap error, install `pnpm` manually (or re-enable `corepack`) and rerun the update.
- Check: [Troubleshooting](/gateway/troubleshooting)
- Ask in Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

## Related

- [Install overview](/install): all installation methods.
- [Doctor](/gateway/doctor): health checks after updates.
- [Migrating](/install/migrating): major version migration guides.
