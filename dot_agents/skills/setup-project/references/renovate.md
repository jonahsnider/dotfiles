# Renovate

Renovate is used to keep dependencies and tools updated automatically.

Just add a `renovate.json` file and the rest will work automatically:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>jonahsnider/renovate-config"]
}
```

Pin all dependecy versions to be exact unless there's a good reason not to (ex. intentionally broad library dependencies).
