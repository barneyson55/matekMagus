# AI TODO (prioritized)

- [x] Implement `modules/fuggveny_transzformaciok.html` + `modules/fuggveny_transzformaciok.js` (Algebra -> Fuggvenyek altalanos tulajdonsagai) with test/practice/visual tabs and add E2E coverage.
- [x] Implement `modules/nevezetes_fuggvenyek_temazaro.html` + `modules/nevezetes_fuggvenyek_temazaro.js` (Algebra -> Nevezetes fuggvenyek) with tests.
- [x] Finish test question generation and result payloads in `modules/linearis_fuggveny.html` and update E2E coverage in `tests/e2e/electron-smoke.test.js`.
- [x] Implement `modules/masodfoku_fuggveny.html` + `modules/masodfoku_fuggveny.js` with tests.
- [x] Implement `modules/hatvanyfuggvenyek.html` + `modules/hatvanyfuggvenyek.js` with tests.
- [x] Implement `modules/exp_log_fuggveny.html` + `modules/exp_log_fuggveny.js` with tests.
- [x] Implement `modules/trigonometrikus_fuggvenyek.html` + `modules/trigonometrikus_fuggvenyek.js` with tests.
- [x] Implement `modules/specialis_fuggvenyek.html` + `modules/specialis_fuggvenyek.js` with tests.
- [x] Implement `modules/haromszogek_temazaro.html` + `modules/haromszogek_temazaro.js` and `modules/nevezetes_vonalak.html` + `modules/nevezetes_vonalak.js` with tests.
- [x] Implement geometry topics: `modules/haromszog_egyenlotlenseg.html`, `modules/szogtetelek.html`, `modules/szinusz_koszinusz_tetel.html` (plus matching `.js` files) with tests.
- [x] Decide and implement navigation source-of-truth: create `assets/temakorok` and generate navigation, or update `index.html` and README to match the manual list.
- [x] Add missing app icon at `assets/icon.png` or update `main.js` to a valid path; verify packaging.
- [x] Fix CSS encoding issues in `style.css` and verify on Windows renderer. (Windows renderer verification pending)
- [x] Remove or hide legacy `modules/xp_guide.html` and clean any links in `index.html`.

- [ ] Fix test policy: WSL/headless alatt az E2E (Electron smoke) legyen automatikusan SKIP, Windows alatt pedig fusson normálisan.

## Questions for user
- Confirm module priority after `paritas` (finish functions vs jump to geometry).
- Provide Codex CLI flags for non-interactive and read-only runs (and sandbox/approval behavior).
- Provide the desired app icon file/path for `assets/icon.png`.

## ENDGAME / RELEASE
- [ ] Audit all user-facing strings in `index.html`, `modules/**/*.html`, `modules/**/*.js`, `results.html`, `settings.html`, and `character_sheet.html` for leftover English and replace with consistent Hungarian.
- [ ] Standardize Hungarian terminology/capitalization (Elmélet, Vizuális modell, Teszt, Gyakorlás, Küldetés) across headers, buttons, tooltips, and aria/alt labels.
- [ ] Verify diacritics and UTF-8 rendering in every module’s text blocks; fix any ASCII fallbacks or encoding regressions.
- [ ] Create a localization glossary in `docs/` and apply it to button labels, status messages, and error texts for consistency.
- [ ] Review results/score formatting to ensure Hungarian locale conventions (decimal comma, thousand separators, date formats where used).
- [ ] Validate Quest Log state labels and acceptance flow copy for Hungarian tone and clarity; align with constitution phrasing.
- [ ] Define responsive breakpoints in `style.css` (desktop/tablet/mobile) and document target widths in `docs/`.
- [ ] Implement mobile layout rules: Quest Log collapses to a drawer, header stacks cleanly, and module tabs wrap/scroll without overlap.
- [ ] Ensure iframe/module content avoids horizontal scroll at 360–414px widths; adjust padding and font sizes.
- [ ] Verify touch target sizes (buttons, tabs, quest items) meet 44px minimum and update CSS accordingly.
- [ ] Test orientation changes (portrait/landscape) and confirm layout stability for Quest Log and header.
- [ ] Build a manual smoke-test checklist (launch, navigation, module tabs, tests, practice, results, settings, persistence) and store in `docs/RELEASE_CHECKLIST.md`.
- [ ] Execute smoke tests on Windows and WSL/headless; log failures and environment notes in `docs/status.md`.
- [ ] Create a bug triage log in `docs/critical_todo.md` with blocker/major/minor labels and reproduction steps.
- [ ] Cross-check `index.html` navigation tree against `constitution/curriculum/roadmap.md` and list missing modules by topic.
- [ ] Validate each module’s theory/test/practice content matches its topicId and curriculum description; record mismatches to fix.
- [ ] Verify topicId consistency between `index.html`, module filenames, and `progress.json` schema; fix or map aliases.
- [ ] Audit XP weights and difficulty mappings in `xp_config.js` against `constitution/xp/xp_formula.md` and `constitution/curriculum/difficulties.md`.
- [ ] Review test question generation for each module to ensure difficulty tags map to the correct curriculum level.
- [ ] Add a data-consistency script or checklist to confirm every module has required tabs and emits expected result payloads.
- [ ] Document a reliable test strategy in `docs/` (how to run `npm run test` and `npm run test:e2e`, headless caveats, expected failures).
- [ ] Stabilize E2E tests by seeding or mocking randomness in question generation (document the approach).
- [ ] Define minimal unit-test coverage targets for generators/helpers and add missing unit tests.
- [ ] Produce a release readiness report in `docs/` summarizing module coverage, test results, known gaps, and go/no-go risks.
