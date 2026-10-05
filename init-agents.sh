#!/usr/bin/env bash
set -euo pipefail

# Ensure essential target directories exist
mkdir -p .agents/personas .agents/templates

# Define optional Spec-Test-Gate snippet to append or initialize
SPEC_GATE_SNIPPET='
# --- SPEC-TEST-GATE ENGINE (OPT-IN WORKFLOW) ---
## Optional Workflow: Spec-Test-Gate (STG)

Opt-in only. When triggered by the user (e.g., `run with "spec-test-gate"`), strictly enforce this test-first, approval-gated protocol.
All configurations, test runners, and commands are dynamically loaded from `.agents/stack.env`.

### Universal Rules
1. **Comment Policy:** All code comments MUST be written in English. Every comment MUST be placed on its own line (above or below the code line). Never place inline comments at the end of code lines.
2. **Deterministic TDD:** Never assume logic. Rely strictly on interfaces and test assertions.
3. **Three-Session Agent Isolation:**
   - **Session 1 (Spec & Test Authoring):** Follow `.agents/personas/01_test_author.md`. Business logic is strictly prohibited.
   - **Session 2 (Implementation):** Follow `.agents/personas/02_implementer.md`. Test files are frozen.
   - **Session 3 (Audit & Mutation):** Follow `.agents/personas/03_auditor.md`. Validate tests against intentional mutations.

### Command Triggers
- `run with "spec-test-gate"`: Initiates Phase 0 & 1 via Session 1 persona.
- `step task T-[N]`: Authors test harness for only one indivisible task in Phase 2, then HALTS.
- `run phase 4`: Switches to Session 2 persona for minimal implementation.
- `run phase 5`: Switches to Session 3 persona for mutation auditing.
# --- END SPEC-TEST-GATE ENGINE ---'

# Locate any pre-existing agent definition files
TARGET_AGENT_FILE=""
for f in AGENTS.md agents.md AGENT.md; do
  if [ -f "$f" ]; then
    TARGET_AGENT_FILE="$f"
    break
  fi
done

# Intelligently append or create the master AGENTS.md file
if [ -n "$TARGET_AGENT_FILE" ]; then
  # Check if Spec-Test-Gate workflow is already registered
  if grep -q "SPEC-TEST-GATE ENGINE" "$TARGET_AGENT_FILE"; then
    echo "==> [INFO] Spec-Test-Gate workflow is already registered in $TARGET_AGENT_FILE. Skipping append."
  else
    echo "==> [INFO] Existing $TARGET_AGENT_FILE found. Appending Spec-Test-Gate block..."
    printf "\n%s\n" "$SPEC_GATE_SNIPPET" >> "$TARGET_AGENT_FILE"
    echo "==> [SUCCESS] Workflow appended to $TARGET_AGENT_FILE."
  fi
else
  echo "==> [INFO] No existing agents.md found. Creating new AGENTS.md..."
  printf "%s\n" \
    '# Agent Directives: Spec-Test-Gate Engine' \
    '' \
    'This repository strictly enforces the **Spec-Test-Gate (STG)** workflow.' \
    'All agents must read `.agents/stack.env` to identify project-specific toolchains and commands.' > AGENTS.md
  printf "\n%s\n" "$SPEC_GATE_SNIPPET" >> AGENTS.md
  echo "==> [SUCCESS] Created AGENTS.md."
fi

# Author Persona 1: Test Author (Session 1)
cat << 'EOF' > .agents/personas/01_test_author.md
# Persona: Test Author (Session 1)
Role: Senior Architect & TDD Lead.
Allowed Actions: Define contracts/interfaces, types, and failing tests.
Forbidden Actions: Writing business or domain logic in implementation files.

### Workflow
1. **Phase 0 (Interrogation):** Review inputs for ambiguities, missing edge cases, and domain invariants. HALT and wait for user response.
2. **Phase 1 (Decomposition):** 
   - Define data contracts, migration impacts, and API signatures.
   - Break requirements into an Indivisible Task Queue (`T-01`, `T-02`, ...).
   - Write/update `.agents/templates/task_queue.md`.
   - **HALT** for queue confirmation.
3. **Phase 2 (Single-Task Test Loop):**
   - Take ONLY the next pending task `T-[N]`.
   - Explain its behavior quadrant (Q1: Happy, Q2: Boundary, Q3: Invariant, Q4: Failure/Rollback).
   - Scaffold the minimal interface or struct so tests compile.
   - Write the failing test applying Triple-Point Assertions (Transport, Contract, Database/State).
   - Execute the test command from `.agents/stack.env` and verify it fails purely on behavior (Red State).
   - **CRITICAL HALT:** Stop completely. Output: `Task T-[N] test harness staged. Ready for review.` Do NOT touch `T-[N+1]`.
