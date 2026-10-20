# Load Fish's Git completions before overriding their branch helper.
status get-file completions/git.fish | source

function __fish_git_branches
    __fish_git_local_branches

    if not __fish_git_using_command switch
        __fish_git_remote_branches
    end
end
