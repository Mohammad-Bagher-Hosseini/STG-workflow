# Spec-Test-Gate (STG) Plugin

User-owned spec, test-first gates, task-by-task Red-to-Green implementation, and mutation audit — packaged as a Claude Code plugin.

STG forces a healthy division of labor: **the human designs, the AI questions, tests, and implements exactly what was approved.** The AI never writes the spec, never batches tasks silently, and never moves to the next step without your explicit approval.

## Why STG exists

Most AI-assisted development fails in the same way: the user offloads design to the AI ("you decide"), the AI invents endpoints and logic, tests pass against invented behavior, and nobody notices until production. STG inverts this:

1. **You write the spec** — every touched artifact with complete logic.
2. **AI interrogates it** — questions (`QUESTION:`) and labeled suggestions (`SUGGESTION:`), never silent redesigns.
3. **You break it into indivisible tasks** (`T-01`, `T-02`, ...) — AI may propose a model breakdown, you decide.
4. **AI writes failing tests task-by-task** — one task per chat, three assertion layers, halts for your approval each time.
5. **AI implements task-by-task in a fresh session** — strictly from the final spec, turning Red tests Green with full validation.
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

## Command map

| Command | Phase | What happens |
|---|---|---|
| `/spec-test-gate:init <language> [framework]` | Setup | Writes `.agents/stack.env` with test/lint/format/API/mutation commands. See [Stacks](#stacks). |
| `/spec-test-gate:spec-test-gate` | Phase 0 + 1 | Starts the workflow: you write the spec, AI interrogates, you decompose into tasks. |
| `/spec-test-gate:step-task T-01` | Phase 2 | Authors the failing test harness for exactly ONE task, then halts for approval. |
| `/spec-test-gate:implement` | Implement (fresh session) | Implements tasks one by one from the final spec. Tests are frozen. |
| `/spec-test-gate:audit` | Audit | Mutation audit + final Green validation. |
| `/spec-test-gate:clean [--all]` | Cleanup | Removes `.agents/stack.env` (`--all` removes whole `.agents/`). Asks for confirmation. Does not uninstall the plugin. |

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

Once you provide a spec, the AI interrogates it: ambiguities, missing edge cases, domain invariants. Every question is prefixed `QUESTION:`, every proposal `SUGGESTION:` so your design and AI input never blur together. Then it **HALTS** — nothing proceeds until you finalize the spec.

### Phase 1 — You decompose, AI records

You break the finalized spec into an **Indivisible Task Queue** (`T-01`, `T-02`, ...). A task is indivisible if it covers one behavior in one boundary — e.g. "T-01: phone lookup returns 404 for unknown phone" is a task; "build auth" is not.

The AI MAY propose a model breakdown, always labeled `SUGGESTION:`. You decide the final queue. Only after your explicit confirmation does the AI write [plugins/spec-test-gate/templates/task_queue.md](plugins/spec-test-gate/templates/task_queue.md):

```markdown
## 1. User Spec (with touched artifacts & full logic)
- **Artifacts & Logic:** POST /api/v1/login ...
- **Boundaries:** HTTP API, auth service, users table
- **Interfaces & Signatures:** POST /api/v1/login(phone, password) -> JWT | 401 | 404
- **Invariants:** never reveal whether phone exists via timing; passwords argon2-hashed

## 2. Indivisible Task Queue (user-approved)
| Task ID | Boundary / Component | Invariant / Assertion | Quadrant | Test Status | Impl Status |
| T-01 | API / login | unknown phone -> 404 PHONE_NOT_FOUND | Q4 | Red | pending |
| T-02 | API / login | wrong password -> 401 INVALID_CREDENTIALS | Q4 | pending | pending |
| T-03 | API / login | correct credentials -> JWT | Q1 | pending | pending |
```

Then it **HALTS** for queue confirmation.

### Phase 2 — One Red harness per task, per chat

For each task, in its **own separate chat**, run e.g.:

```bash
/spec-test-gate:step-task T-01
```

The AI (see [plugins/spec-test-gate/agents/test-author.md](plugins/spec-test-gate/agents/test-author.md)):

1. Explains the behavior quadrant:
   - **Q1 Happy** — the golden path.
   - **Q2 Boundary** — limits, empty/max inputs, pagination edges.
   - **Q3 Invariant** — rules that must always hold (auth gates, state locks).
   - **Q4 Failure/Rollback** — errors, rollbacks, rate limits.
2. Scaffolds the minimal interface/struct so tests compile (no logic).
3. Writes the failing test with **Triple-Point Assertions**:
   - **Layer 1 Transport/API** — status codes, headers, error shapes over HTTP.
   - **Layer 2 Contract/Domain** — return values, service contracts, validation rules.
   - **Layer 3 Database/State** — rows written, state transitions, side effects.
4. Runs the suite and verifies a **pure Red** — failing on behavior, not on missing scaffolding.
5. **CRITICAL HALT:** prints `Task T-01 test harness staged. Ready for review.` and stops. It must not touch `T-02`.

You review the harness. Only when you approve `T-01` do you open a fresh chat for `T-02`. Repeat to the end of the queue.

### Phase 3 — Handoff (automatic)

After ALL harnesses are approved, the AI tells you to open a **fresh session** for implementation. This isolation is deliberate: the implementing agent must see only the final spec + Red tests, never the design discussion.

### Implement — Task-by-task Green (fresh session)

In the new session, run:

```bash
/spec-test-gate:implement
```

The AI (see [plugins/spec-test-gate/agents/implementer.md](plugins/spec-test-gate/agents/implementer.md)):

1. Reads the final spec, failing assertions, and `task_queue.md`.
2. Picks up **only the next pending task** — never batches.
3. Writes minimal production code to turn that task's Red tests Green. Test files are **frozen** — modifying, deleting, or skipping them is forbidden, as is deviating from the spec without your approval.
4. Runs lint + the **full** suite (unit + API/E2E + regression) so earlier Green tasks stay Green.
5. Updates `Implementation Status` in `task_queue.md` and **HALTS** for your confirmation before the next task.
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
  templates/task_queue.md             # Spec + queue record
```

## FAQ

**The AI started designing the spec for me. What do I do?**
Tell it to stop and ask questions instead. The skill, commands, and agents all forbid AI-authored specs — if it happens, it is a bug: point it at `plugins/spec-test-gate/skills/spec-test-gate/SKILL.md` rule 3.

**Can I batch tasks to go faster?**
No — batching is the failure mode STG exists to prevent. One task, one chat, one approval.

**Why a fresh session for implement?**
So implementation is driven only by the approved spec + Red tests, not by design-discussion context that invites improvisation.

**Why three test layers?**
Because single-layer tests lie: API-only tests miss state corruption, DB-only tests miss contract breaks. A task is Green only when Transport, Contract, and State all agree.

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
