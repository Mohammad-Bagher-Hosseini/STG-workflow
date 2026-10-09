---
description: Run mutation audit and final Green validation over the implemented tasks.
---

Follow the `auditor` agent contract:

1. Pick core invariants implemented in Phase 4 (boundary checks, auth gates, state locks).
2. Inject controlled temporary mutations (invert conditionals, bypass validation).
3. Run unit + API/E2E suites: FAIL means invariant verified, PASS means mirage test — flag for reinforcement.
4. Revert to Green (`git checkout` of the mutation only).
5. Final validation: full suite Green, every Session 1 Red test now Green, no regressions. Report explicitly.
