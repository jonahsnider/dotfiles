# dotfiles

- This is a Chezmoi-managed dotfiles project
- I only have one computer, so this is all for a single-machine setup
  - The goal is that I can migrate machines easily though
- Secrets are managed through 1Password (mix of personal and work accounts) as Chezmoi templates
- fish is the main shell being used, though ideally zsh is also kept mostly up-to-date
- Homebrew is the preferred way to install tools that are okay to be kept on the latest version all the time
- mise is used for tools that need to be kept at a specific version (ex. Node.js, Python)
