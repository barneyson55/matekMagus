# Status

## Snapshot
- Electron shell loads topic modules via an iframe (`index.html` + `style.css`).
- `main.js` handles IPC and local persistence (`progress.json` in userData).
- E2E coverage exists in `tests/e2e/electron-smoke.test.js`.
- Many Algebra/Function modules are implemented; remaining roadmap modules are tracked in `todo.md`.

## Partial or Unverified
- README notes `modules/linearis_fuggveny.html` test generator is incomplete (verify current state).
- Navigation list appears manually maintained while `assets/temakorok` exists (risk of drift).

## Missing or Risky
- `assets/icon.png` is referenced by the app shell but missing (per README).
- CSS encoding issues in `style.css` can affect UI rendering (per README).
- Remaining curriculum modules are still outstanding (see `todo.md`).

## Next Milestone
- TBD
