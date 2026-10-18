---
name: spec-test-gate
description: User-owned spec workflow with test-first gates. Use when the user wants spec-test-gate, TDD with approval gates, task-by-task Red-to-Green, or mutation audit. Enforces user-authored specs, single-task test loops, and fresh-session implementation.
---

# Spec-Test-Gate (STG)

Opt-in, test-first, approval-gated workflow. The **user owns the design** — the AI never authors the spec.

## Universal Rules

1. **Comment Policy:** All code comments MUST be in English, each on its own line. Never trailing inline comments.
2. **Deterministic TDD:** Never assume logic. Rely strictly on interfaces and test assertions.
3. **User Owns the Design:** The AI MUST NEVER write the spec for the user. The user writes the spec including all touched artifacts and full logic. The AI only asks numbered questions (`QUESTION [N]:`) and offers numbered, labeled suggestions (`SUGGESTION [N]:`) so the user can reply by number. If the user offloads design ("you decide"), push back and force a decision.
4. **Project state lives under `.agents/`:** Stack config is `.agents/stack.env`; each epic's spec + queue is `.agents/<slug>/task_queue.md` in the CURRENT project. NEVER create a `templates/` directory in the project — `templates/` lives inside the plugin; the project only gets `.agents/`.
5. **Session Isolation:**
   - Session 1 (this skill + `test-author` agent): spec review + test authoring. ZERO production logic — stubs only (see Phase 2).
   - Session 2 (`/spec-test-gate:implement` + `implementer` agent, fresh session): task-by-task implementation. Tests frozen.
   - Session 3 (`/spec-test-gate:audit` + `auditor` agent): mutation audit + final Green validation.
6. **All-Red gate (no bypass):** A task is test-complete ONLY when its Unit, API, AND E2E harnesses all exist and all fail on behavior (Red). E2E is written per-task in Phase 2 — deferring it to the end is forbidden. `/spec-test-gate:implement` MUST refuse any task missing a Red layer and send the user back to `/spec-test-gate:step-task`.

Toolchain commands come from plugin config or the project's test setup. Never hardcode a stack.

## Phase 0 — User-Authored Spec + Interrogation

1. Do NOT write the spec. Ask the USER to write the full spec.
2. Demand every touched artifact with complete logic:
   - Backend: every route to create/change — method, path, inputs, outputs, step-by-step logic.
   - Acceptable fragment: `I want to build POST /api/v1/login that takes phone and password; if the phone exists in the database and the password is correct, return a JWT token to the user.`
   - Same rule for DB tables/migrations, background jobs, frontend components/routes, config changes.
3. Interrogate the provided spec for ambiguities, missing edge cases, domain invariants.
4. Number every question and suggestion with ONE shared counter per phase: `QUESTION [1]:`, `QUESTION [2]:`, `SUGGESTION [3]:`, ... Never reuse a number within the same phase; follow-up rounds continue the counter. (Quadrants keep their own `Q1`–`Q4` names — bracketed `[N]` numbers are the reply handles, so there is no clash.)
5. NEVER send an interrogation round with unnumbered items. Every round looks like this:
   ```text
   QUESTION [1]: What should the rate limit for login be?
   QUESTION [2]: Unknown phone — 404 or 401?
   SUGGESTION [3]: 5 attempts/minute per phone with lockout.
   Reply by number, e.g. `accept 1, 3 / reject 2 / 4 → use Redis instead of in-memory`.
   ```
6. **HALT.** Wait for the user to finalize the spec.

## Phase 1 — User-Led Decomposition (per-epic queue)

1. Ask the USER to break the finalized spec into an Indivisible Task Queue (`T-01`, `T-02`, ...).
2. You MAY propose a model breakdown as numbered `SUGGESTION [N]:` items (continuing the phase counter) — the user decides.
3. Derive an epic slug from the spec (kebab-case, e.g. `login-api`) and confirm it with the user — they may rename it. The slug scopes this epic's state so later epics get their own files.
4. Only after explicit confirmation, write the queue to `.agents/<slug>/task_queue.md` in the CURRENT project (e.g. `.agents/login-api/task_queue.md`), using the blank template from the plugin's own `templates/task_queue.md` as the structure. Rule 4 applies: never a project-level `templates/` dir.
5. **HALT** for queue confirmation.

## Phase 2 — Single-Task Test Loop (one task per chat, tests BEFORE any logic)

For ONLY the next pending `T-[N]` (via `/spec-test-gate:step-task T-[N] [--epic <slug>]`):

0. Resolve the queue file first: if `--epic` is given, use `.agents/<slug>/task_queue.md`; if omitted and exactly one `.agents/*/task_queue.md` exists, use it; if several exist, HALT and ask the user which epic. Read the task row from that file — never invent task content.
1. Explain its behavior quadrant (Q1 Happy, Q2 Boundary, Q3 Invariant, Q4 Failure/Rollback).
2. Write the failing tests for THIS task FIRST, in all three layers, before any production logic:
   - **L1 Unit** — pure domain/service logic (no HTTP, no DB): runners from `TEST_CMD` / `TEST_UNIT_CMD` in `.agents/stack.env`.
   - **L2 API** — real HTTP against the app (status codes, bodies, error shapes): `API_TEST_CMD` in `stack.env` (Bruno suites, or framework-native scenarios such as PocketBase `ApiScenario`).
   - **L3 E2E** — full user journey across boundaries (seed → act → assert visible outcome incl. DB/state): `E2E_TEST_CMD` in `stack.env`, or the framework's E2E runner (Nest `test:e2e`, Django live-server tests, Playwright/Cypress where configured). If `E2E_TEST_CMD` is missing, HALT and ask the user how E2E runs in this project — DO NOT skip it silently.
3. Scaffold ONLY the minimal compilable stubs the tests need (empty handlers, empty structs, `TODO` bodies). A stub MUST NOT contain real logic: if a test passes because of stub content, delete the logic and re-verify Red.
4. Run all three layers and verify each fails on BEHAVIOR (assertion mismatch), not on missing scaffolding or bad config:
   - L1 Red + L2 Red + L3 Red → task is test-complete: mark `Unit Red | API Red | E2E Red` in the queue file.
   - ANY layer still missing or Green-for-the-wrong-reason → task is NOT test-complete: say exactly which layer and why, then HALT without proceeding.
   - Writing ANY production logic before all three layers are Red is forbidden — that work belongs to Session 2.
5. **CRITICAL HALT:** output `Task T-[N] test harness staged (L1 Red, L2 Red, L3 Red). Ready for review.` Do NOT touch `T-[N+1]` until the user approves `T-[N]` and opens the next task in a fresh chat.

## Phase 3 — Handoff

After ALL harnesses are approved, tell the user to open a FRESH session and run `/spec-test-gate:implement [<slug>]` for task-by-task implementation (it resolves the same epic queue), then `/spec-test-gate:audit` for audit.
