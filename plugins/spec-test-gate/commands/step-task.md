---
description: Author the failing test harness for exactly one task T-[N], then halt for approval.
argument-hint: <T-01> [--epic slug]
---

Author the test harness for ONLY task `$ARGUMENTS` following `skills/spec-test-gate/SKILL.md` Phase 2.

Scope guard: run this inside a TARGET project repo, never inside the spec-test-gate marketplace repo itself. All state lives under the project's `.agents/` — never create a `templates/` directory in the project.

## Syntax

```text
/spec-test-gate:step-task T-[N] [--epic <slug>]
```

- `T-[N]` is required (e.g. `T-01`). Parse it as the first token of `$ARGUMENTS`.
- `--epic <slug>` is optional. If omitted and exactly one `.agents/*/task_queue.md` exists, use it; if several exist, HALT and ask the user which epic before touching anything.

## Steps

1. Resolve `.agents/<slug>/task_queue.md` per the syntax above and read the `T-[N]` row from it — never invent task content.
2. Explain its quadrant (Q1 Happy, Q2 Boundary, Q3 Invariant, Q4 Failure/Rollback).
3. Scaffold the minimal interface/struct so tests compile.
4. Write the failing test with Triple-Point Assertions (Transport/API, Contract/Domain, Database/State).
5. Run tests, verify pure Red.
6. Update that task's `Test Status` to `Red` in the same queue file.
7. CRITICAL HALT: output `Task $ARGUMENTS test harness staged. Ready for review.` Do NOT touch the next task until the user approves this one and opens a fresh chat.
