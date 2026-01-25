# AI TODO (Desktop v1 focus)

Last updated: 2026-01-25

## P0 — DESKTOP V1 RELEASE (must do)
- [x] Modulzáró/témazáró modules (HTML+JS): alapozo_modulzaro, gondolkodas_temazaro, szamelmelet_temazaro, algebra_modulzaro, geometria_modulzaro, sokszogek_temazaro, kor_temazaro, geo_transzform_temazaro, koordinatageometria_temazaro, tergeometria_temazaro, valstat_modulzaro, kombinatorika_temazaro, valszam_temazaro, statisztika_temazaro, emelt_modulzaro, sorozatok_temazaro, differencial_temazaro, integral_temazaro.
- [x] Geometria core modules (HTML+JS): terulet_kerulet, specialis_negyszogek, keruleti_szogek, latokoriv, kor_helyzetek, tukrozes, eltolas_forgatas, hasonlosag, vektorok, egyenes_egyenlete, kor_egyenlete, alakzatok_metszespontja, hasabok_gulak, forgastestek.
- [x] Valószínűség/Statisztika core modules (HTML+JS): permutaciok, variaciok, kombinaciok, binomialis_tetel, klasszikus_valoszinuseg, geometriai_valoszinuseg, felteteles_valoszinuseg, adatok_abrazolasa, kozepertekek, szorodas.
- [x] Emelt core modules (HTML+JS): szamtani_mertani, kamatoskamat, konvergencia, hatarertek, derivalt_fogalma, derivalasi_szabalyok, fuggvenyvizsgalat, hatarozatlan_integral, hatarozott_integral, newton_leibniz, terfogatszamitas.
- [x] Hungarian localization sweep #1: audit `index.html`, `modules/*.html`, `modules/*.js`, `modules/results.html`, `modules/character_sheet.html` against `docs/localization_glossary.md` and replace any English/ASCII fallbacks.
- [x] Hungarian localization sweep #2: normalize casing and diacritics for Elmélet/Vizuális modell/Teszt/Gyakorlás/Küldetés elfogadása labels; fix ASCII titles like `Beallitasok` in legacy module files if kept.
- [x] Test strategy reliability: ensure `npm run test` is stable in WSL/headless (auto-skip E2E when required) and runs full on Windows; update `docs/test_strategy.md` and record Windows run in `docs/status.md`.

## P1 — CONTENT EXPANSION (nice to have after v1)
- [x] Expand theory sections with more worked examples and diagrams for existing Alapozó/Algebra modules.
- [x] Increase question bank breadth and randomization to reduce repetition in tests/practice.
- [x] Enrich results/character sheet with trend summaries and per-topic insights.
- [x] Implement achievements (per `constitution/achievements/README.md`) once core coverage is complete.

## P2 — V2 (Mobile/Responsive later)
- [x] Re-validate and refine responsive breakpoints (`style.css`) for tablet/mobile widths.
- [x] Mobile Quest Log drawer behavior and header stacking polish.
- [x] Module tab wrapping/scrolling on small screens; remove iframe horizontal scroll at 360–414px.
- [x] Touch target audit for mobile (44px minimum across controls).
- [x] Orientation change checks (portrait/landscape) for header + Quest Log.
- [x] Add mobile-focused smoke tests or E2E coverage.

## Completed (verified)
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
- [x] Localization glossary present at `docs/localization_glossary.md`.
