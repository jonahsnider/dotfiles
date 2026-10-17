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
