# Manage dev Sprites

Run from the repository root on macOS with Node 26, pnpm 12, and the 1Password desktop app. Enable **Settings → Developer → Integrate with 1Password SDKs** in 1Password.

```sh
pnpm --dir tools/sprite install
node tools/sprite/cli.ts create --rex
```

With the fish config applied, run `sprite_dev create --rex` from any directory. The `create` and `upgrade` commands default to the Sprite named `dev`. Pass a name to manage another Sprite, for example `sprite_dev create my-dev --rex`.

The CLI reads credentials from 1Password and installs the dotfiles, tools, and Rex. With `--rex`, it also starts Rex and saves the Sprite in the Rex CLI host list on your Mac. Follow the printed Tailscale sign-in link using the same account as Rex on your Mac. The [CLI host list does not sync to the Rex app](https://www.superlogical.com/rex/docs/linux/remote-access#adding-the-server-to-a-client): choose **Add Remote Host…** in the app and enter the printed name and URL. Omit `--rex` to skip remote access setup.

Setup clones the repository from GitHub, so push changes before using them in a Sprite. Use `--ref <branch-or-tag>` to select a revision; the default is `main`. If setup is interrupted, rerun the same command with `--resume`.

Connect using the authenticated Sprites CLI:

```sh
sprite exec -s dev --tty -- fish -l
```

Sign in to Claude/Codex and check out your project inside the Sprite.

## Automatic wake on macOS

Applying these dotfiles enables Pitchfork at login and schedules `global/sprite-rex-autowake` every ~15 seconds.
Each run checks whether the local Rex app is connected. While Rex is open and the Mac is awake, it wakes `dev` and renews a two-minute Sprite Task.
Rex can then reconnect over Tailscale without a manual wake command.

Once Rex supports remote hosts without needing Tailscale, we can hopefully setup a less jank system.

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
