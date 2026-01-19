# SPEC

## Purpose
Matek Mester is an Electron-based, modular math learning app for Hungarian students.
It delivers theory, visual models, tests, and practice in topic modules.

## Users
- Primary: Hungarian high school students preparing for exams.
- Secondary: Teachers or tutors reviewing progress.

## Scope IN
- Electron desktop shell with module navigation.
- Per-topic modules in `modules/` (HTML/JS) with theory, visuals, test, and practice.
- Local persistence of progress and XP.
- E2E test coverage for module flows.

## Scope OUT
- Web-only deployment (TBD).
- Cloud sync or multi-user accounts (TBD).
- Major re-architecture or framework rewrite.

## Tech Stack
- Electron 25 (main + renderer processes).
- Node.js (runtime, scripts).
- Playwright-core (E2E tests).
- Vanilla JS/HTML/CSS for renderer modules.
- KaTeX and Chart.js (used in modules per README).

## Architecture Notes
- `main.js` hosts the Electron main process and IPC, and writes `progress.json` under userData.
- `preload.js` exposes a limited `electronAPI` bridge to renderer/iframe modules.
- `index.html` + `style.css` provide the app shell and iframe-based module loader.
- `modules/` holds per-topic HTML/JS modules loaded into the iframe.
- `tests/e2e/electron-smoke.test.js` provides Playwright-based E2E coverage.

## Constraints
- Keep the current Electron/Node/vanilla JS stack.
- No major rewrites without explicit user approval.
- Preserve existing module patterns and naming conventions.

## TBD
- Distribution/packaging targets.
- CI/CD pipeline and release process.
- Sync/backup strategy beyond local `progress.json`.
