# Status

## Snapshot
- Electron app: `main.js` main process, `index.html` renderer, iframe module loader.
- Modules implemented for foundational and algebra topics in `modules/`, plus `results.html`, `settings.html`, `character_sheet.html`, and `placeholder.html`.
- Function transformations module (`modules/fuggveny_transzformaciok.html` + `.js`) implemented with test/practice/visual tabs and E2E coverage.
- Nevezetes fuggvenyek temazaro module (`modules/nevezetes_fuggvenyek_temazaro.html` + `.js`) implemented with test/practice/visual tabs and E2E coverage.
- Lineáris függvény module now generates full test question sets and emits enriched result payloads; E2E assertions updated.
- Másodfokú függvény module implemented (`modules/masodfoku_fuggveny.html` + `.js`) with test/practice/visual tabs and E2E coverage.
- Hatványfüggvények module implemented (`modules/hatvanyfuggvenyek.html` + `.js`) with test/practice/visual tabs and E2E coverage.
- Exponenciális és logaritmus függvények module implemented (`modules/exp_log_fuggveny.html` + `.js`) with test/practice/visual tabs and E2E coverage.
- Trigonometrikus függvények module implemented (`modules/trigonometrikus_fuggvenyek.html` + `.js`) with test/practice/visual tabs and E2E coverage.
- Abszolútérték, gyök függvények module implemented (`modules/specialis_fuggvenyek.html` + `.js`) with test/practice/visual tabs and E2E coverage.
- Alapfogalmak és Háromszögek temazaro module implemented (`modules/haromszogek_temazaro.html` + `.js`) with test/practice/visual tabs and E2E coverage.
- Nevezetes vonalak module implemented (`modules/nevezetes_vonalak.html` + `.js`) with test/practice/visual tabs and E2E coverage.
- Háromszög-egyenlőtlenség, Pitagorasz/befogó/magasság, és Szinusz/Koszinusz tétel modules implemented (`modules/haromszog_egyenlotlenseg.html`, `modules/szogtetelek.html`, `modules/szinusz_koszinusz_tetel.html` + `.js`) with test/practice/visual tabs and E2E coverage.
- Local persistence in `progress.json` via IPC; `preload.js` exposes the bridge.
- E2E smoke test in `tests/e2e/electron-smoke.test.js`.
- Navigation source-of-truth is the manual list in `index.html` (no `assets/temakorok` generation in this phase).
- App icon added at `assets/icon.png` for the Electron window.
- CSS encoding normalized in `style.css` (UTF-8 charset, ASCII-safe glyph escapes).
- Legacy `modules/xp_guide.html` removed and the quest exclusions cleaned up in `index.html`.
- ENDGAME / RELEASE task list added to `docs/ai_todo.md` to drive localization, responsive UI, testing, and release readiness.

## Partial or Unverified
- Windows renderer verification pending for CSS glyph rendering in the sidebar disclosure arrow.
- E2E tests may fail in headless/WSL environments; `npm run test` (which invokes `npm run test:e2e`) failed here with `ERR_TEST_FAILURE` before reporting individual cases.
- Packaging verification is pending (no packaging script configured in `package.json`).

## Missing or Risky
- Many geometry/probability/statistics/advanced curriculum modules are not present in `modules/` yet.

## Next Milestone
- TBD
