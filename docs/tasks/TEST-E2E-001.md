# TEST-E2E-001 — Electron E2E smoke tests

## Goal
Add smoke-level E2E tests that ensure:
- the Electron app launches
- the first window loads
- core navigation works (at least: open main page, open one module)
- no fatal console errors on startup

## Constraints
- Avoid brittle selectors: add `data-testid` attributes to key UI elements.
- Tests must close the Electron app at the end.
- Must run in CI Linux headless (xvfb strategy).

## Implementation (when the autopilot executes this task)
1) Add stable selectors (`data-testid`) to:
   - main app root container
   - primary navigation (module list)
   - a “start” or “open module” action
2) Write tests in tests/e2e/ using playwright-core Electron launcher:
   - launch the app
   - get firstWindow()
   - assert main UI visible
   - open one module
   - assert module content visible
3) Add an assertion for “no console.error on startup”:
   - hook page.on('console', ...) and fail on severe errors (allow known benign warnings if needed).

## Definition of Done
- `npm run test:e2e` passes locally in WSL (with WSLg or xvfb).
- CI can run the same smoke tests without flakiness.
