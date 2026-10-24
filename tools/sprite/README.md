# Create a dev Sprite

Run from the repository root on macOS with Node 26, pnpm 12, and the 1Password desktop app. Enable **Settings → Developer → Integrate with 1Password SDKs** in 1Password.

```sh
pnpm --dir tools/sprite install
pnpm --dir tools/sprite run create my-dev --rex
```

With the fish config applied, run `sprite_create my-dev --rex` from any directory.

The CLI reads credentials from 1Password and installs the dotfiles, tools, and Rex. With `--rex`, it also starts Rex and adds the Sprite as a remote host on your Mac. Follow the printed Tailscale sign-in link using the same account as Rex on your Mac. If automatic registration fails, enter the printed name and URL in **Add Remote Host…**. Omit `--rex` to skip remote access setup.

Setup clones the repository from GitHub, so push changes before using them in a Sprite. Use `--ref <branch-or-tag>` to select a revision; the default is `main`. If setup is interrupted, rerun the same command with `--resume`.

Connect using the authenticated Sprites CLI:

```sh
sprite exec -s my-dev --tty -- fish -l
```

Sign in to Claude/Codex and check out your project inside the Sprite.

For all options, run `pnpm --dir tools/sprite run create --help`. The [setup code](create.ts) and [Linux mise config](../../private_dot_config/mise/conf.d/linux.toml) define what runs during setup.
