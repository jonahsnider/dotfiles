# Vite+

If Vite+ is already setup in a project, keep using it.
Migrating to Vite+ is good for:

- Libraries
- Vite backed frontend apps

And not good for:

- Next.js apps
- Astro/Svelte/etc apps (not supported yet)
- APIs

If it seems like a project is a good candidate for Vite+, ask the user before proceeding.

## New projects

Consider using `vp create` to create a new Vite+ project.

## Migration

Refer to Vite+'s [migration guide](https://viteplus.dev/guide/migrate) for guidance on how to migrate an existing project.
Generally we want to shed any old tooling decisions we may have had in favor of the standard Vite+ project setup.
