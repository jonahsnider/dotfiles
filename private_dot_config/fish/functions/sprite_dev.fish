function sprite_dev -d "Create and upgrade dev Sprites"
    set -l source_dir (chezmoi source-path)
    or return

    pnpm --silent --dir "$source_dir/tools/sprite" run cli $argv
end
