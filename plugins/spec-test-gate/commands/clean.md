---
description: Remove Spec-Test-Gate project state (.agents/stack.env, or whole .agents/ with --all). Does not uninstall the plugin.
argument-hint: [--all]
---

Remove STG project state from the CURRENT project directory.

Scope guard: run this inside a TARGET project repo, never inside the spec-test-gate marketplace repo itself. This command only deletes project state — it never touches plugin files, `AGENTS.md`, implementation files, or test files. To uninstall the plugin itself, use `/plugin uninstall spec-test-gate`.

## Syntax

```text
/spec-test-gate:clean [--all]
```

- No args: remove only `.agents/stack.env`.
- `--all`: remove the entire `.agents/` directory (stack config + task queue state).

## Steps

1. Show what will be removed: print the content of `.agents/stack.env` (and, with `--all`, list everything under `.agents/`).
2. If nothing exists, report that and stop — do not error.
3. **HALT** and ask the user for explicit confirmation before deleting anything.
4. Only after confirmation, delete exactly the scoped target (`rm .agents/stack.env`, or `rm -rf .agents` with `--all`).
5. Confirm what was removed.
