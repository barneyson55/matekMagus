# AI TODO

Last updated: 2026-01-26

## BUGFIXES / HOT
- [x] Guard test question pool fill loops to prevent renderer freezes when random generation cannot reach the target pool size (module JS + legacy HTML modules).

## DESKTOP / PC ONLY — THEORY EXPANSION (P0)

Guidelines for all theory tasks:
- Apply `docs/THEORY_TEMPLATE.md` sections in full and keep Hungarian terminology aligned to `docs/localization_glossary.md`.
- Emphasize weaker-student clarity (short sentences, concrete examples, step-by-step reasoning).
- Each task below includes 6–10 module files and must complete the full theory pass for those modules.
- A few high-difficulty modules appear twice to allow an extra clarity pass.

### Alapozó
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/alapozo_modulzaro.html`, `modules/gondolkodas_temazaro.html`, `modules/halmazmuveletek.html`, `modules/logikai_szita.html`, `modules/skatulya_elv.html`, `modules/szamelmelet_temazaro.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/oszthatosag.html`, `modules/lnko_lkkt.html`, `modules/primtenyezok.html`, `modules/szamrendszerek.html`, `modules/racionalis_szamok_temazaro.html`, `modules/tortek.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/tizedes_tortek.html`, `modules/szazalekszamitas.html`, `modules/hatvany_temazaro.html`, `modules/hatvanyozas.html`, `modules/gyokvonas.html`, `modules/logaritmus.html`.

### Algebra és Függvények
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/algebra_modulzaro.html`, `modules/algebrai_kif_temazaro.html`, `modules/polinomok.html`, `modules/nevezetes_azonossagok.html`, `modules/algebrai_tortek.html`, `modules/egyenletek_temazaro.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/linearis_egyenletek.html`, `modules/masodfoku_egyenlet.html`, `modules/viete_formulak.html`, `modules/parameteres_masodfoku.html`, `modules/specialis_egyenletek.html`, `modules/fuggvenyek_alt_temazaro.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/fuggveny_alapok.html`, `modules/fuggveny_jellemzes.html`, `modules/paritas.html`, `modules/fuggveny_transzformaciok.html`, `modules/nevezetes_fuggvenyek_temazaro.html`, `modules/linearis_fuggveny.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/masodfoku_fuggveny.html`, `modules/hatvanyfuggvenyek.html`, `modules/exp_log_fuggveny.html`, `modules/trigonometrikus_fuggvenyek.html`, `modules/specialis_fuggvenyek.html`, `modules/linearis_fuggveny.html`.

### Geometria
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/geometria_modulzaro.html`, `modules/haromszogek_temazaro.html`, `modules/nevezetes_vonalak.html`, `modules/haromszog_egyenlotlenseg.html`, `modules/szogtetelek.html`, `modules/szinusz_koszinusz_tetel.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/sokszogek_temazaro.html`, `modules/terulet_kerulet.html`, `modules/specialis_negyszogek.html`, `modules/kor_temazaro.html`, `modules/keruleti_szogek.html`, `modules/latokoriv.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/kor_helyzetek.html`, `modules/geo_transzform_temazaro.html`, `modules/tukrozes.html`, `modules/eltolas_forgatas.html`, `modules/hasonlosag.html`, `modules/koordinatageometria_temazaro.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/vektorok.html`, `modules/egyenes_egyenlete.html`, `modules/kor_egyenlete.html`, `modules/alakzatok_metszespontja.html`, `modules/tergeometria_temazaro.html`, `modules/hasabok_gulak.html`, `modules/forgastestek.html`.

### Valószínűségszámítás és Statisztika
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/valstat_modulzaro.html`, `modules/kombinatorika_temazaro.html`, `modules/permutaciok.html`, `modules/variaciok.html`, `modules/kombinaciok.html`, `modules/binomialis_tetel.html`, `modules/valszam_temazaro.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/klasszikus_valoszinuseg.html`, `modules/geometriai_valoszinuseg.html`, `modules/felteteles_valoszinuseg.html`, `modules/statisztika_temazaro.html`, `modules/adatok_abrazolasa.html`, `modules/kozepertekek.html`, `modules/szorodas.html`.

### Emelt / Analízis
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/emelt_modulzaro.html`, `modules/sorozatok_temazaro.html`, `modules/szamtani_mertani.html`, `modules/kamatoskamat.html`, `modules/konvergencia.html`, `modules/differencial_temazaro.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/hatarertek.html`, `modules/derivalt_fogalma.html`, `modules/derivalasi_szabalyok.html`, `modules/fuggvenyvizsgalat.html`, `modules/integral_temazaro.html`, `modules/hatarozatlan_integral.html`.
- [x] Apply THEORY_TEMPLATE + Hungarian consistency sweep to: `modules/hatarozott_integral.html`, `modules/newton_leibniz.html`, `modules/terfogatszamitas.html`, `modules/hatarozatlan_integral.html`, `modules/derivalt_fogalma.html`, `modules/hatarertek.html`.

## DESKTOP V1 — CORE APP POLISH (after theory pass)
- [x] XP maximum/scale sanity check (reachability + pacing). Verify in: `modules/halmazmuveletek.html`, `modules/linearis_egyenletek.html`, `modules/linearis_fuggveny.html`, `modules/terulet_kerulet.html`, `modules/permutaciok.html`, `modules/derivalt_fogalma.html`.
- [x] Settings menu completion/cleanup (labels, focus order, glossary alignment). Verify in: `modules/settings.html`, `modules/character_sheet.html`, `modules/results.html`, `modules/achievements.html`, `modules/alapozo_modulzaro.html`, `modules/geometria_modulzaro.html`.
- [x] Character sheet layout/visual bugfixes + polish. Verify in: `modules/character_sheet.html`, `modules/results.html`, `modules/achievements.html`, `modules/algebra_modulzaro.html`, `modules/valstat_modulzaro.html`, `modules/emelt_modulzaro.html`.
- [x] Buffs system: add buffs + show in buff-icon UI (spec behavior + list assets). Verify in: `modules/halmazmuveletek.html`, `modules/linearis_fuggveny.html`, `modules/terulet_kerulet.html`, `modules/permutaciok.html`, `modules/szamtani_mertani.html`, `modules/character_sheet.html`.

## V2 / Later — Mobile & Responsive (deferred)
- [x] Mobile app shell + Quest Log drawer re-validation. Verify in: `modules/alapozo_modulzaro.html`, `modules/linearis_egyenletek.html`, `modules/linearis_fuggveny.html`, `modules/terulet_kerulet.html`, `modules/klasszikus_valoszinuseg.html`, `modules/szamtani_mertani.html`.
- [x] Mobile module tab overflow + touch target audit. Verify in: `modules/halmazmuveletek.html`, `modules/polinomok.html`, `modules/kor_helyzetek.html`, `modules/vektorok.html`, `modules/permutaciok.html`, `modules/hatarozott_integral.html`.
- [x] Orientation-change regression checks (portrait/landscape). Verify in: `modules/logaritmus.html`, `modules/exp_log_fuggveny.html`, `modules/trigonometrikus_fuggvenyek.html`, `modules/forgastestek.html`, `modules/kozepertekek.html`, `modules/terfogatszamitas.html`.
- [x] Mobile E2E coverage expansion for Quest Log drawer + tab layout. Verify in: `modules/halmazmuveletek.html`, `modules/linearis_fuggveny.html`, `modules/terulet_kerulet.html`, `modules/kor_helyzetek.html`, `modules/permutaciok.html`, `modules/hatarertek.html`.
