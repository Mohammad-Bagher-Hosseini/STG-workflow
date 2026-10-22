# Spec-Test-Gate (STG) Plugin

User-owned spec, test-first gates, task-by-task Red-to-Green implementation, and mutation audit — packaged as a Claude Code plugin.

STG forces a healthy division of labor: **the human designs, the AI questions, tests, and implements exactly what was approved.** The AI never writes the spec, never batches tasks silently, and never moves to the next step without your explicit approval.

## Why STG exists

Most AI-assisted development fails in the same way: the user offloads design to the AI ("you decide"), the AI invents endpoints and logic, tests pass against invented behavior, and nobody notices until production. STG inverts this:

1. **You write the spec** — every touched artifact with complete logic.
2. **AI interrogates it** — numbered questions (`QUESTION [1]:`) and labeled suggestions (`SUGGESTION [2]:`) with one shared counter per phase, never silent redesigns. You reply by number (`accept 1, 3 / reject 2`).
3. **You break it into indivisible tasks** (`T-01`, `T-02`, ...) — AI may propose a model breakdown, you decide.
4. **AI writes failing tests task-by-task, BEFORE any logic** — one task per chat, all three layers (L1 Unit, L2 API, L3 E2E) Red before proceeding, halts for your approval each time. E2E is written per-task, never deferred to the end.
5. **AI implements task-by-task in a fresh session** — strictly from the final spec, turning Red tests Green with full validation. A task missing any Red layer is refused outright (all-Red gate, no bypass).
6. **AI audits with mutations** — proves the tests actually guard the invariants, then confirms a fully Green state.

If you try to push design back onto the AI, it is instructed to push back and force a decision.

## Install

Prerequisites: Claude Code with plugin support.

This repo is a **marketplace**. Add it once, then install the plugin from it:

```bash
/plugin marketplace add <owner>/STG-workflow
/plugin install spec-test-gate@spec-test-gate-marketplace
```

(`<owner>` is the GitHub user/org hosting this repo.)

Verify:

```bash
/plugin list
```

You should see `spec-test-gate@spec-test-gate-marketplace` enabled. Plugin commands are namespaced: `/spec-test-gate:init`, `/spec-test-gate:spec-test-gate`, `/spec-test-gate:step-task`, `/spec-test-gate:implement`, `/spec-test-gate:audit`, `/spec-test-gate:clean`.

Local dev (no marketplace): `claude --plugin-dir ./plugins/spec-test-gate`, or validate with `claude plugin validate ./plugins/spec-test-gate` and `claude plugin validate .` for the marketplace.

## Install on DeepSeek Harness

This repo is also a DeepSeek Harness (dsh) plugin bundle (`dsh-spec-test-gate`). Install it straight from the git URL into any profile:

```bash
dsh plugin --profile web add github:Mohammad-Bagher-Hosseini/STG-workflow
```

Then restart the harness (`dsh web`) so the new bundle is composed. Verify on the Plugins page that `dsh-spec-test-gate` is listed and enabled.

What you get:

- Skill `spec-test-gate` — the full STG workflow bundle (rules, commands, agents, epic queue template). The agent loads it with the skill tool before acting on any STG task.
- Slash commands (same workflow as the Claude commands in parentheses): `/stg` (`spec-test-gate`), `/stg-init` (`init`), `/stg-step T-01 [--epic slug]` (`step-task`), `/stg-implement [slug]` (`implement`), `/stg-audit` (`audit`), `/stg-clean [--epic slug | --all]` (`clean`).

```text
/stg-init typescript nest
/stg
/stg-step T-01 --epic login-api
/stg-implement login-api
/stg-audit
```

Rules, gates, and state layout are identical to the Claude plugin above: you own the spec, L1+L2+L3 must all be Red per task (all-Red gate, no bypass), one task per step with HALT, project state under `.agents/`. The workflow text is read from `plugins/spec-test-gate/` at runtime — a single source of truth for both platforms.

## Command map

