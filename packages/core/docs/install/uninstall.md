---
summary: "Uninstall Brikko Studio completely (CLI, service, state, workspace)"
read_when:
  - You want to remove Brikko Studio from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

Two paths:

- **Easy path** if `brikko-studio` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
brikko-studio uninstall
```

Non-interactive (automation / npx):

```bash
brikko-studio uninstall --all --yes --non-interactive
npx -y brikko-studio uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
brikko-studio gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
brikko-studio gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${BRIKKO_STUDIO_STATE_DIR:-$HOME/.brikko-studio}"
```

If you set `BRIKKO_STUDIO_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.brikko-studio/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g brikko-studio
pnpm remove -g brikko-studio
bun remove -g brikko-studio
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/Brikko Studio.app
```

Notes:

- If you used profiles (`--profile` / `BRIKKO_STUDIO_PROFILE`), repeat step 3 for each state dir (defaults are `~/.brikko-studio-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `brikko-studio` is missing.

### macOS (launchd)

Default label is `ai.brikko-studio.gateway` (or `ai.brikko-studio.<profile>`; legacy `com.brikko-studio.*` may still exist):

```bash
launchctl bootout gui/$UID/ai.brikko-studio.gateway
rm -f ~/Library/LaunchAgents/ai.brikko-studio.gateway.plist
```

If you used a profile, replace the label and plist name with `ai.brikko-studio.<profile>`. Remove any legacy `com.brikko-studio.*` plists if present.

### Linux (systemd user unit)

Default unit name is `brikko-studio-gateway.service` (or `brikko-studio-gateway-<profile>.service`):

```bash
systemctl --user disable --now brikko-studio-gateway.service
rm -f ~/.config/systemd/user/brikko-studio-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `Brikko Studio Gateway` (or `Brikko Studio Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "Brikko Studio Gateway"
Remove-Item -Force "$env:USERPROFILE\.brikko-studio\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.brikko-studio-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://brikko-studio.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g brikko-studio@latest`.
Remove it with `npm rm -g brikko-studio` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `brikko-studio ...` / `bun run brikko-studio ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.

## Related

- [Install overview](/install)
- [Migration guide](/install/migrating)
