---
name: finalize
description: Make finishing touches and polishes to a change before pushing/submitting for review.
---

# Finalize

Apply final touches to a set of changes.

## Simplification

- Knowing what we do now about the code, are there easy ways we could simplify things?
  - Have assumptions changed since the task was started?

## Cleanup comments

Delete or rework comments that add more noise rather than actually improving understanding:

- Delete comments where
  - The code is self-explanatory without it
  - The comment is narration rather than explanation
  - The comment is a changelog or historical note ("added", "now handles X", "without X")
- Update or remove comments that have drifted from the code and no longer serve a purpose
- Rework code where a rename or an extracted block makes the comment unnecessary
