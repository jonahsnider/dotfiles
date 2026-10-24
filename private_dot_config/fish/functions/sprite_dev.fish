function sprite_dev -d "Create, upgrade, and wake dev Sprites"
    set -l source_dir (chezmoi source-path)
    or return

    node "$source_dir/tools/sprite/cli.ts" $argv
end
