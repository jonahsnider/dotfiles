function renovate_prs -d "List open Renovate PRs with passing checks as Markdown"
    set -l width $COLUMNS

    gh search prs \
        --author app/renovate \
        --state open \
        --owner jonahsnider \
        --archived=false \
        --checks success \
        --limit 100 \
        --json title,url,repository,number \
        --template '# Renovate PRs with passing checks

{{range .}}- [{{.repository.nameWithOwner}}#{{.number}}]({{.url}}) — {{.title}}
{{end}}' | glow --width $width -
end
