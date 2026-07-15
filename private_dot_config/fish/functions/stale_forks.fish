function __stale_forks_check -a fork
    set -l fields (string split \t $fork)
    set -l fork_name $fields[1]
    set -l url $fields[2]
    set -l parent $fields[3]
    set -l fork_fields (string split / $fork_name)

    set -l open_prs (gh api graphql \
        --paginate \
        -f owner=$fork_fields[1] \
        -f name=$fork_fields[2] \
        -f query='query($owner: String!, $name: String!, $endCursor: String) {
            repository(owner: $owner, name: $name) {
                refs(first: 100, after: $endCursor, refPrefix: "refs/heads/") {
                    nodes {
                        associatedPullRequests(first: 100, states: OPEN) {
                            nodes {
                                baseRepository { nameWithOwner }
                                headRepository { nameWithOwner }
                            }
                        }
                    }
                    pageInfo { hasNextPage endCursor }
                }
            }
        }' \
        --jq ".data.repository.refs.nodes[].associatedPullRequests.nodes[] | select(.headRepository.nameWithOwner == \"$fork_name\" and .baseRepository.nameWithOwner == \"$parent\") | .headRepository.nameWithOwner")

    if test $status -ne 0
        echo "error:$fork_name"
    else if test (count $open_prs) -eq 0
        echo "stale:- [$fork_name]($url) — fork of [$parent](https://github.com/$parent)"
    end
end

function stale_forks -d "List forks without an open upstream PR as Markdown"
    set -l width $COLUMNS
    echo "Checking forks..." >&2

    # 49 repositories × 100 refs × 100 PRs stays under GitHub's 500,000-node query limit.
    set -l forks (gh api graphql \
        --paginate \
        -f query='query($endCursor: String) {
            viewer {
                repositories(first: 49, after: $endCursor, isFork: true, ownerAffiliations: OWNER) {
                    nodes {
                        nameWithOwner
                        url
                        parent { nameWithOwner }
                        refs(first: 100, refPrefix: "refs/heads/") {
                            totalCount
                            nodes {
                                associatedPullRequests(first: 100, states: OPEN) {
                                    nodes {
                                        baseRepository { nameWithOwner }
                                        headRepository { nameWithOwner }
                                    }
                                }
                            }
                        }
                    }
                    pageInfo { hasNextPage endCursor }
                }
            }
        }' \
        --jq '.data.viewer.repositories.nodes[] | select(.parent != null) | . as $repo | [.nameWithOwner, .url, .parent.nameWithOwner, (.refs.totalCount | tostring), ([.refs.nodes[].associatedPullRequests.nodes[] | select(.headRepository.nameWithOwner == $repo.nameWithOwner and .baseRepository.nameWithOwner == $repo.parent.nameWithOwner)] | length | tostring)] | @tsv')
    or return

    set -l fork_count (count $forks)
    echo "Checked the first 100 branches of $fork_count forks" >&2

    set -l stale_forks
    set -l large_forks
    for fork in $forks
        set -l fields (string split \t $fork)
        set -l fork_name $fields[1]
        set -l url $fields[2]
        set -l parent $fields[3]
        set -l branch_count $fields[4]
        set -l open_pr_count $fields[5]

        if test $open_pr_count -gt 0
            continue
        else if test $branch_count -le 100
            set -a stale_forks "- [$fork_name]($url) — fork of [$parent](https://github.com/$parent)"
        else
            set -a large_forks $fork
        end
    end

    if test (count $large_forks) -gt 0
        set -l concurrency 8
        set -l large_fork_count (count $large_forks)
        set -l fork_label fork
        if test $large_fork_count -ne 1
            set fork_label forks
        end
        echo "Checking all branches of $large_fork_count large $fork_label ($concurrency at a time)..." >&2

        set -l results (
            set -l pids

            for fork in $large_forks
                __stale_forks_check $fork &
                set -a pids $last_pid

                if test (count $pids) -eq $concurrency
                    wait $pids
                    set pids
                end
            end

            if test (count $pids) -gt 0
                wait $pids
            end
        )

        set -l failed_forks (string match 'error:*' $results | string replace 'error:' '')
        if test (count $failed_forks) -gt 0
            echo "stale_forks: failed to check "(string join ', ' $failed_forks) >&2
            return 1
        end

        set -a stale_forks (string match 'stale:*' $results | string replace 'stale:' '')
    end

    if test (count $stale_forks) -gt 0
        set stale_forks (printf '%s\n' $stale_forks | sort)
    end

    begin
        echo "# Stale forks"
        echo

        if test (count $stale_forks) -eq 0
            echo "No stale forks."
        else
            printf '%s\n' $stale_forks
        end
    end | glow --width $width -
end
