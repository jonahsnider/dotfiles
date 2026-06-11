function cf_pages_delete_deployments -d "Bulk delete all deployments for a Cloudflare Pages project"
    argparse --name=cf_pages_delete_deployments h/help -- $argv
    or return

    if set -q _flag_help; or test (count $argv) -ne 1
        echo "Usage: cf_pages_delete_deployments <PROJECT_NAME>"
        echo
        echo "Deletes all deployments for a Cloudflare Pages project so the project can be removed."
        echo "The active production deployment is preserved."
        echo
        echo "Options:"
        echo "  -h, --help  Show this help"
        if set -q _flag_help
            return 0
        end
        return 1
    end

    set -l project $argv[1]
    set -l prod_id ""
    set -l log (mktemp)

    while true
        set -l ids (wrangler pages deployment list --project-name $project --json | jq -r '.[].Id')
        or begin
            rm -f $log
            return 1
        end

        set -l to_delete
        for id in $ids
            test "$id" != "$prod_id"; and set -a to_delete $id
        end

        if test (count $to_delete) -eq 0
            echo "Done. Production: $prod_id"
            break
        end

        echo "Deleting "(count $to_delete)" deployments..."

        for id in $to_delete
            if not wrangler pages deployment delete $id --project-name $project --force 2>&1 | tee $log | grep -q "Successfully deleted"
                grep -q "active production deployment" $log; and set prod_id $id
            end
        end
    end

    rm -f $log
end
