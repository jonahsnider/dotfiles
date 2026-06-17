# https://cli.github.com/manual/gh_repo_edit
function __gh_repo_configure_available_checks -a repo
    set -l default_branch (gh repo view $repo --json defaultBranchRef -q .defaultBranchRef.name)
    set -l checks (gh api repos/$repo/commits/$default_branch/check-runs \
        --method GET \
        --paginate \
        -F per_page=100 \
        --jq '.check_runs[] | select(.app.id == 15368) | .name')
    or return

    if test (count $checks) -eq 0
        return 0
    end

    printf '%s\n' $checks | sort -u
end

function __gh_repo_configure_repository_ruleset_ids -a repo name
    gh api repos/$repo/rulesets \
        --method GET \
        --paginate \
        -F includes_parents=false \
        -F per_page=100 \
        --jq ".[] | select(.name == \"$name\" and .target == \"branch\") | .id"
end

function __gh_repo_configure_upsert_ruleset -a repo name
    read -lz payload
    or return

    set -l ruleset_ids (__gh_repo_configure_repository_ruleset_ids $repo $name)
    or return

    if test (count $ruleset_ids) -eq 0
        printf '%s\n' $payload \
            | gh api repos/$repo/rulesets --method POST --input - --silent
        return
    end

    for ruleset_id in $ruleset_ids
        printf '%s\n' $payload \
            | gh api repos/$repo/rulesets/$ruleset_id --method PUT --input - --silent
        or return
    end
end

function gh_repo_configure -d "Configure opinionated defaults for the current GitHub repo"
    argparse --name=gh_repo_configure h/help l/list-checks -- $argv
    or return

    if set -q _flag_help
        echo "Usage: gh_repo_configure [-l/--list-checks]"
        echo
        echo "Configures opinionated defaults for the current GitHub repo."
        echo
        echo "Options:"
        echo "  -l, --list-checks  List available GitHub Actions checks from the default branch and exit"
        echo "  -h, --help         Show this help"
        return 0
    end

    set -l repo (gh repo view --json nameWithOwner -q .nameWithOwner)

    if set -q _flag_list_checks
        __gh_repo_configure_available_checks $repo
        return
    end

    set -l available_checks (__gh_repo_configure_available_checks $repo)
    or return

    set -l selected_checks
    if test (count $available_checks) -gt 0
        if not command -q gum
            echo "gh_repo_configure: gum is required (brew install gum)" >&2
            return 1
        end

        set selected_checks (printf '%s\n' $available_checks | gum choose --no-limit --header "Select automerge checks")
        if test $status -ne 0
            return $status
        end

        if test (count $selected_checks) -eq 0
            echo "gh_repo_configure: no checks selected" >&2
            return 1
        end
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

    # Protect default branch from deletion and force pushes (no bypass)
    echo '{"name":"main","target":"branch","enforcement":"active","conditions":{"ref_name":{"exclude":[],"include":["~DEFAULT_BRANCH"]}},"rules":[{"type":"deletion"},{"type":"non_fast_forward"}],"bypass_actors":[]}' \
        | __gh_repo_configure_upsert_ruleset $repo main

    if test (count $selected_checks) -gt 0
        # Require status checks for automerge (bypassable by maintainers and autofix.ci)
        set -l checks
        for check in $selected_checks
            set -a checks (printf '{"context":"%s","integration_id":15368}' $check)
        end
        set -l checks_json (string join ',' $checks)

        printf '{"name":"automerge","target":"branch","enforcement":"active","conditions":{"ref_name":{"exclude":[],"include":["~DEFAULT_BRANCH"]}},"rules":[{"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":false,"do_not_enforce_on_create":false,"required_status_checks":[%s]}}],"bypass_actors":[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"},{"actor_id":243519,"actor_type":"Integration","bypass_mode":"always"}]}' $checks_json \
            | __gh_repo_configure_upsert_ruleset $repo automerge
    end
end
