# dotfiles

- This is a Chezmoi-managed dotfiles project
- The repository supports a macOS laptop and Linux development hosts
- Keep shared config as ordinary files where possible, use templates for small platform differences
  - Avoid runtime OS or tool-existence checks when possible, use templates instead
  - Preserve `chezmoi re-add` for ordinary files, but edit templates in the source repo or with `chezmoi edit --apply`
- Chezmoi reads secrets from 1Password Environments while rendering templates and writes them into private dotfiles
  - macOS reads its Environment from the 1Password-mounted `~/.config/op/dotfiles.env` using `fromIni`
  - Linux hosts use `op environment read` (requires the CLI beta) with a service account for the Sprite Environment and a different set of tokens
- fish is the main shell being used, though ideally zsh is also kept mostly up-to-date
- Homebrew is the preferred way to install tools that are okay to be kept on the latest version all the time
- mise is used for tools that need to be kept at a specific version (ex. Node.js, Python)
