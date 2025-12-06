# Local binaries
fish_add_path -g ~/.local/bin

#region macOS
if test -d /Applications
  fish_add_path -g /Applications
end
#endregion

#region Rust
# Cargo binaries
fish_add_path -g ~/.cargo/bin
#endregion

#region Nim
fish_add_path -g ~/.nimble/bin
#endregion

#region npm
fish_add_path -g ~/.npm-global/bin
#endregion

#region Bun
fish_add_path -g ~/.bun/bin
#endregion

#region tsgo
fish_add_path -g ~/programming/typescript-go/built/local
#endregion

#region Claude Code
fish_add_path -g ~/.claude/local
#endregion

#region pnpm
fish_add_path -g $PNPM_HOME
#endregion

#region Composer
fish_add_path -g ~/.composer/vendor/bin
#endregion

#region gcloud
fish_add_path -g /opt/homebrew/share/google-cloud-sdk/bin
#endregion

#region Sanity Nix
# See https://github.com/sanity-io/sanity-nix-config#enable-global-shims
fish_add_path -g /Users/jonah.snider/programming/sanity/sanity-nix-config/.devenv/bin
#endregion
