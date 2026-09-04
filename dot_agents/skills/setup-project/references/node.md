# Compilation and Runtime

Use an LTS version of Node.js, preferably the latest release.

## Libraries

Libraries should be built with `zshy`, which wraps `tsc`.

`tsconfig.json`:

```json
{
  "extends": ["@tsconfig/strictest", "@tsconfig/recommended"]
}
```

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
