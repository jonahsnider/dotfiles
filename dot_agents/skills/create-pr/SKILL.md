---
name: create-pr
description: Standards for creating a pull request (PR) and associated Linear issues
---

# Create PR

Ignore the Linear info if the PR being created isn't part of work for Sanity.

- Each PR should have a Linear issue associated with it, except for some tiny changes (ex. changing linter config, fixing CI, etc.)
  - If no Linear issue exists, ask before creating one
  - Linear issues generally go in the user's AIGRO team
  - Issue body should be 1-2 paragraphs at most, outlining at a high level what the problem is, why it matters, and potentially tips on how to implement
- Branches should use the Linear issue ID as part of their name (ex. `aigro-123/short-fix-name`)
  - Branches without Linear issues should use semantic commit prefixes (ex. `fix/short-fix-name`)
- Create PR as a draft unless the changes are tiny enough it can be marked ready immediately
- PR body should usually be 1-3 sentences focusing on the problem and resulting behavior, similar to bullet points in style
  - 1-2 sentences summarizing the issue being addressed and/or reference the Linear ticket ID
  - 1-2 sentences explaining how the change was implemented
  - Do not include testing or validation summaries unless explicitly requested
  - For complex PRs this may not be sufficient, including more info as-needed is okay
  - Generally though, less is more - the user can always expand the description afterwards
