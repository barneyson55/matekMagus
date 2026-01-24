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
- E2E smoke tests auto-skip in WSL/headless environments; Windows runs execute normally.
- E2E suite now seeds deterministic randomness for question generation via `window.__setMatekSeed` and iframe re-seeding.
- Navigation source-of-truth is the manual list in `index.html` (no `assets/temakorok` generation in this phase).
- App icon added at `assets/icon.png` for the Electron window.
- CSS encoding normalized in `style.css` (UTF-8 charset, ASCII-safe glyph escapes).
- Responsive breakpoints (desktop/tablet/mobile) defined in `style.css` and documented in `docs/responsive.md`.
- Legacy `modules/xp_guide.html` removed and the quest exclusions cleaned up in `index.html`.
- ENDGAME / RELEASE task list added to `docs/ai_todo.md` to drive localization, responsive UI, testing, and release readiness.
- App shell/settings labels cleaned up to remove leftover English.
- Hungarian UI terminology/capitalization normalized for module tabs and character sheet labels (Elmélet/Vizuális modell/Teszt/Gyakorlás/Küldetés).
- Module question/feedback text diacritics corrected in function characterization and parity/notable-functions modules (ASCII fallbacks removed).
- Localization glossary added in `docs/localization_glossary.md`; button labels, status messages, and validation/error copy normalized to the glossary across modules and settings.
- Hungarian locale number formatting applied to results, character sheet, and XP header summaries (thousand separators/decimal comma where applicable).
- Quest Log state labels and quest-acceptance overlay copy aligned with constitution phrasing; character sheet status meta labels corrected.
- Mobile layout rules applied: Quest Log drawer on small screens, stacked header, and responsive module tab wrapping/scrolling.
- Iframe module responsive overrides now reduce padding/fonts and force single-column grids on small widths to prevent horizontal scrolling at 360–414px.
- Touch targets updated to a 44px minimum for app shell buttons, Quest Log entries, and module buttons/tabs.
- Orientation-change E2E coverage added to validate header and Quest Log layout stability across portrait/landscape viewports.
- Manual release smoke-test checklist added in `docs/RELEASE_CHECKLIST.md`.
- Release readiness report added in `docs/release_readiness_report.md`.
- Bug triage log initialized in `docs/critical_todo.md` with severity labels and reproduction steps.
- Module coverage gap report added in `docs/module_coverage.md` with missing modules grouped by roadmap topics.
- Module content audit completed; no mismatches recorded in `docs/module_content_audit.md`.
- TopicId alias normalization added to keep `progress.json` aligned with navigation (`specialis_fuggvenyek` vs legacy `abszolut_ertek_fuggveny`), plus XP config alias coverage.
- XP weight audit completed; `constitution/curriculum/difficulties.md` aligned with `xp_formula.md` for Geometria main topic weight (1.2).
- Nehézségi címke audit lezárva a tesztkérdés-generátoroknál; nem találtunk tantervi eltérést (lásd `docs/difficulty_tag_audit.md`).
- Module tab/payload consistency script added (`scripts/check_module_consistency.js`) with usage notes in `docs/module_consistency.md`.
- Test strategy documented in `docs/test_strategy.md` (how to run `npm run test` / `npm run test:e2e`, headless/WSL skip expectations).
- Minimal unit-test coverage added for generator/helper invariants (`tests/unit/generator_helpers.test.js`) with a DOM-stub harness; `npm run test` now runs unit + E2E, and `npm run test:unit` runs unit tests only.

## Partial or Unverified
- Windows renderer verification pending for CSS glyph rendering in the sidebar disclosure arrow.
- Windows smoke tests are still pending; no native Windows environment available in this session.
- Latest orientation layout coverage is unverified on Windows (WSL2 run completed, but Windows coverage remains outstanding).
- Packaging verification is pending (no packaging script configured in `package.json`).

## Missing or Risky
- Many geometry/probability/statistics/advanced curriculum modules are not present in `modules/` yet.

## Next Milestone
- TBD

## Recent Tests
- 2026-01-24 (local CLI): `npm run test` — pass (seeded E2E randomness).
- 2026-01-24 (local CLI): `npm run test` — pass.
- 2026-01-24 (local CLI): `npm run test:e2e` — pass.
- 2026-01-24 (WSL2, DISPLAY=:0): `npm run test` (alias for `npm run test:e2e`) — pass.
- 2026-01-24 (WSL2, DISPLAY=:0): `npm run test:e2e` — pass.
- 2026-01-24 (Windows): not run (no native Windows environment available in this session).
- 2026-01-24 (local CLI): `npm run test` — pass (test strategy doc update).
- 2026-01-24 (local CLI): `npm run test:e2e` — pass (test strategy doc update).
- 2026-01-24 (local CLI): `npm run test` — pass (unit + E2E).
- 2026-01-24 (local CLI): `npm run test:e2e` — pass.
- 2026-01-24 (WSL2): `npm run test` — pass (unit + E2E; E2E not skipped).
- 2026-01-24 (WSL2): `npm run test:e2e` — pass.