| Command | Phase | What happens |
|---|---|---|
| `/spec-test-gate:init <language> [framework]` | Setup | Writes `.agents/stack.env` with test/lint/format/API/mutation commands. See [Stacks](#stacks). |
| `/spec-test-gate:spec-test-gate` | Phase 0 + 1 | Starts the workflow: you write the spec, AI interrogates, you decompose into tasks. |
| `/spec-test-gate:step-task T-01 [--epic slug]` | Phase 2 | Writes L1 Unit + L2 API + L3 E2E failing tests for exactly ONE task (no production logic), then halts for approval. |
| `/spec-test-gate:implement [slug]` | Implement (fresh session) | Implements tasks one by one from the final spec. Tests are frozen. Refuses tasks missing any Red layer. |
| `/spec-test-gate:audit` | Audit | Mutation audit + final Green validation. |
| `/spec-test-gate:clean [--epic slug \| --all]` | Cleanup | Removes `.agents/stack.env` (`--epic` removes one epic, `--all` removes whole `.agents/`). Asks for confirmation. Does not uninstall the plugin. |

## The workflow in detail

### Setup — `/spec-test-gate:init <language> [framework]`

Run once per project. Personas, templates, and rules ship inside the plugin, so nothing is appended to your `AGENTS.md`.

```bash
/spec-test-gate:init go                 # stdlib/Testify
/spec-test-gate:init go gin             # or echo, fiber, chi, pocketbase
/spec-test-gate:init typescript nest    # or node (default), express, fastify, next
/spec-test-gate:init python django      # or standard (default), fastapi, flask, frappe
/spec-test-gate:init python frappe myapp test_site
/spec-test-gate:init custom
```

This writes `.agents/stack.env`, e.g. for Go:

```bash
STACK_NAME="Go"
TEST_CMD="go test ./..."
TEST_CMD_RACE="go test -race ./..."
LINT_CMD="golangci-lint run"
FORMAT_CMD="gofmt -s -w ."
API_TEST_CMD="bru run api-tests/ --env Local"
E2E_TEST_CMD="go test -run ^TestE2E ./..."
```

Re-running `/init` without `--force` shows the current file and halts instead of overwriting.

### Phase 0 — You write the spec, AI interrogates

Run `/spec-test-gate:spec-test-gate`. The AI will **ask you to write the full spec** — it must not draft one for you.

Your spec must list **every touched artifact with complete step-by-step logic**:

- **Backend:** every route to create or change — method, path, inputs, outputs, logic steps.
- **Database:** tables, columns, migrations, constraints.
- **Jobs/workers:** triggers, payloads, retry and idempotency rules.
- **Frontend:** components, routes, state changes.
- **Config:** env vars, feature flags, secrets handling.

Acceptable spec fragment:

> I want to build `POST /api/v1/login` that takes `phone` and `password`; if the phone exists in the database and the password is correct, return a JWT token to the user. Wrong password returns 401 with `INVALID_CREDENTIALS`. Unknown phone returns 404 with `PHONE_NOT_FOUND`. Rate-limit to 5 attempts per minute per phone.

Unacceptable (AI must reject and ask for detail):

> Add login.

Once you provide a spec, the AI interrogates it: ambiguities, missing edge cases, domain invariants. Every question and proposal carries a number from one shared counter per phase — `QUESTION [1]:`, `QUESTION [2]:`, `SUGGESTION [3]:` — so your design and AI input never blur together, and you reply by number: `accept 1, 3 / reject 2 / 4 → use Redis instead`. (Quadrants keep their `Q1`–`Q4` names; bracketed `[N]` numbers are the reply handles.) Then it **HALTS** — nothing proceeds until you finalize the spec.

### Phase 1 — You decompose, AI records (one queue per epic)

You break the finalized spec into an **Indivisible Task Queue** (`T-01`, `T-02`, ...). A task is indivisible if it covers one behavior in one boundary — e.g. "T-01: phone lookup returns 404 for unknown phone" is a task; "build auth" is not.

The AI MAY propose a model breakdown as numbered `SUGGESTION [N]:` items. You decide the final queue and confirm an epic slug (kebab-case, e.g. `login-api`) — the next epic you do gets its own slug and its own file, so queues never collide. Only after your explicit confirmation does the AI write `.agents/<slug>/task_queue.md` in your project (e.g. `.agents/login-api/task_queue.md`), structured like the blank [plugins/spec-test-gate/templates/task_queue.md](plugins/spec-test-gate/templates/task_queue.md) — that `templates/` folder lives inside the plugin and is NEVER copied into your project:

```markdown
## 1. User Spec (with touched artifacts & full logic)
- **Artifacts & Logic:** POST /api/v1/login ...
- **Boundaries:** HTTP API, auth service, users table
- **Interfaces & Signatures:** POST /api/v1/login(phone, password) -> JWT | 401 | 404
- **Invariants:** never reveal whether phone exists via timing; passwords argon2-hashed

## 2. Indivisible Task Queue (user-approved)
A task is test-complete ONLY when Unit, API, AND E2E are all Red. E2E is written per-task — never deferred.
| Task ID | Boundary / Component | Invariant / Assertion | Quadrant | Unit | API | E2E | Impl Status |
| T-01 | API / login | unknown phone -> 404 PHONE_NOT_FOUND | Q4 | Red | Red | Red | pending |
| T-02 | API / login | wrong password -> 401 INVALID_CREDENTIALS | Q4 | pending | pending | pending | pending |
| T-03 | API / login | correct credentials -> JWT | Q1 | pending | pending | pending | pending |
```

Then it **HALTS** for queue confirmation.

### Phase 2 — One Red harness per task, per chat

For each task, in its **own separate chat**, run e.g.:

```bash
/spec-test-gate:step-task T-01 --epic login-api
```

(`--epic` is optional when your project has only one queue — the AI uses the single `.agents/*/task_queue.md`. With several epics, it asks which one.)

The AI (see [plugins/spec-test-gate/agents/test-author.md](plugins/spec-test-gate/agents/test-author.md)) — and it MUST NOT write production logic here, only tests + empty stubs:

1. Explains the behavior quadrant:
   - **Q1 Happy** — the golden path.
   - **Q2 Boundary** — limits, empty/max inputs, pagination edges.
   - **Q3 Invariant** — rules that must always hold (auth gates, state locks).
   - **Q4 Failure/Rollback** — errors, rollbacks, rate limits.
2. Writes the failing tests for THIS task FIRST, in all three layers:
   - **L1 Unit** — pure domain/service logic, no HTTP/DB.
   - **L2 API** — real HTTP (status codes, bodies, error shapes; e.g. PocketBase `ApiScenario`).
   - **L3 E2E** — full user journey incl. DB/state, written per-task, never deferred to the end.
3. Scaffolds ONLY empty stubs so tests compile. A stub that makes a test pass is a violation.
4. Runs all three layers and verifies each is Red on behavior. Marks `Unit Red | API Red | E2E Red` in the queue; any missing/Green-wrong layer is reported and halts.
5. **CRITICAL HALT:** prints `Task T-01 test harness staged (L1 Red, L2 Red, L3 Red). Ready for review.` and stops. It must not touch `T-02`.

You review the harness. Only when you approve `T-01` do you open a fresh chat for `T-02`. Repeat to the end of the queue.

### Phase 3 — Handoff (automatic)

After ALL harnesses are approved, the AI tells you to open a **fresh session** for implementation. This isolation is deliberate: the implementing agent must see only the final spec + Red tests, never the design discussion.

### Implement — Task-by-task Green (fresh session)

In the new session, run:

```bash
/spec-test-gate:implement login-api
```

(The slug is optional with a single queue, required to disambiguate with several.) The AI (see [plugins/spec-test-gate/agents/implementer.md](plugins/spec-test-gate/agents/implementer.md)):

1. Reads the final spec, failing assertions, and `.agents/login-api/task_queue.md`.
2. Picks up **only the next pending task** — never batches.
3. Writes minimal production code to turn that task's Red tests Green. Test files are **frozen** — modifying, deleting, or skipping them is forbidden, as is deviating from the spec without your approval.
4. Runs lint + the **full** suite (unit + API/E2E + regression) so earlier Green tasks stay Green.
5. Updates `Implementation Status` in the same queue file and **HALTS** for your confirmation before the next task.
6. Leaves everything uncommitted for your inspection.

### Audit — Mutation audit + final validation

Run:

```bash
/spec-test-gate:audit
```

The AI (see [plugins/spec-test-gate/agents/auditor.md](plugins/spec-test-gate/agents/auditor.md)):

1. Selects core invariants implemented via `implement` (boundary checks, auth gates, state locks).
2. Injects controlled temporary mutations (inverted conditionals, bypassed validation).
3. Runs unit + API/E2E suites:
   - **FAIL** = invariant genuinely guarded, good.
   - **PASS** = mirage test, flagged for reinforcement.
4. Reverts the mutation to Green.
5. Runs the **full** suite one last time and explicitly reports: every Session 1 Red is now Green, no regressions.

## Universal rules

Enforced across all phases (see [plugins/spec-test-gate/skills/spec-test-gate/SKILL.md](plugins/spec-test-gate/skills/spec-test-gate/SKILL.md)):

1. **Comment policy** — all code comments in English, each on its own line. Never trailing inline comments.
2. **Deterministic TDD** — never assume logic; rely strictly on interfaces and test assertions.
3. **User owns the design** — AI never authors spec content, invents artifacts, or silently fills gaps.
4. **HALT semantics** — a halt means stop completely and wait. No "while waiting, I also..." work.

## Stacks

Syntax: `/spec-test-gate:init <language> [framework] [--force]`. Old single-word forms (`pocketbase`, `frappe myapp`) still resolve to `go pocketbase` / `python frappe myapp`.

| Language | Frameworks | Command example |
|---|---|---|
| `go` | `standard` (default), `gin`, `echo`, `fiber`, `chi`, `pocketbase` | `/spec-test-gate:init go gin` |
| `typescript` | `node` (default), `express`, `fastify`, `nest`, `next` | `/spec-test-gate:init typescript nest` |
| `python` | `standard` (default), `django`, `fastapi`, `flask`, `frappe` | `/spec-test-gate:init python django` |
| `custom` | — (prompts for each command) | `/spec-test-gate:init custom` |

Frameworks that change the toolchain get different commands — e.g. Django uses `python manage.py test` instead of `pytest`, Nest adds `pnpm test:e2e`, PocketBase splits unit/API runs. Frameworks sharing a toolchain (Gin, Echo, FastAPI...) reuse the base commands with a testing note. Unknown names halt with the supported matrix instead of guessing.

## Project layout

```text
.claude-plugin/marketplace.json       # marketplace catalog (repo root)
plugins/spec-test-gate/
  .claude-plugin/plugin.json
  skills/spec-test-gate/SKILL.md      # Phases 0-3, the workflow heart
  commands/
    init.md                           # :init — stack setup
    spec-test-gate.md                 # :spec-test-gate — Phases 0+1
    step-task.md                      # :step-task — Phase 2, one task
    implement.md                      # :implement — task-by-task Green
    audit.md                          # :audit — mutation audit + validation
    clean.md                          # :clean — remove project state
  agents/
    test-author.md                    # Session 1 persona
    implementer.md                    # Session 2 persona
    auditor.md                        # Session 3 persona
  templates/task_queue.md             # BLANK template (stays in plugin!)
```

In YOUR project the plugin only ever creates state under `.agents/` — no `templates/` dir, no scattered files:

```text
your-project/
  .agents/
    stack.env                     # from :init
    login-api/task_queue.md       # epic 1 spec + queue (from :spec-test-gate)
    billing/task_queue.md         # epic 2 gets its own slug + file
```

## FAQ

**The AI started designing the spec for me. What do I do?**
Tell it to stop and ask questions instead. The skill, commands, and agents all forbid AI-authored specs — if it happens, it is a bug: point it at `plugins/spec-test-gate/skills/spec-test-gate/SKILL.md` rule 3.

**Can I batch tasks to go faster?**
No — batching is the failure mode STG exists to prevent. One task, one chat, one approval.

**Why a fresh session for implement?**
So implementation is driven only by the approved spec + Red tests, not by design-discussion context that invites improvisation.

**Why three test layers (L1/L2/L3)?**
Because single-layer tests lie: API-only tests miss state corruption, unit-only tests miss contract breaks. A task is Green only when Unit, API, and E2E all agree — and all three are written per-task in Phase 2, before any production logic exists.

**The AI wrote implementation code during step-task. Is that right?**
No — that's forbidden since 1.8.0. `step-task` may only write failing tests + empty stubs. If it happened, tell it to delete the logic, re-verify Red, and continue. If `implement` is asked to build a task whose layers aren't all Red, it must refuse and send you back to `step-task`.

**The AI created a `templates/` folder in my project. Is that right?**
No — that's a bug in versions before 1.6.0. The plugin must only write under `.agents/`. Delete the stray `templates/` dir, then update to ≥1.6.0:
`/plugin marketplace update spec-test-gate-marketplace`

**I have two features in one project. Do they share one queue?**
No — each gets its own epic slug and file: `.agents/login-api/task_queue.md`, `.agents/billing/task_queue.md`. Pass `--epic <slug>` (or the slug to `implement`) whenever there's more than one.

## Uninstall

Remove project state first (optional, asks for confirmation):

```bash
/spec-test-gate:clean --all
```

Then uninstall the plugin itself:

```bash
/plugin uninstall spec-test-gate
```

Your `AGENTS.md` is never modified by the plugin, so there is nothing to clean there.
