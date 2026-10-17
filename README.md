# dotfiles

These are my dotfiles that I use on my personal/work MacBooks.

- Chezmoi used to manage all the files in this repo

## Patterns

- Chezmoi for tracking all the config files
- Prefer installing apps and system-wide dev tools via Homebrew
  - Run `brew bundle dump --global` and then `chezmoi re-add` to backport Homebrew changes to this repository
- Dev tools that are versioned per-project (ex. Node, Java, etc.) are managed with mise

## Setting up on a new computer

1. Install Homebrew
2. Install Chezmoi via Homebrew
3. Clone this Git repository to `~/programming/dotfiles`
4. Set the Chezmoi config to point to that directoy

   ```toml
   # ~/.config/chezmoi/chezmoi.toml
   sourceDir = "/Users/jonah.snider/programming/dotfiles"
   ```
5. `chezmoi apply` 🫡

## ChatGPT / Codex configuration

`dot_codex/private_config.toml` manages `~/.codex/config.toml`, including the Sanity work MCP servers. Sentry and Grafana (through `sanity-tools`) are available from the main configuration without selecting the `sanity` profile. Server URLs, names, and the BigQuery/Grafana header remain the same; authentication is still managed separately by the app.

When migrating from the old `sanity` profile:

1. Apply the updated main config with Chezmoi.
2. Remove any `--profile sanity` option from local launchers and use the main profile in the app.
3. Review and remove the old `~/.codex/sanity.config.toml` if it remains. Removing its source file from this repo does not automatically remove an existing target file; preserve any local-only settings first.

The repository-local `.codex/config.toml` is separate and remains unchanged.
