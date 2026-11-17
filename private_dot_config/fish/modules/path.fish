# Local binaries
fish_add_path -g ~/.local/bin

# Rust
# Cargo binaries
fish_add_path -g ~/.cargo/bin

# Nim
fish_add_path -g ~/.nimble/bin

# npm
fish_add_path -g ~/.npm-global/bin

# Bun
fish_add_path -g ~/.bun/bin

# tsgo
fish_add_path -g ~/programming/typescript-go/built/local

# Claude Code
fish_add_path -g ~/.claude/local

# pnpm
fish_add_path -g "$PNPM_HOME" "$PNPM_HOME/bin"

# Composer
fish_add_path -g ~/.composer/vendor/bin

# Sell Traces
fish_add_path -g ~/.selltraces/bin

alias san "$HOME/programming/sanity/cli/packages/@sanity/cli/bin/run.js"
