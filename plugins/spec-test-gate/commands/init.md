---
description: Initialize Spec-Test-Gate toolchain config (.agents/stack.env). Usage /spec-test-gate:init <language> [framework] [--force].
argument-hint: [go|typescript|python|custom] [framework] [--force]
---

Initialize the STG toolchain by writing `.agents/stack.env` in the CURRENT project directory.

Scope guard: run this inside a TARGET project repo, never inside the spec-test-gate marketplace repo itself. The ONLY file this command creates is `<project-root>/.agents/stack.env`. Do NOT copy plugin files (skills, commands, agents, templates) into the project — they load from the installed plugin. Never touch `AGENTS.md`.

## Syntax

```text
/spec-test-gate:init <language> [framework] [extra...] [--force]
```

`<language>` is required: `go`, `typescript`, or `python`. `[framework]` is optional and defaults to `standard`. `custom` is used standalone (no language). `--force` overwrites an existing `.agents/stack.env`.

## Resolution

1. If `.agents/stack.env` exists and `--force` is absent: show the current file and HALT — ask the user to re-run with `--force`.
2. Resolve language + framework (case-insensitive). Legacy single-word aliases still work:
   - `pocketbase` → `go pocketbase`
   - `frappe ...` → `python frappe ...`
   - `go`, `typescript`, `python` alone → `standard` framework
   - `custom` → interactive prompts (see below)
3. Unknown language or framework: list the supported matrix and HALT — ask the user to pick. Do not guess.
4. Write `.agents/stack.env` per the table, confirm by showing the file content.

## Matrix

### go

Base for all Go frameworks: `TEST_CMD="go test ./..."`, `TEST_CMD_RACE="go test -race ./..."`, `LINT_CMD="golangci-lint run"`, `FORMAT_CMD="gofmt -s -w ."`, `API_TEST_CMD="bru run api-tests/ --env Local"`. Set `FRAMEWORK="<name>"`. Framework notes:

- `standard` (default): plain stdlib/Testify.
- `gin` | `echo` | `fiber` | `chi`: same commands; note in the confirmation that handler tests should use the framework's `httptest` helpers.
- `pocketbase`: takes optional `[test_dir] [bruno_dir]` (defaults `./...`, `tests/bruno`). `TEST_CMD="go test <test_dir>"`, plus `TEST_UNIT_CMD="go test -run ^TestUnit ./..."`, `TEST_INTEGRATION_CMD="go test -run ^TestApi ./..."`, `MUTATION_TOOL="go-mutesting"`, `MUTATION_CMD="go-mutesting ./..."`, `API_TEST_CMD="bru run <bruno_dir> --env Local"`.

### typescript

Base: `TEST_CMD="pnpm test"`, `TEST_CMD_RACE="pnpm test --run"`, `LINT_CMD="pnpm lint"`, `FORMAT_CMD="pnpm format"`, `API_TEST_CMD="bru run api-tests/ --env Local"`. Set `FRAMEWORK="<name>"`. Framework notes:

- `node` (default): plain Vitest/Prisma.
- `express` | `fastify`: same commands; handler tests via `supertest`.
- `nest`: `TEST_CMD="pnpm test"`, add `TEST_E2E_CMD="pnpm test:e2e"` and note that e2e specs live under `test/`.
- `next`: `TEST_CMD="pnpm test"`, note App Router route handlers test via `next-test-api-route-handler` or plain `Request` mocks.

### python

Base: `TEST_CMD="pytest"`, `TEST_CMD_RACE="pytest -n auto"`, `LINT_CMD="ruff check ."`, `FORMAT_CMD="ruff format ."`, `API_TEST_CMD="bru run api-tests/ --env Local"`. Set `FRAMEWORK="<name>"`. Framework notes:

- `standard` (default): plain pytest/alembic.
- `django`: `TEST_CMD="python manage.py test"`, `TEST_CMD_RACE="python manage.py test --parallel"`, add `MIGRATION_CMD="python manage.py migrate"`, keep ruff for lint/format.
- `fastapi`: same as base; note endpoint tests via `httpx.AsyncClient` + `ASGITransport`.
- `flask`: same as base; note endpoint tests via the Flask test client.
- `frappe`: takes `<app> [site]` (ask if app missing; site defaults to `test_site`). `TEST_CMD="bench --site <site> run-tests --app<app>"`, `TEST_CMD_RACE="bench --site <site> run-tests --app<app> --force"`, `LINT_CMD="ruff check apps/<app>"`, `FORMAT_CMD="ruff format apps/<app>"`, `MIGRATION_CMD="bench --site <site> migrate"`, `MUTATION_TOOL="mutmut"`, `MUTATION_CMD="mutmut run --paths-to-mutate apps/<app>"`.

### custom

Standalone (`/spec-test-gate:init custom`): prompt for stack name, test/race/lint/format/api/mutation commands one by one, then write the file. Set `STACK_NAME` to the given name and `FRAMEWORK="custom"`.
