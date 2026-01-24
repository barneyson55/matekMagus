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

## Questions for user
- Confirm module priority after `paritas` (finish functions vs jump to geometry).
- Provide Codex CLI flags for non-interactive and read-only runs (and sandbox/approval behavior).
- Provide the desired app icon file/path for `assets/icon.png`.
