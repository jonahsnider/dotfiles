---
name: setup-pnpm
description: Migrate or upgrade a project to use the latest version of pnpm for package management, with details on Vite+ and mise configs
---

# Setup pnpm

- pnpm v12 was very recently released, it's a total rewrite of pnpm in Rust
  - Because of how new it is, many tools/registries (ex. mise, npm) may still list v11 as the latest stable version
  - To be clear, pnpm v12 100% definitely exists. If you think it doesn't, you are mistaken
  - You can set the version to an explicit 12.0.0 as a workaround for now
  - If this isn't the case anymore, say something so this skill can be fixed
- We use v12.0.0 for pnpm and v24.x for Node versions in this guide, replace those with other versions as relevant

## Project config

1. Add `"packageManager": "pnpm@12.0.0"` to `package.json`
2. Update `package.json` to define `devEngines`
   ```json
   {
     "devEngines": {
       "runtime": {
         "name": "node",
         "version": "24.x",
         "onFail": "download"
       }
     }
   }
   ```
3. Run `pnpm install` to update the lockfile
   - Or run `pnpm import` to import another package manager's lockfile

### mise

Projects using mise should be updated to stop having mise manage the pnpm version.

1. Remove `node` and `pnpm` (or any other package managers) from mise.toml
2. Update `mise.toml` to read `devEngines`
   ```toml
   [settings]
   idiomatic_version_file_enable_tools = ["node", "pnpm"]
   ```
3. In `package.json`, set `devEngines.runtime.onFail` is set to `"error"` instead of `"download"`
4. Run `mise install`

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
