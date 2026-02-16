# SPEC

## Purpose
Matek Mester is an Electron-based, modular math learning app for Hungarian students.
It delivers theory, visual models, tests, and practice in topic modules.

## Users
- Primary: Hungarian high school students preparing for exams.
- Secondary: Teachers or tutors reviewing progress.

## Scope IN
- Electron desktop shell (main + renderer).
- Iframe-based module loader in `index.html` with per-topic HTML/JS modules in `modules/`.
- Theory, visual models, tests, and practice per module.
- Local persistence of progress and XP in `progress.json` via Electron main process.
- Results, character sheet, and settings modules.
- E2E smoke test coverage in `tests/e2e/electron-smoke.test.js`.

## Scope OUT
- Web-only deployment (TBD).
- Cloud sync or multi-user accounts (TBD).
- Major re-architecture or framework rewrite.

## Tech Stack
- Electron 25 (main + renderer processes).
- Node.js (runtime/scripts).
- Playwright-core (E2E tests).
- Vanilla JS/HTML/CSS for renderer modules.
- KaTeX and Chart.js for math rendering and charts (per README).
- Google Fonts (per README).

## Architecture Notes
- `main.js`: Electron main process, IPC, writes `progress.json` under userData.
- `preload.js`: `contextBridge` exposing `saveTestResult` and `getAllResults` to modules.
- `index.html` + `style.css`: app shell, navigation, and iframe loader.
- Navigation source-of-truth: manual list in `index.html` (no `assets/temakorok` generation in this phase).
- `modules/`: per-topic modules plus `results.html`, `settings.html`, and `character_sheet.html`.
- `tests/e2e/electron-smoke.test.js`: Playwright-based E2E smoke test.

## Constraints
- Keep the current Electron/Node/vanilla JS stack.
- No major rewrites without explicit user approval.
- Preserve existing module patterns and naming conventions.

## TBD
- Packaging/distribution targets and platforms.
- CI/CD pipeline and release process.
- Backup/sync strategy beyond local `progress.json`.
