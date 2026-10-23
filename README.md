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
5. `chezmoi apply` 🫡

## Setting up on Linux

1. Install prerequisite tools
   - Install Git, gh, Chezmoi, fish, mise, jq, Python 3, delta, fresh, direnv, zoxide, and starship (used during template rendering)
   - `curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher`
   - `curl -fsSL https://vite.plus | bash` then `vp env setup`
2. Clone this repo to `~/programming/dotfiles` and set Chezmoi's `sourceDir` to that path, as above
3. Set up 1Password access as described below
4. Run `chezmoi apply --exclude=scripts`, start a new fish shell to load the tokens, then run `chezmoi apply` to install tools and plugins

## Secrets

- Chezmoi fetches secrets from 1Password Environments and writes them to private config files which are loaded by fish
- Requires 1Password CLI 2.41+ and Python 3
  - macOS uses the Homebrew CLI with [desktop app integration](https://www.1password.dev/cli/app-integration)
  - Sprites use a read-only service-account token saved to `~/.config/op/service-account-token` with mode `0600`
- Environment IDs and token names are configured in [onepassword-secrets.json](.chezmoitemplates/onepassword-secrets.json)
- To refresh tokens, run `chezmoi apply` and start a new shell

## Making changes

- Edit ordinary files locally, then run `chezmoi re-add`
- Edit templates in this repo or with `chezmoi edit --apply <path>`
