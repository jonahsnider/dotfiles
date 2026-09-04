---
name: setup-project
description: Setup a new TypeScript project or update an existing one to follow best practices. Includes config guides for pnpm, Vite+, GitHub Actions, mise, Release Please, Renovate, Knip, Oxfmt, Oxlint, autofix.ci, and other tools.
---

# TypeScript project best practices

My preferences on how to setup TypeScript projects, including libraries, APIs, and web apps.

This skill file is an index, most of the info is in the `references` folder.
For a full audit, go through the list in order, since there are some dependencies between steps:

1. Vite+ -> `references/vite-plus.md`
2. Compilation & runtime -> `references/node.md`
3. Tool management for local development -> `references/mise.md`
   - Renovate -> `references/renovate.md`
4. Dependency management -> `references/pnpm.md`
5. Linting and formatting -> `references/oxc.md`
6. Knip -> `references/knip.md`
7. Testing -> `references/testing.md`
8. CI -> `references/github-actions.md`
   - CI autofix -> `references/autofix-ci.md`

For frameworks and libraries that are more situational:

- Convex, preferred for any new apps requiring a backend
  - Works with Vite+ for a frontend
- Drizzle, for working with existing non-Convex DBs
- Railway, for hosting apps that can't be serverless or DBs (likely Redis or PostgreSQL)
- Cloudflare Workers, for hosting static frontends
- TanStack Start, for frontend apps
- Astro, for non-interactive static sites
- Sentry, for error monitoring, observability, and tracing
