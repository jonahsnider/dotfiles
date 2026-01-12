# Setup Knip

Setup Knip in this project.

## Setup steps

Follow these steps to setup Knip.
Ensure that it runs properly.
Resolve any errors caused from misconfigurations, but don't make refactors unless necessary.

1. Install Knip with the configured project manager
   If in a monorepo, install it once at the root
2. Create a `knip.config.ts` file in the root of the project

   ```ts
   import type { KnipConfig } from "knip";

   const config: KnipConfig = {
     // TODO: Add config if necessary
   };

   export default config;
   ```

## Entry points

Knip is generally pretty smart at figuring out entrypoints.
When you provide the entrypoints array, it overwrites the default enabled ones, so only set that value when necessary.
Each entrypoint can go on a line, with blank lines to separate different groups of entrypoints (ex. frontend and backend).
Each line should have a brief comment describing what it's for

Most issues related to unused imports/dependencies are actually just the result of files not being marked as entrypoints.

## Project source files

Ensure that CSS files are considered part of the project source when relevant.

```ts
const config = {
  project: ["src/**/*.{ts,tsx,css}"],
};
```

## Ignored files

Libraries like shadcn/ui import a bunch of code that isn't always directly used.
It doesn't make sense to delete those exports, instead those components should just be ignored:

```ts
const config = {
  // Ignore shadcn/ui components that have been copied in
  ignore: ["src/components/ui/**"],
};
```

## Ignored dependencies and binaries

In the case that Knip has a false positive, you can add it to `ignoreDependencies` or `ignoreBinaries`.
Include a brief comment describing why it's being ignored.

```ts
const config = {
  ignoreDependencies: [
    // Used in vite.config.ts via plugin
    "@tanstack/router-plugin",
  ],
};
```

## Rules

Generally rules should be kept enabled.
Some make sense to ignore (ex. `enumMembers`) since they are more opionionated.

```ts
const config = {
  rules: {
    enumMembers: "off",
  },
};
```

## CI

Ensure that Knip is run in the CI pipeline.
Run using the configured package manager (ex. `bun run knip`):

```yaml
- name: Run Knip
  run: bun run knip
```

If the repo has autofix.ci configured, add a step for `knip --fix`:

```yaml
- name: Fix Knip issues
  run: bun run knip --fix
```
