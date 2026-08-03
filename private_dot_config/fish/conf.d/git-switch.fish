# Load Fish's Git completions before overriding their branch helper.
complete -C "git -" >/dev/null 2>/dev/null

function __fish_git_branches
    __fish_git_local_branches

    if not __fish_git_using_command switch
        __fish_git_remote_branches
    end
end
