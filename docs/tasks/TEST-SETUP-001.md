# TEST-SETUP-001 — Deterministic test harness + npm scripts

## Goal
Create a stable test foundation that works in WSL and CI:
- Unit tests for core logic
- E2E smoke tests for Electron
- One-command local execution via npm scripts

## Constraints
- Prefer Node built-in test runner (`node:test`) to avoid heavy frameworks unless already present.
- Keep tests deterministic (no random, no time-based flakiness).
- Ensure e2e can run headless in CI (Linux) using Xvfb strategy (xvfb-maybe or xvfb-run).

## Implementation (when the autopilot executes this task)
1) Create test folders:
   - tests/unit/
   - tests/e2e/
2) Add npm scripts to package.json:
   - `test` (runs unit + e2e)
   - `test:unit`
   - `test:e2e`
3) Add minimal shared helpers:
   - tests/helpers/paths.js (repo root, app entry)
   - tests/helpers/timeouts.js
4) Ensure playwright dependency strategy:
   - Use existing playwright-core if present.
   - If needed, add `playwright-core` (dev) and a minimal headless wrapper dependency:
     - prefer `xvfb-maybe` on Linux so CI can run e2e.
5) Document how to run tests in docs/status.md (or docs/testing.md).

## Definition of Done
- `npm run test:unit` runs (even if there are 0 tests yet).
- `npm run test:e2e` runs (even if it’s a placeholder that launches and closes app).
- `npm test` runs both.
