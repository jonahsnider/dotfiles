---
name: yarn-corepack
description: Manage Yarn versions with Corepack instead of a local version
---

# Yarn with Corepack

1. Update `.yarnrc.yml` to only contain `nodeLinker: node-modules`
2. Update all GitHub Actions workflows to enable Corepack before running `actions/setup-node`
   ```yaml
   - name: Enable Corepack
     run: corepack enable
   ```
3. Delete `.yarn/releases/`
4. Run `yarn` to update the lockfile
