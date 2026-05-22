# https://cli.github.com/manual/gh_repo_edit
function gh_repo_configure -d "Configure opinionated defaults for the current GitHub repo"
    argparse --name=gh_repo_configure 'h/help' 'c/check=+' -- $argv
    or return

    if set -q _flag_help
        echo "Usage: gh_repo_configure [-c/--check NAME]..."
        echo
        echo "Configures opinionated defaults for the current GitHub repo."
        echo
        echo "Options:"
        echo "  -c, --check NAME  Required status check for automerge ruleset (repeatable)"
        echo "  -h, --help        Show this help"
        return 0
    end

    gh repo edit \
        --enable-auto-merge \
        --delete-branch-on-merge \
        --enable-squash-merge \
        --squash-merge-commit-message pr-title-description \
        --enable-merge-commit=false \
        --enable-rebase-merge=false \
        --enable-wiki=false \
        --enable-issues \
        --enable-discussions \
        --enable-projects=false

    set -l repo (gh repo view --json nameWithOwner -q .nameWithOwner)

    # Protect default branch from deletion and force pushes (no bypass)
    echo '{"name":"main","target":"branch","enforcement":"active","conditions":{"ref_name":{"exclude":[],"include":["~DEFAULT_BRANCH"]}},"rules":[{"type":"deletion"},{"type":"non_fast_forward"}],"bypass_actors":[]}' \
        | gh api repos/$repo/rulesets --method POST --input - --silent

    # Require status checks for automerge (bypassable by maintainers)
    if set -q _flag_check
        set -l checks
        for check in $_flag_check
            set -a checks (printf '{"context":"%s","integration_id":15368}' $check)
        end
        set -l checks_json (string join ',' $checks)

        printf '{"name":"automerge","target":"branch","enforcement":"active","conditions":{"ref_name":{"exclude":[],"include":["~DEFAULT_BRANCH"]}},"rules":[{"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":false,"do_not_enforce_on_create":false,"required_status_checks":[%s]}}],"bypass_actors":[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"}]}' $checks_json \
            | gh api repos/$repo/rulesets --method POST --input - --silent
    end
end
