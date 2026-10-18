---
description: Write the L1 Unit + L2 API + L3 E2E failing tests for exactly one task T-[N], then halt for approval. No production logic.
argument-hint: <T-01> [--epic slug]
---

Write the test harness for ONLY task `$ARGUMENTS` following `skills/spec-test-gate/SKILL.md` Phase 2.

Scope guard: run this inside a TARGET project repo, never inside the spec-test-gate marketplace repo itself. All state lives under the project's `.agents/` — never create a `templates/` directory in the project.

HARD RULE — tests before logic: this command MUST NOT write production/business logic. Only failing tests plus minimal empty stubs (empty handlers/structs, `TODO` bodies). If a test passes because of stub content, delete the logic and re-verify Red.

## Syntax

```text
/spec-test-gate:step-task T-[N] [--epic <slug>]
```

- `T-[N]` is required (e.g. `T-01`). Parse it as the first token of `$ARGUMENTS`.
- `--epic <slug>` is optional. If omitted and exactly one `.agents/*/task_queue.md` exists, use it; if several exist, HALT and ask the user which epic before touching anything.

## Steps

1. Resolve `.agents/<slug>/task_queue.md` per the syntax above and read the `T-[N]` row from it — never invent task content.
2. Explain its quadrant (Q1 Happy, Q2 Boundary, Q3 Invariant, Q4 Failure/Rollback).
3. Write the failing tests for THIS task FIRST, in all three layers, before any production logic:
   - **L1 Unit** — pure domain/service logic (no HTTP, no DB): `TEST_CMD` / `TEST_UNIT_CMD` from `.agents/stack.env`.
   - **L2 API** — real HTTP against the app (status codes, bodies, error shapes): `API_TEST_CMD` from `stack.env` (Bruno suites, or framework-native scenarios such as PocketBase `ApiScenario`).
   - **L3 E2E** — full user journey across boundaries (seed → act → assert visible outcome incl. DB/state): `E2E_TEST_CMD` from `stack.env`, or the framework's E2E runner. If `E2E_TEST_CMD` is missing, HALT and ask the user how E2E runs in this project — DO NOT skip it silently, and DO NOT defer E2E to the end.
4. Scaffold ONLY the minimal compilable stubs the tests need. Stubs MUST stay empty.
5. Run all three layers; each must fail on BEHAVIOR (assertion mismatch), not on scaffolding or config:
   - L1 Red + L2 Red + L3 Red → mark `Unit Red | API Red | E2E Red` in the same queue file.
   - ANY layer missing or Green-for-the-wrong-reason → say exactly which layer and why, then HALT without proceeding.
6. CRITICAL HALT: output `Task T-[N] test harness staged (L1 Red, L2 Red, L3 Red). Ready for review.` Do NOT touch the next task until the user approves this one and opens a fresh chat.
