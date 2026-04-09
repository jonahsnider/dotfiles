set -gx EDITOR nano

#region GPG
# Fix the "gpg: error building skey array: Inappropriate ioctl for device" error
# Solution from https://github.com/keybase/keybase-issues/issues/1712#issuecomment-141226705
export GPG_TTY=(tty)
#endregion

#region custom env
set -gx NODE_ENV development
#endregion

#region Secrets
# npm token
set -gx NPM_TOKEN (cat ~/.npm_token)

#endregion

#region Homebrew
set -gx HOMEBREW_BUNDLE_DESCRIBE 1
set -gx HOMEBREW_BUNDLE_DUMP_NO_VSCODE 1
set -gx HOMEBREW_BUNDLE_DUMP_NO_GO 1
set -gx HOMEBREW_NO_ENV_HINTS 1
#endregion

#region Mise
set -gx MISE_NODE_COREPACK true
#endregion

#region pnpm
set -gx PNPM_HOME "/Users/jonah.snider/Library/pnpm"
#endregion

#region Sanity Nix
set -gx SANITY_NIX_PATH "/Users/jonah.snider/programming/sanity/sanity-nix-config"
#endregion

#region Docker
# See https://github.com/railwayapp/railpack#getting-started
set -gx BUILDKIT_HOST "docker-container://buildkit"
#endregion

#region Vite+
source ~/.vite-plus/env.fish
#endregion
