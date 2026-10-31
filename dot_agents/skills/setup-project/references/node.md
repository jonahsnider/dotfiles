# Compilation and Runtime

Use an LTS version of Node.js, preferably the latest release.
Use modern syntax and runtime features where possible.

## Libraries

Libraries should be built with `zshy`, which wraps `tsc`. Disable its CJS output in `package.json`:

```json
{
  "type": "module",
  "zshy": {
    "exports": "./src/index.ts",
    "cjs": false
  }
}
```

`tsconfig.json`:

```json
{
  "extends": ["@tsconfig/strictest", "@tsconfig/recommended"]
}
```

Use Vite+ instead of zshy if it's already setup.
Set `pack.format` to `["esm"]` in `vite.config.ts` for `vp pack`.

## Apps and scripts

Ideally there is not an explicit build process needed, modern Node can run TS natively without flags.
They should still have a `build` script for CI, but with `noEmit`

`tsconfig.json`:

```json
{
  "extends": ["@tsconfig/strictest", "@tsconfig/node26", "@tsconfig/node-ts"]
}
```

`@tsconfig/node-ts` enforces that all syntax can be run by Node without a compilation step.
