function renovate_prs -d "List open Renovate PRs with passing checks as Markdown"
    set -l width $COLUMNS
    set -l query 'query {
  personal: search(
    query: "is:pr is:open user:jonahsnider archived:false author:app/jonahsnider"
    type: ISSUE
    first: 100
  ) {
    nodes { ...pullRequestFields }
  }
  team581: search(
    query: "is:pr is:open org:team581 archived:false author:app/renovate"
    type: ISSUE
    first: 100
  ) {
    nodes { ...pullRequestFields }
  }
  zwsIm: search(
    query: "is:pr is:open org:zws-im archived:false author:app/renovate"
    type: ISSUE
    first: 100
  ) {
    nodes { ...pullRequestFields }
  }
}

fragment pullRequestFields on PullRequest {
  title
  url
  number
  repository {
    nameWithOwner
  }
  commits(last: 1) {
    nodes {
      commit {
        statusCheckRollup {
          state
        }
      }
    }
  }
}'

    begin
        echo '# Renovate PRs with passing checks'
        echo

        gh api graphql \
            -f query="$query" \
            --jq '.data[].nodes[]
                | select(.commits.nodes[-1].commit.statusCheckRollup.state == "SUCCESS")
                | "- [\(.repository.nameWithOwner)#\(.number)](\(.url)) — \(.title)"'
    end | glow --width $width -
end
