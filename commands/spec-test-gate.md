---
description: Start Spec-Test-Gate Phase 0 and 1. User writes the spec, AI interrogates, then user breaks it into tasks.
---

Start the Spec-Test-Gate workflow from the plugin skill `spec-test-gate`.

1. Follow `skills/spec-test-gate/SKILL.md` Phase 0: ask the USER to write the full spec with every touched artifact and complete logic. Interrogate with `QUESTION:` / `SUGGESTION:` prefixes. HALT for spec finalization.
2. Then Phase 1: ask the USER to decompose into `T-01`, `T-02`, ... Only after explicit approval, write `templates/task_queue.md`. HALT for queue confirmation.
