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

If the existing CI pipeline is missing the step for `corepack enable`, it's probably because it's still using an in-repo version of the Yarn binary.

Check what version of Node to use by looking at existing CI pipelines.

```yaml
- name: Enable Corepack
  # Required due to a limitation in setup-node https://github.com/actions/setup-node/issues/480#issuecomment-1820622085
  run: corepack enable
- name: Setup Node.js
  uses: actions/setup-node@v6
  with:
    node-version: "lts/*"
    cache: "yarn"
- name: Install dependencies
  run: yarn install --immutable
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

## Applying fixes

### General

Check project metadat (ex. `package.json`) for context on what tooling is used for linting and formatting.

### Biome

In addition to running Biome fixes, the Biome schema can be automatically migrated by running `biome migrate --write`.

For example, with Yarn:

```yaml
- name: Migrate Biome schema
  run: yarn biome migrate --write
```
