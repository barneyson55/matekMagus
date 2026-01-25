# AI TODO (Desktop v1 focus)

Last updated: 2026-01-25

## P0 — DESKTOP V1: QUALITY + UX + SYSTEMS

### Test strategy + test harness restructure
- [x] Split unit vs E2E scripts clearly (`npm run test:unit` vs `npm run test:e2e`) and document the split.
- [x] Ensure E2E runs on Windows; WSL/headless should skip gracefully without failing.
- [x] Automation policy: do not run tests automatically; only generate/update them.
- [ ] Add `docs/TESTING.md` with exact commands for Windows + WSL (include expected skip notes).

### XP system audit + maxing viability
- [ ] Read `constitution/xp/xp_formula.md` + `constitution/xp/xp_roadmap.md` and inspect `xp_config.js` + XP logic.
- [ ] Define/confirm MAX level + XP cap/clamp behavior and document the rule.
- [ ] Add `scripts/xp_audit.js` to compute total XP to max, quests needed per level, and flag absurd curves.
- [ ] Add `docs/XP_AUDIT.md` with findings + rules.
- [ ] Add unit tests for XP boundaries, cap/clamp, and progression to max.

### Settings menu completion
- [ ] Make all settings actually apply + persist.
- [ ] Ensure all strings are Hungarian; remove English leftovers.
- [ ] Add unit/integration tests for settings defaults + persistence.

### Character Sheet UI polish
- [ ] Fix layout/overflow/alignment issues across panels.
- [ ] Ensure Hungarian labels and consistent terminology.
- [ ] Add DOM/unit-style tests for rendering key sections.

### Buff system
- [ ] Define buffs (id, HU name/description, icon, unlock rule).
- [ ] Persist unlocked buffs in progress state.
- [ ] Render buffs via existing `buff-icon` hooks/areas.
- [ ] Add tooltip or details panel for buffs (Hungarian).
- [ ] Add unit tests for buff unlock, persistence, and render mapping.

### Release docs sync
- [ ] Update `docs/status.md` + `docs/critical_todo.md` as work progresses.

## V2 / MOBILE (later)
- [ ] Re-validate and refine responsive breakpoints in `style.css` for tablet/mobile widths.
- [ ] Mobile Quest Log drawer behavior and header stacking polish.
- [ ] Module tab wrapping/scrolling on small screens; remove iframe horizontal scroll at 360–414px.
- [ ] Touch target audit for mobile (44px minimum across controls).
- [ ] Orientation change checks (portrait/landscape) for header + Quest Log.
- [ ] Add mobile-focused smoke tests or E2E coverage.

## History — Completed (coverage/content/infra)

### Module coverage
- [x] Modulzáró/témazáró modules (HTML+JS): alapozo_modulzaro, gondolkodas_temazaro, szamelmelet_temazaro, algebra_modulzaro, geometria_modulzaro, sokszogek_temazaro, kor_temazaro, geo_transzform_temazaro, koordinatageometria_temazaro, tergeometria_temazaro, valstat_modulzaro, kombinatorika_temazaro, valszam_temazaro, statisztika_temazaro, emelt_modulzaro, sorozatok_temazaro, differencial_temazaro, integral_temazaro.
- [x] Geometria core modules (HTML+JS): terulet_kerulet, specialis_negyszogek, keruleti_szogek, latokoriv, kor_helyzetek, tukrozes, eltolas_forgatas, hasonlosag, vektorok, egyenes_egyenlete, kor_egyenlete, alakzatok_metszespontja, hasabok_gulak, forgastestek.
- [x] Valószínűség/Statisztika core modules (HTML+JS): permutaciok, variaciok, kombinaciok, binomialis_tetel, klasszikus_valoszinuseg, geometriai_valoszinuseg, felteteles_valoszinuseg, adatok_abrazolasa, kozepertekek, szorodas.
- [x] Emelt core modules (HTML+JS): szamtani_mertani, kamatoskamat, konvergencia, hatarertek, derivalt_fogalma, derivalasi_szabalyok, fuggvenyvizsgalat, hatarozatlan_integral, hatarozott_integral, newton_leibniz, terfogatszamitas.
- [x] `modules/fuggveny_transzformaciok.html` + `modules/fuggveny_transzformaciok.js` implemented and linked in navigation.
- [x] `modules/nevezetes_fuggvenyek_temazaro.html` + `modules/nevezetes_fuggvenyek_temazaro.js` implemented and linked in navigation.
- [x] `modules/masodfoku_fuggveny.html` + `modules/masodfoku_fuggveny.js` implemented and linked in navigation.
- [x] `modules/hatvanyfuggvenyek.html` + `modules/hatvanyfuggvenyek.js` implemented and linked in navigation.
- [x] `modules/exp_log_fuggveny.html` + `modules/exp_log_fuggveny.js` implemented and linked in navigation.
- [x] `modules/trigonometrikus_fuggvenyek.html` + `modules/trigonometrikus_fuggvenyek.js` implemented and linked in navigation.
- [x] `modules/specialis_fuggvenyek.html` + `modules/specialis_fuggvenyek.js` implemented and linked in navigation.
- [x] `modules/haromszogek_temazaro.html` + `modules/haromszogek_temazaro.js` implemented and linked in navigation.
- [x] `modules/nevezetes_vonalak.html` + `modules/nevezetes_vonalak.js` implemented and linked in navigation.
- [x] `modules/haromszog_egyenlotlenseg.html`, `modules/szogtetelek.html`, `modules/szinusz_koszinusz_tetel.html` (+ matching `.js`) implemented and linked in navigation.

### Localization + testing
- [x] Hungarian localization sweep #1: audit `index.html`, `modules/*.html`, `modules/*.js`, `modules/results.html`, `modules/character_sheet.html` against `docs/localization_glossary.md` and replace any English/ASCII fallbacks.
- [x] Hungarian localization sweep #2: normalize casing and diacritics for Elmélet/Vizuális modell/Teszt/Gyakorlás/Küldetés elfogadása labels; fix ASCII titles like `Beallitasok` in legacy module files if kept.
- [x] Test strategy reliability: ensure `npm run test` is stable in WSL/headless (auto-skip E2E when required) and runs full on Windows; update `docs/test_strategy.md` and record Windows run in `docs/status.md`.
- [x] Localization glossary present at `docs/localization_glossary.md`.

### Content + features
- [x] Expand theory sections with more worked examples and diagrams for existing Alapozó/Algebra modules.
- [x] Increase question bank breadth and randomization to reduce repetition in tests/practice.
- [x] Enrich results/character sheet with trend summaries and per-topic insights.
- [x] Implement achievements (per `constitution/achievements/README.md`) once core coverage is complete.
