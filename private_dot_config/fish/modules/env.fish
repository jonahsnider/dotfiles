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
# GitHub token
set -gx HOMEBREW_GITHUB_API_TOKEN $GITHUB_TOKEN

# npm token
set -gx NPM_TOKEN (cat ~/.npm_token)
#endregion

#region Brew
set -gx HOMEBREW_PREFIX "/opt/homebrew"
set -gx HOMEBREW_CELLAR "$HOMEBREW_PREFIX/Cellar"
set -gx HOMEBREW_REPOSITORY "$HOMEBREW_PREFIX/homebrew"
fish_add_path -gP "$HOMEBREW_PREFIX/bin" "$HOMEBREW_PREFIX/sbin"
! set -q MANPATH; and set MANPATH ''; set -gx MANPATH "$HOMEBREW_PREFIX/share/man" $MANPATH;
! set -q INFOPATH; and set INFOPATH ''; set -gx INFOPATH "$HOMEBREW_PREFIX/share/info" $INFOPATH;
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
