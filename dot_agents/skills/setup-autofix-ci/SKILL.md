---
name: setup-autofix-ci
description: Add autofix.ci to a project. Use when setting up automatic code fixing in CI via autofix.ci, creating the autofix.yml GitHub Actions workflow.
---

# Setup autofix.ci

Add autofix.ci to the project.

1. Create a new file `autofix.yml` in `.github/workflows`
2. Setup the workflow

   ```yaml
   name: autofix.ci # needed to securely identify the workflow

   on: [push, pull_request]

   permissions:
     contents: read

   jobs:
     autofix:
       name: Autofix
       runs-on: ubuntu-latest
       steps:
         - name: Checkout Git repository
           uses: actions/checkout@v6

           # TODO: Setup runtime (Node, Bun, Java, etc.)

           # TODO: Install dependencies

           # TODO: Apply fixes

         - name: Run autofix.ci
           uses: autofix-ci/action@v1
           with:
             commit-message: "refactor: apply automatic fixes"
   ```

   If the project doesn't use conventional commits, remove the `with` block entirely to use the default commit message.

## Runtime setup

### Bun

Some projects might use Bun just for package management

```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v2
- name: Install dependencies
  run: bun install --frozen-lockfile
```

### Yarn

Keep the Yarn version pinned in `package.json#packageManager`. Check what Node version to use by looking at the project's existing configuration.

```yaml
- name: Setup Yarn
  uses: yarnpkg/setup-action@main
- name: Setup Node.js
  uses: actions/setup-node@v7
  with:
    node-version: "lts/*"
    cache: yarn
- name: Install dependencies
  run: yarn install --immutable
```

### pnpm

Use the versions declared by `packageManager` and `devEngines.runtime` in `package.json`. If the runtime is not declared there, set the `runtime` input to match the project's existing configuration.

```yaml
- name: Setup pnpm
  uses: pnpm/setup@v2
  with:
    cache: true
```

### Java

Check what version of Java to use by looking at existing CI pipelines.

```yaml
- name: Setup Java
  uses: actions/setup-java@v5
  with:
    distribution: "temurin"
    java-version: 25
    cache: "gradle"
```

### Vite+

Vite+ projects use the `vp` CLI, which manages its own runtime. No separate Node/Bun setup or install step is needed: `setup-vp` runs `vp install` automatically (`run-install` defaults to `true`).

```yaml
- name: Setup Vite+
  uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
```

## Applying fixes

### General

Check project metadata (ex. `package.json`) for context on what tooling is used for linting and formatting.

Set `continue-on-error: true` on every step that applies fixes. A fixer can modify files and still exit non-zero when issues remain; the workflow must continue so `autofix-ci/action` can commit the partial fixes.

### Biome

In addition to running Biome fixes, the Biome schema can be automatically migrated by running `biome migrate --write`.

For example, with Yarn:

```yaml
- name: Migrate Biome schema
  continue-on-error: true
  run: yarn biome migrate --write
```

### Vite+

Vite+ bundles linting and formatting via `vp check`. Knip can be run through `vp exec`.

```yaml
- name: Apply lint and formatting fixes
  continue-on-error: true
  run: vp check --fix
- name: Apply Knip fixes
  continue-on-error: true
  run: vp exec knip --fix
```
