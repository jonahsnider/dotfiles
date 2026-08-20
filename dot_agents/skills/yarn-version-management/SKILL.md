---
name: yarn-version-management
description: Manage or migrate Yarn project versions through packageManager and Yarn's official GitHub Actions setup
---

# Yarn version management

- Treat `package.json#packageManager` as the source of truth for the Yarn version.
- When migrating away from a checked-in Yarn binary, remove `yarnPath` from `.yarnrc.yml`, preserve the other settings, and delete `.yarn/releases/`.
- In GitHub Actions, install Yarn before setting up Node so `actions/setup-node` can cache Yarn dependencies:
  ```yaml
  - name: Setup Yarn
    uses: yarnpkg/setup-action@main
  - name: Setup Node.js
    uses: actions/setup-node@v7
    with:
      node-version: "lts/*"
      cache: yarn
  ```
  Match the Node version to the project's existing configuration.
- After changing the Yarn version or setup, run `yarn` to update the lockfile.