EOF

# Author Persona 2: Implementer (Session 2)
cat << 'EOF' > .agents/personas/02_implementer.md
# Persona: Implementer (Session 2)
Role: Clean Code Craftsman.
Allowed Actions: Implement minimal production code to satisfy failing tests.
Forbidden Actions: Modifying, deleting, or skipping any test files (*_test.*, spec files).

### Workflow
1. Read the failing test assertions and interfaces authored in Session 1.
2. Write only the minimal production logic to turn failing tests Green.
3. Run linting and test commands from `.agents/stack.env`.
4. Update `Implementation Status` in `.agents/templates/task_queue.md`.
5. Keep all modifications uncommitted in the working tree for human inspection.
EOF

# Author Persona 3: Mutation Auditor (Session 3)
cat << 'EOF' > .agents/personas/03_auditor.md
# Persona: Auditor (Session 3)
Role: Adversarial Quality Auditor.
Allowed Actions: Introduce temporary faults in production code, run test suites, restore code.
Forbidden Actions: Modifying test files to match broken code.

### Workflow
1. Select core domain invariants implemented in Phase 4 (e.g. boundary checks, auth gates, state locks).
2. Inject controlled intentional mutations (e.g., invert conditionals, bypass validation).
3. Execute `TEST_CMD` and `API_TEST_CMD` from `.agents/stack.env`:
   - Tests FAIL: Invariant verified as business-bound.
   - Tests PASS: Mirage test detected! Flag test suite immediately for reinforcement.
4. Cleanly revert code to the original Green state (`git checkout`).
EOF

# Initialize task queue template
cat << 'EOF' > .agents/templates/task_queue.md
# Epic Specification & Task Queue

## 1. Contracts & Boundaries
- **Boundaries:** 
- **Interfaces & Signatures:** 
- **Invariants:** 

## 2. Indivisible Task Queue

| Task ID | Boundary / Component | Invariant / Assertion | Quadrant | Test Status | Impl Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
EOF

# Handle project stack configuration
CONFIGURE_STACK=true
if [ -f .agents/stack.env ]; then
  read -rp "==> [WARN] .agents/stack.env already exists. Do you want to reconfigure/overwrite it? (y/N): " reconf
  case "$reconf" in
    [yY][eE][sS]|[yY])
      CONFIGURE_STACK=true
      ;;
    *)
      echo "==> Keeping existing .agents/stack.env."
      CONFIGURE_STACK=false
      ;;
  esac
fi

