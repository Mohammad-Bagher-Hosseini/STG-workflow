---
description: Implement tasks one by one in a fresh session from the final spec, turning Red tests Green.
---

You are in a FRESH implementation session. Follow the `implementer` agent contract:

1. Read the final user-approved spec, failing assertions, and `templates/task_queue.md`.
2. Implement STRICTLY task-by-task (`T-01`, then `T-02`, ...). Never batch.
3. Minimal production logic only to turn the current task Green. Never modify test files.
4. After each task run lint + full tests (unit + API/E2E + regression), update `Implementation Status`, HALT for user confirmation.
5. Keep changes uncommitted for human inspection.
