---
name: sanity-test
description: Info on how to test Sanity, especially when working with a local dev instance of the Sanity MCP.
---

Make sure the dev server is running, either as a process you manage or something the user starts outside.
Use `up -D` to start it in detached mode, and `down` to stop it.

You can use `sup logs mellon --lines=50` or `sup logs mellon --follow` to view logs for the service.

The `k6xtz0tk` project in the `oEibUYrzC` organization on staging has lots of throwaway datasets that are created as part of evals.
You can use those as a playground for testing the MCP server.
