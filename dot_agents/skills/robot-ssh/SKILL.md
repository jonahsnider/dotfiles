---
name: robot-ssh
description: SSH into an FRC robot to run commands or access logs
---

# FRC Robot SSH

Run `ssh lvuser@10.TE.AM.2` with no password (ex. `10.5.81.2`).
Logs are in `/U/logs`, but can also be in `~/logs`.

Download logs using plain `scp`, the roboRIO is very slow and this will take a while.
Don't try compressing them on the roboRIO.
