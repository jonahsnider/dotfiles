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
set -gx GITHUB_TOKEN (cat ~/.gh_token)
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

#region Docker
set -gx COMPOSE_BAKE true
#endregion

#region Mise
function cache_mise_output --argument-names cmd cache_file
    # Source the cache if it exists
    if test -f $cache_file
        source $cache_file
    end

    # Refresh the cache in the background using fish's native job control
    eval "$cmd > $cache_file &"
end

set -gx MISE_NODE_COREPACK true

cache_mise_output "mise env --shell fish" ~/.cache/mise_env.fish
cache_mise_output "mise activate fish" ~/.cache/mise_activate.fish
#endregion
