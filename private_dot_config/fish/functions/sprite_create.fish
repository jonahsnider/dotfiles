function sprite_create -d "Create a dev Sprite with dotfiles and tools"
    set -l source_dir (chezmoi source-path)
    or return

    pnpm --dir "$source_dir/tools/sprite" run create $argv
end
