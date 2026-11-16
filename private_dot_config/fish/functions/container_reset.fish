function container_reset -d "Restart Apple container and socktainer (needed after upgrading container)"
    # The apiserver is registered with a versioned Cellar path, so it must be re-registered after upgrades
    container system stop
    and container system start
    and brew services restart socktainer
end
