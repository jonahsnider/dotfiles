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
