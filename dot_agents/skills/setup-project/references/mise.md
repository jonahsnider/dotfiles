# mise

Use mise for managing tool versions, especially Node.js and pnpm.
Assume that it is globally installed for contributors.
Generally don't use mise to install tools in CI, prefer more specific options (ex. `actions/setup-java`)

## mise.toml

Projects using mise should be updated to stop having mise manage the pnpm version.

1. Remove `node` and `pnpm` (or any other package managers) from mise.toml
2. Update `mise.toml` to use `devEngines` as the source of truth
   ```toml
   [settings]
   idiomatic_version_file_enable_tools = ["node", "pnpm"]
   ```
3. Run `mise install`

## Local development

### pitchfork

Use [pitchfork](https://pitchfork.jdx.dev/) to automatically start local dev infra via Docker Compose.

Create `compose.yaml`:

```yaml
services:
  postgres:
    image: postgres:18
    environment:
      # ...
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "psql -U example -d example -tAc 'SELECT 1'"]
      interval: 2s
      timeout: 5s
      retries: 15

volumes:
  postgres-data:
```

Create a `pitchfork.toml`:

```toml
#:schema https://pitchfork.jdx.dev/schema.json

[daemons.postgres]
run = "docker compose up postgres"
auto = ["start", "stop"]
ready_output = "database system is ready to accept connections"
port = 5432
```

### hk

Use [hk](https://hk.jdx.dev/) if pre-commit hooks are needed, only if you aren't using Vite+ (which manages its own hooks).
Use their extensive library of built-ins:

```pkl
amends "package://github.com/jdx/hk/releases/download/v1.57.0/hk@1.57.0#/Config.pkl"

import "package://github.com/jdx/hk/releases/download/v1.57.0/hk@1.57.0#/Builtins.pkl"

hooks {
  ["pre-commit"] {
    steps {
      ["oxlint"] = (Builtins.ox_lint) {
        prefix = List("pnpm", "exec")
      }
      ["oxfmt"] = (Builtins.oxfmt) {
        prefix = List("pnpm", "exec")
      }
      ["knip"] = (Builtins.knip) {
        prefix = List("pnpm", "exec")
      }
      ["type-check"] = (Builtins.tsc) {
        prefix = List("pnpm", "exec")
      }
    }
  }
}
```
