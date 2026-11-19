# Manage dev Sprites

Run from the repository root on macOS with Node 26, pnpm 12, and the 1Password desktop app. Enable **Settings → Developer → Integrate with 1Password SDKs** in 1Password.

```sh
pnpm --dir tools/sprite install
node tools/sprite/cli.ts create --rex
```

With the fish config applied, run `sprite_dev create --rex` from any directory. The `create` and `upgrade` commands default to the Sprite named `dev`. Pass a name to manage another Sprite, for example `sprite_dev create my-dev --rex`.

The CLI reads credentials from 1Password and installs the dotfiles, tools, and Rex.
With `--rex`, it runs the Rex server as a Sprite service and adds `ssh://<name>.sprite` to your Rex hosts, which every Rex client that follows your home sees.
Omit `--rex` to skip remote access setup.

Setup clones the repository from GitHub, so push changes before using them in a Sprite. Use `--ref <branch-or-tag>` to select a revision; the default is `main`. If setup is interrupted, rerun the same command with `--resume`.

Connect using the authenticated Sprites CLI:

```sh
sprite exec -s dev --tty -- fish -l
```

Sign in to Claude/Codex and check out your project inside the Sprite.

## Rex connection and automatic wake on macOS

Applying the Mac dotfiles generates a dedicated local SSH key and configures `*.sprite` SSH destinations to go through `sprite proxy --ssh`.
Rex connects to `ssh://dev.sprite` with that config and reaches the server's Unix socket over SSH, so the server has no network listener.
The SSH server is emulated by the local Sprites CLI.

Sprites have no systemd, so `rex server install ssh://…` can't manage the server there; the `rex` Sprite service runs it instead.

Connecting to the host wakes the Sprite.
Rex keeps the Sprite awake while it remains connected, and disconnecting lets it sleep again.

## Unattended agents

Inside the Sprite, run work that must continue after your Mac sleeps with `sprite_hold`:

```sh
sprite_hold claude
sprite_hold codex
sprite_hold pnpm test
```

This registers an independent five-minute Task, renews it every minute, and releases it when the command exits.

### Updates

To update an existing Sprite from your Mac:

```sh
sprite_dev upgrade
# Or: node tools/sprite/cli.ts upgrade
```

This pulls and applies dotfiles, reconciles configured Ubuntu packages, upgrades mise tools within their configured version ranges, and upgrades the Rex apt package. It then restarts running Sprite-managed Rex servers, including a proxy server. **Restarting ends those servers' terminal sessions and programs.** Stopped services stay stopped. Installation output uses the same compact previews as `sprite_dev create`; failed steps print their captured logs and stop the upgrade.

For all options, run `node tools/sprite/cli.ts create --help`. The [setup code](create.ts) and [Linux mise config](../../private_dot_config/mise/conf.d/linux.toml) define what runs during setup.
