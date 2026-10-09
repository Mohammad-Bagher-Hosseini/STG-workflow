---
name: spec-test-gate
description: User-owned spec workflow with test-first gates. Use when the user wants spec-test-gate, TDD with approval gates, task-by-task Red-to-Green, or mutation audit. Enforces user-authored specs, single-task test loops, and fresh-session implementation.
---

# Spec-Test-Gate (STG)

Opt-in, test-first, approval-gated workflow. The **user owns the design** — the AI never authors the spec.

## Universal Rules

1. **Comment Policy:** All code comments MUST be in English, each on its own line. Never trailing inline comments.
2. **Deterministic TDD:** Never assume logic. Rely strictly on interfaces and test assertions.
3. **User Owns the Design:** The AI MUST NEVER write the spec for the user. The user writes the spec including all touched artifacts and full logic. The AI only asks questions (`QUESTION:`) and offers labeled suggestions (`SUGGESTION:`). If the user offloads design ("you decide"), push back and force a decision.
4. **Session Isolation:**
   - Session 1 (this skill + `test-author` agent): spec review + test authoring. No business logic.
   - Session 2 (`/phase-4` + `implementer` agent, fresh session): task-by-task implementation. Tests frozen.
   - Session 3 (`/phase-5` + `auditor` agent): mutation audit + final Green validation.

Toolchain commands come from plugin config or the project's test setup. Never hardcode a stack.

## Phase 0 — User-Authored Spec + Interrogation

1. Do NOT write the spec. Ask the USER to write the full spec.
2. Demand every touched artifact with complete logic:
   - Backend: every route to create/change — method, path, inputs, outputs, step-by-step logic.
   - Acceptable fragment: `I want to build POST /api/v1/login that takes phone and password; if the phone exists in the database and the password is correct, return a JWT token to the user.`
   - Same rule for DB tables/migrations, background jobs, frontend components/routes, config changes.
3. Interrogate the provided spec for ambiguities, missing edge cases, domain invariants.
4. Prefix every question with `QUESTION:`, every proposal with `SUGGESTION:`.
5. **HALT.** Wait for the user to finalize the spec.

## Phase 1 — User-Led Decomposition

1. Ask the USER to break the finalized spec into an Indivisible Task Queue (`T-01`, `T-02`, ...).
2. You MAY propose a model breakdown labeled `SUGGESTION:` — the user decides.
3. Only after explicit confirmation, write `templates/task_queue.md` with the user-approved queue.
4. **HALT** for queue confirmation.

## Phase 2 — Single-Task Test Loop (one task per chat)

For ONLY the next pending `T-[N]` (via `/step-task`):

1. Explain its behavior quadrant (Q1 Happy, Q2 Boundary, Q3 Invariant, Q4 Failure/Rollback).
2. Scaffold the minimal interface/struct so tests compile.
3. Write the failing test with Triple-Point Assertions — Layer 1 Transport/API, Layer 2 Contract/Domain, Layer 3 Database/State.
4. Run tests, verify pure Red (fails on behavior, not on scaffolding).
5. **CRITICAL HALT:** output `Task T-[N] test harness staged. Ready for review.` Do NOT touch `T-[N+1]` until the user approves `T-[N]` and opens the next task in a fresh chat.

## Phase 3 — Handoff

After ALL harnesses are approved, tell the user to open a FRESH session and run `/phase-4` for task-by-task implementation, then `/phase-5` for audit.
