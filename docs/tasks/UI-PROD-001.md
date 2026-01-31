# UI-PROD-001 — Hide default menu + dev shortcuts in packaged builds

## Goal
In packaged builds (Windows target), the app must NOT show the default menu bar (File/Edit/View/Window/Help).
Also disable common dev-only shortcuts in packaged mode:
- Reload: F5 / Ctrl+R
- DevTools: Ctrl+Shift+I
Dev experience should remain intact in dev mode.

## Constraints
- Must be gated so it only applies to packaged builds.
- Prefer `app.isPackaged` as the source of truth.
- For testability, allow an override via env var:
  - `MATEKMESTER_PROD_UI=1` should force the “packaged UI” behaviour even when running in dev mode.
- Do not break macOS expectations:
  - On macOS, it’s OK to keep a minimal menu, but for Windows/Linux packaged build the menu must be hidden.
- No changes in this task to renderer UI layouts (that’s UI-POLISH-001).

## Files to inspect
- package.json (main entry, scripts)
- main process entry (often main.js / src/main/**)
- any Menu usage:
  - Menu.setApplicationMenu
  - Menu.buildFromTemplate
- BrowserWindow creation code

## Implementation (when the autopilot executes this task)
1) Introduce helper boolean:
   - `const prodUI = app.isPackaged || process.env.MATEKMESTER_PROD_UI === '1';`
2) If `prodUI` and platform is not `darwin`:
   - `Menu.setApplicationMenu(null)`
   - `win.removeMenu()`
   - `win.setMenuBarVisibility(false)`
   - `win.setAutoHideMenuBar(true)`
   - Ensure BrowserWindow is created with `autoHideMenuBar: prodUI`
3) Disable DevTools in prodUI:
   - set `webPreferences.devTools: !prodUI`
4) Disable shortcuts in prodUI using `before-input-event` handler:
   - block F5, Ctrl+R, Ctrl+Shift+I
5) Document the behaviour briefly in docs/status.md (or a new docs/production_ui.md if needed).

## Definition of Done
- Packaged build on Windows does not show the File/Edit/View/Window/Help menu bar.
- In dev mode, the menu may still appear.
- With `MATEKMESTER_PROD_UI=1`, the app hides the menu even in dev mode (for test verification).
- No crashes on startup.

## Verification (later, when task executes)
- Manual (Windows packaged): run installer and confirm no menu bar.
- Dev forced mode:
  - Run app with `MATEKMESTER_PROD_UI=1` and confirm menu hidden.
- Ensure tests still pass after subsequent tasks add E2E.
