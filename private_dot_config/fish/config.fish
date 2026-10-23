set modules_dir (dirname (status --current-filename))/modules

# Stage 1 - No dependencies
source $modules_dir/env.fish

# Stage 2 - Depends on env
source $modules_dir/path.fish

# Added by Yarn Switch
source "$HOME/.yarn/switch/env.fish"

mise activate fish | source

# Stage 3 - Everything else
source $modules_dir/mnemonics.fish
source $modules_dir/general.fish
source $modules_dir/prompt.fish

source "$HOME/programming/sanity/mise-config/shell-hooks/loaded.fish"
