set -gx EDITOR nano

#region GPG
# Fix the "gpg: error building skey array: Inappropriate ioctl for device" error
# Solution from https://github.com/keybase/keybase-issues/issues/1712#issuecomment-141226705
export GPG_TTY=(tty)
#endregion

#region custom env
set -gx NODE_ENV development
#endregion

#region Deno
set -gx DENO_INSTALL ~/.deno
#endregion

#region Proto
set -gx PROTO_HOME "$HOME/.proto"
set -gx PATH "$PROTO_HOME/shims:$PROTO_HOME/bin" $PATH
#endregion

#region Bun
set -gx BUN_INSTALL "$HOME/.bun"
set -gx PATH $BUN_INSTALL/bin $PATH
#endregion

#region fnm
set -gx FNM_COREPACK_ENABLED true
#endregion

#region Python
# pyenv
if test (which pyenv)
  pyenv init - | source
end
#endregion

#region Secrets
# GitHub token
if test -f ~/.gh_token
  set -gx GITHUB_TOKEN (cat ~/.gh_token)
  set -gx HOMEBREW_GITHUB_API_TOKEN $GITHUB_TOKEN
end

# npm token
if test -f ~/.npm_token
  set -gx NPM_TOKEN (cat ~/.npm_token)
end
#endregion

#region .NET
set -gx DOTNET_CLI_TELEMETRY_OPTOUT true
#endregion

#region Brew
if test -f /opt/homebrew/bin/brew
  set -gx HOMEBREW_PREFIX "/opt/homebrew"
	set -gx HOMEBREW_CELLAR "$HOMEBREW_PREFIX/Cellar"
	set -gx HOMEBREW_REPOSITORY "$HOMEBREW_PREFIX/homebrew"
  fish_add_path -gP "$HOMEBREW_PREFIX/bin" "$HOMEBREW_PREFIX/sbin";
  ! set -q MANPATH; and set MANPATH ''; set -gx MANPATH "$HOMEBREW_PREFIX/share/man" $MANPATH;
  ! set -q INFOPATH; and set INFOPATH ''; set -gx INFOPATH "$HOMEBREW_PREFIX/share/info" $INFOPATH;
end
#endregion

#region Mise
mise env --shell fish | source
#endregion
