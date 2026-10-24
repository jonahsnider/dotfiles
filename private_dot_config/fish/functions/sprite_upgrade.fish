function sprite_upgrade -d "Update a Sprite's dotfiles, managed tools, and Rex"
    set -l source_dir (chezmoi source-path)
    or return

    pnpm --dir "$source_dir/tools/sprite" run upgrade $argv
end
