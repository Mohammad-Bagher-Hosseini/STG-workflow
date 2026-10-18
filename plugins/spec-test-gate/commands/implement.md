---
description: Implement tasks one by one in a fresh session from the final spec, turning Red tests Green. Refuses tasks missing any Red layer.
argument-hint: [slug]
---

You are in a FRESH implementation session. Follow the `implementer` agent contract.

Scope guard: run this inside a TARGET project repo, never inside the spec-test-gate marketplace repo itself. All state lives under the project's `.agents/` — never create a `templates/` directory in the project.

## Syntax

```text
/spec-test-gate:implement [<slug>]
```

- `<slug>` is the epic slug from Phase 1 (e.g. `login-api`). If omitted and exactly one `.agents/*/task_queue.md` exists, use it; if several exist, HALT and ask the user which epic before touching anything.

## Steps

0. ALL-RED GATE (no bypass): resolve `.agents/<slug>/task_queue.md` and read the next pending task's row. It may proceed ONLY if its Unit, API, AND E2E statuses are all Red. If ANY layer is missing, skipped, or not Red — REFUSE to implement: output exactly which layer is missing for which task and send the user back to `/spec-test-gate:step-task T-[N] --epic <slug>`. Do NOT write production code for a task that fails this gate, and do NOT "catch up" the missing tests yourself (tests belong to Session 1).
1. Read the final user-approved spec section, the failing assertions, and the queue.
2. Implement STRICTLY task-by-task (`T-01`, then `T-02`, ...). Never batch.
3. Minimal production logic only to turn the current task's three Red layers Green. Never modify test files.
4. After each task run lint + full tests (unit + API/E2E + regression from `.agents/stack.env`), update `Implementation Status` in the SAME queue file, HALT for user confirmation.
5. Keep changes uncommitted for human inspection.
