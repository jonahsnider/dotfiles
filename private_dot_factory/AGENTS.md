# AGENTS.md

## Writing code

- When you're corrected by the user, consider if the feedback is generalizable enough to be added to a AGENTS.md file
  - If yes, ask the user if a memory should be recorded in AGENTS.md for future reference
- Keep changes simple, minimal impact and prefer lower complexity whenever possible
  - Do not add unrequested features, refactors, or abstractions
  - When given an example API or pattern to follow, match its simplicity closely
  - If a simple approach would actually be worse longterm, suggest a more complex approach and explain why the increased scope is better
- When working on a task, don't stop at planning or documentation, finish the implementation as well
  - If a plan is needed, keep it brief and move to code quickly unless the user explicitly asks for a plan only
- Don't be afraid to challenge the user's assumptions
  - If it seems like a proposed approach is problematic, inform the user of potential issues and suggest alternatives
  - Either you have correctly identified an issue with the proposed change, or you've gotten more context on the problem at hand, and will be better informed going forward
- Do not create fallback/legacy behavior unless explicitly requested
  - Feel free to ask whether existing functionality should be preserved if it's not already implied by their request

## Tooling

- Use linting/formatting tools instead of manually fixing (ex. indent, sorting imports, etc.)
- A modern version of Node is installed, and can run TypeScript natively without any flags
  - Shell setup means that env vars should also be automatically parsed from .env, use `--env-file` otherwise
  - Use top level await instead of wrapping everything in a giant async function

## External platforms

- Never post new comments, open issues, etc. without explicit permission from the user
- Slack URLs can't be accessed with FetchUrl, and MCP isn't available
- GitHub data should always be viewed using the `gh` CLI instead of FetchUrl
  - Generally prefer MCPs and CLIs over FetchUrl when possible
