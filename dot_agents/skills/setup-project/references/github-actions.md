# GitHub Actions

Use GitHub Actions for CI.
Prefer one `ci.yml` workflow with several jobs in it (or for monorepos, maybe a single `build-and-test` job)

## Example CI

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  build-and-test:
    name: Build and test
    timeout-minutes: 5
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/setup@v2
        with:
          cache: true
      - run: pnpm format
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm knip
      - run: pnpm build
```

### Vite+

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  build-and-test:
    name: Build and test
    timeout-minutes: 5
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: voidzero-dev/setup-vp@v1
        with:
          cache: true
      - run: vp check
      - run: vp test
      - run: vp exec knip
      - run: vp build
```

For libraries, replace `vp build` with `vp pack`.

## Releases

Use Release Please to handle changelog generation and automate releases when needed (ex. libraries).

In `release-please.yml`:

```yaml
on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write
  id-token: write

name: Release Please

jobs:
  release-please:
    timeout-minutes: 15
    runs-on: ubuntu-latest
    steps:
      - name: Run release-please
        uses: googleapis/release-please-action@v5
        id: release
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          release-type: node
      - uses: actions/checkout@v7
        if: ${{ steps.release.outputs.release_created }}
      - uses: voidzero-dev/setup-vp@v1
        with:
          cache: true
        if: ${{ steps.release.outputs.release_created }}
      - run: vp pack
        if: ${{ steps.release.outputs.release_created }}
      - name: Publish to npm
        run: pnpm publish --provenance --access public
        if: ${{ steps.release.outputs.release_created }}
```
