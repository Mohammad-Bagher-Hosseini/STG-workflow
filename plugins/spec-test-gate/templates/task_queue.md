# Epic Specification & Task Queue

> **Ownership:** The spec below is USER-AUTHORED. The AI only asked questions and offered labeled suggestions. Do not let the AI silently redesign it.

## 1. User Spec (with touched artifacts & full logic)

- **Artifacts & Logic:** (every route/table/component/job the user specified, each with complete step-by-step logic — e.g. `POST /api/v1/login takes phone + password; if phone exists in DB and password is correct, return a JWT token`)
- **Boundaries:**
- **Interfaces & Signatures:**
- **Invariants:**

## 2. Indivisible Task Queue (user-approved; AI suggestions labeled as such)

A task is test-complete ONLY when Unit, API, AND E2E are all Red. E2E is written per-task — never deferred to the end.

| Task ID | Boundary / Component | Invariant / Assertion | Quadrant | Unit | API | E2E | Impl Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
