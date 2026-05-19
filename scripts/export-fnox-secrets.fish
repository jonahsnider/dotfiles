#!/usr/bin/env fish

fnox --config fnox.toml export --format json | jq -c '.secrets' | age --recipient age1xgslhc5w2xeq4z2x93rvgeuq2suuhnpj6m6v90ur5rgyuze6ds6q6lsuzn --output secrets.json.age
