---
description: Author the failing test harness for exactly one task T-[N], then halt for approval.
---

Author the test harness for ONLY task `$ARGUMENTS` following `skills/spec-test-gate/SKILL.md` Phase 2:

1. Explain its quadrant (Q1 Happy, Q2 Boundary, Q3 Invariant, Q4 Failure/Rollback).
2. Scaffold the minimal interface/struct so tests compile.
3. Write the failing test with Triple-Point Assertions (Transport/API, Contract/Domain, Database/State).
4. Run tests, verify pure Red.
5. CRITICAL HALT: output `Task $ARGUMENTS test harness staged. Ready for review.` Do NOT touch the next task until the user approves this one and opens a fresh chat.
