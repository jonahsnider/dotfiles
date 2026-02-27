# Team 581 CLAUDE.md

Team 581 is an FRC team.
This document outlines the behavior Claude should follow when working with Team 581 projects.

## Tooling

When working in a Java project, use Spotless to apply automatic formatting:

```sh
./gradlew spotlessApply
```

You don't need to scope this to a specific subproject.
Spotless will handle basic code style changes, as well as sorting imports and reorganizing class member declarations.
