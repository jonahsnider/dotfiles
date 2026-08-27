---
name: setup-pnpm
description: Migrate or upgrade a project to use the latest version of pnpm for package management, with details on Vite+ and mise configs
---

# Setup pnpm

- pnpm v12 was very recently released, it's a total rewrite of pnpm in Rust
  - Because of how new it is, many tools (ex. mise) may not recognize v12 as the latest stable version
  - You can set the version to an explicit 12.0.0 as a workaround for now
  - If this isn't the case anymore, say something so this skill can be fixed

## Project config

1. Add `"packageManager": "pnpm@12.0.0"` to `package.json`
2. Update `package.json` to define `devEngines`
   ```json
   {
     "devEngines": {
       "runtime": {
         "name": "node",
         "version": "24.x",
         "onFail": "error"
       }
     }
   }
   ```
3. Run `pnpm install` to update the lockfile

### mise

Projects using mise should be updated to stop having mise manage the pnpm version.

1. Update `mise.toml` to read `devEngines`
   ```toml
   [settings]
   idiomatic_version_file_enable_tools = ["node", "pnpm"]
   ```
2. Run `mise unuse pnpm node`

## GitHub Actions

For projects using mise or just pnpm, GitHub Actions should be configured the same way:

```yaml
- name: Setup pnpm
  uses: pnpm/setup@v2
  with:
    cache: true
```

This installs pnpm, Node, and project dependencies.

### Vite+

If already using Vite+, use their `setup-vp` action instead of `pnpm/setup`.

Make sure you have it with the right config set:

```yaml
- name: Setup Vite+
  uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
```
