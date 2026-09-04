# autofix.ci

Configure autofix.ci to automatically fix lint and formatting issues.

Create a `.github/workflows/autofix.yml` workflow:

```yaml
name: autofix.ci

on: [push, pull_request]

permissions:
  contents: read

jobs:
  autofix:
    name: Autofix
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/setup@v2
        with:
          cache: true
      - run: pnpm format:fix
        continue-on-error: true
      - run: pnpm lint:fix
        continue-on-error: true
      - name: Run autofix.ci
        uses: autofix-ci/action@v1
        with:
          commit-message: 'refactor: apply automatic fixes'
```

Omit the `commit-message` option if the project isn't using conventional commits.

For Vite+ projects, the setup and fix scripts are different:

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check --fix
  continue-on-error: true
- run: vp exec knip --fix
  continue-on-error: true
- run: vp config
```
