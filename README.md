# dotfiles

These dotfiles are shared between my macOS laptop and Linux development hosts.

- Chezmoi used to manage all the files in this repo

## Patterns

- Chezmoi for tracking all the config files
- Prefer installing apps and system-wide dev tools via Homebrew on macOS
  - Run `brew bundle dump --global` and then `chezmoi re-add` to backport Homebrew changes to this repository
- Use the native package manager or official installers for Linux system tools
- Dev tools that are versioned per-project (ex. Node, Java, etc.) are managed with mise
- Keep shared config files as ordinary files where possible
  - Use small Chezmoi conditionals where platform differences are needed, and `.chezmoiignore` for whole files that only belong on one platform
  - This avoids runtime checks (ex. if a tool or file is present) during shell startup

## Setting up on macOS

1. Install Homebrew
2. Install Chezmoi via Homebrew
3. Clone this Git repository to `~/programming/dotfiles`
4. Set the Chezmoi config to point to that directory
   ```toml
   # ~/.config/chezmoi/chezmoi.toml
   sourceDir = "/Users/jonah.snider/programming/dotfiles"
   ```
5. Set up the 1Password-mounted `.env` file as described below
6. `chezmoi apply` 🫡

## Working with Sprites

Use the [Sprite setup CLI](tools/sprite/README.md) from macOS to create a Linux dev instance with these dotfiles, tools, secrets, and Rex configured automatically.

## Secrets

- Chezmoi reads secrets from 1Password Environments and writes them to private config files which are loaded by fish
- On macOS, mount the local Environment at `~/.config/op/dotfiles.env` using [1Password's local .env file integration](https://www.1password.dev/environments/local-env-file)
  - Chezmoi parses the `KEY=value` entries directly with `fromIni`
- On Linux, Chezmoi uses `op environment read` with the service account configured by the setup CLI
- The Linux Environment ID and shared token names are configured in [onepassword-secrets.json](.chezmoitemplates/onepassword-secrets.json)
- To refresh tokens, run `chezmoi apply` and start a new shell

## Making changes

- Edit ordinary files locally, then run `chezmoi re-add`
- Edit templates in this repo or with `chezmoi edit --apply <path>`