if [ "$CONFIGURE_STACK" = true ]; then
  echo "--------------------------------------------"
  echo "Select Project Stack:"
  echo "1) Go (Standard Library / Testify / Bruno / Goose)"
  echo "2) TypeScript / Node (Vitest / Prisma / Bruno)"
  echo "3) Python (Pytest / Alembic)"
  echo "4) Frappe / ERPNext (Bench / FrappeTestCase / Ruff)"
  echo "5) PocketBase + Go (NewTestApp / ApiScenario / Bruno)"
  echo "6) Custom / Manual"
  echo "--------------------------------------------"
  read -rp "Enter choice [1-6]: " choice

  case "$choice" in
    1)
      # Configuration for standard Go microservices and backends
      printf "%s\n" \
        'STACK_NAME="Go"' \
        'TEST_CMD="go test ./..."' \
        'TEST_CMD_RACE="go test -race ./..."' \
        'LINT_CMD="golangci-lint run"' \
        'FORMAT_CMD="gofmt -s -w ."' \
        'API_TEST_CMD="bru run api-tests/ --env Local"' > .agents/stack.env
      ;;
    2)
      # Configuration for TypeScript and Node ecosystems
      printf "%s\n" \
        'STACK_NAME="TypeScript"' \
        'TEST_CMD="pnpm test"' \
        'TEST_CMD_RACE="pnpm test --run"' \
        'LINT_CMD="pnpm lint"' \
        'FORMAT_CMD="pnpm format"' \
        'API_TEST_CMD="bru run api-tests/ --env Local"' > .agents/stack.env
      ;;
    3)
      # Configuration for Python backend applications
      printf "%s\n" \
        'STACK_NAME="Python"' \
        'TEST_CMD="pytest"' \
        'TEST_CMD_RACE="pytest -n auto"' \
        'LINT_CMD="ruff check ."' \
        'FORMAT_CMD="ruff format ."' \
        'API_TEST_CMD="bru run api-tests/ --env Local"' > .agents/stack.env
      ;;
    4)
      # Configuration for Frappe and ERPNext frameworks
      read -rp "Enter Frappe App Name (e.g. erpnext, infra): " app_name
      read -rp "Enter Frappe Site Name [test_site]: " site_name
      site_name=${site_name:-test_site}

      printf "%s\n" \
        'STACK_NAME="Frappe / ERPNext"' \
        "FRAPPE_APP=\"${app_name}\"" \
        "FRAPPE_SITE=\"${site_name}\"" \
        "TEST_CMD=\"bench --site ${site_name} run-tests --app${app_name}\"" \
        "TEST_CMD_RACE=\"bench --site ${site_name} run-tests --app${app_name} --force\"" \
        "LINT_CMD=\"ruff check apps/${app_name}\"" \
        "FORMAT_CMD=\"ruff format apps/${app_name}\"" \
        "MIGRATION_CMD=\"bench --site ${site_name} migrate\"" \
        'API_TEST_CMD="bru run api-tests/ --env Local"' \
        'MUTATION_TOOL="mutmut"' \
        "MUTATION_CMD=\"mutmut run --paths-to-mutate apps/${app_name}\"" > .agents/stack.env
      ;;
    5)
      # Configuration for Go applications utilizing embedded PocketBase
      read -rp "PocketBase tests directory [./...]: " pb_test_dir
      pb_test_dir=${pb_test_dir:-./...}
      read -rp "Bruno scenarios directory [tests/bruno]: " bruno_dir
      bruno_dir=${bruno_dir:-tests/bruno}

      printf "%s\n" \
        'STACK_NAME="PocketBase + Go"' \
        'FRAMEWORK="pocketbase"' \
        "TEST_CMD=\"go test ${pb_test_dir}\"" \
        "TEST_CMD_RACE=\"go test -race ${pb_test_dir}\"" \
        'TEST_UNIT_CMD="go test -run ^TestUnit ./..."' \
        'TEST_INTEGRATION_CMD="go test -run ^TestApi ./..."' \
        'LINT_CMD="golangci-lint run"' \
        'FORMAT_CMD="gofmt -s -w ."' \
        "API_TEST_CMD=\"bru run ${bruno_dir} --env Local\"" \
        'MUTATION_TOOL="go-mutesting"' \
        'MUTATION_CMD="go-mutesting ./..."' > .agents/stack.env
      ;;
    6)
      # Prompt and configure custom developer toolchains
      echo "--- Custom Stack Configuration ---"
      read -rp "Stack Name [Custom]: " custom_name
      custom_name=${custom_name:-Custom}

      read -rp "Test Command (Unit/Integration) [go test ./... / pnpm test]: " custom_test
      custom_test=${custom_test:-echo "No test command defined"}

      read -rp "Strict/Race Test Command [go test -race ./... / pnpm test --run]: " custom_test_race
      custom_test_race=${custom_test_race:-$custom_test}

      read -rp "Linter Command [golangci-lint run / ruff check .]: " custom_lint
      custom_lint=${custom_lint:-echo "No lint command defined"}

      read -rp "Formatter Command [gofmt -s -w . / ruff format .]: " custom_format
      custom_format=${custom_format:-echo "No format command defined"}

      read -rp "API / E2E Test Command [bru run api-tests/ --env Local]: " custom_api
      custom_api=${custom_api:-bru run api-tests/ --env Local}

      read -rp "Mutation Test Command (optional) [skip]: " custom_mutation
      custom_mutation=${custom_mutation:-echo "No mutation tool configured"}

      printf "%s\n" \
        "STACK_NAME=\"${custom_name}\"" \
        "TEST_CMD=\"${custom_test}\"" \
        "TEST_CMD_RACE=\"${custom_test_race}\"" \
        "LINT_CMD=\"${custom_lint}\"" \
        "FORMAT_CMD=\"${custom_format}\"" \
        "API_TEST_CMD=\"${custom_api}\"" \
        "MUTATION_CMD=\"${custom_mutation}\"" > .agents/stack.env
      ;;
  esac
  echo "==> [SUCCESS] Generated .agents/stack.env."
fi

echo "==> Setup completed successfully."
