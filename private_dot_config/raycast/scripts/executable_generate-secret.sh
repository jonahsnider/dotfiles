#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Generate secret
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🔒
# @raycast.packageName Developer Utilities
# @raycast.description Generate a cryptographically secure password

# Documentation:
# @raycast.author jonahsnider
# @raycast.authorURL https://raycast.com/jonahsnider

LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32 | pbcopy
echo "Secret copied to clipboard"
