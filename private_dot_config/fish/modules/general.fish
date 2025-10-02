#region Python
# Use Python 3 by default
abbr --add python python3
#endregion

#region Yarn
# Alias Squoosh CLI
abbr --add squoosh squoosh-cli
#endregion

# 1Password plugins
source ~/.config/op/plugins.sh

# Zoxide
zoxide init fish | source