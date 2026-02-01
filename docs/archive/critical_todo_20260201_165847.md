# Critical TODO / Risks

Last reviewed: 2026-02-01 (Bug triage log updated)

## Bug Triage Log

- [RESOLVED] Renderer freeze when opening random modules (especially subtopics) due to unbounded test question pool fill loops
  - Repro steps:
    1. Launch the app.
    2. Open a module and switch to Teszt (default difficulty).
    3. In some modules, test pool fill loops can stall and freeze the UI.
  - Expected: Module loads and UI remains responsive.
  - Actual: Renderer hangs; clicks become unresponsive.
  - Fix: Added safety bounds to question pool fill loops across module JS + legacy HTML modules.
  - Notes: 2026-01-26.

- [RESOLVED] Curriculum module coverage complete (Emelt core modules added; 95 of 95)
  - Repro steps:
    1. Launch the app.
    2. Open the Quest Log.
    3. Compare available modules to `constitution/curriculum/roadmap.md`.
  - Expected: All roadmap topics have matching modules with theory/test/practice tabs.
  - Actual: 95 of 95 roadmap-linked modules exist; core gaps cleared (Emelt).
  - Inventory: Full table + status in `docs/module_coverage.md` (2026-01-25).
  - Notes: Release blocker cleared after Emelt core coverage was implemented.

- [MAJOR] Windows native smoke tests not executed/logged
  - Repro steps:
    1. On a Windows machine, run `npm run test:e2e`.
    2. Capture results and update `docs/status.md`.
  - Expected: Windows smoke test results are recorded.
  - Actual: No Windows run logged; results unknown.
  - Notes: Verification gap that could hide platform regressions.
  - Update (2026-01-25): Test runner now auto-skips E2E in WSL/headless; Windows run still pending.
  - Update (2026-01-25): `npm run test:e2e` now routes through the same skip gate as `npm run test` for WSL/headless.
  - Update (2026-01-31): Windows E2E run not executed in this session (automation policy; no Windows environment). Recorded as not run in `docs/status.md`.

- [RESOLVED] Windows packaging tooling not configured
  - Repro steps:
    1. Check `package.json` for packaging scripts or config.
    2. Look for electron-builder/electron-forge config files.
  - Expected: A packaging command produces installer/portable artifacts for Windows.
  - Actual: Packaging config was missing.
  - Fix: `electron-builder` configured in `package.json`, NSIS/portable targets added, `dist:win`/`publish:win` scripts added.
  - Notes: 2026-01-28.

- [MAJOR] Windows installer build blocked by symlink privilege (winCodeSign extraction)
  - Repro steps:
    1. Run `npm run dist:win` on Windows.
    2. Observe electron-builder extracting `winCodeSign` cache.
  - Expected: Build completes and produces NSIS installer in `dist/`.
  - Actual: Extraction fails with "Cannot create symbolic link" due to missing privilege.
  - Fix: Enable Windows Developer Mode or run the build in an elevated terminal that can create symlinks.
  - Notes: 2026-01-31.

- [MAJOR] Windows code signing not configured
  - Repro steps:
    1. Build the NSIS installer (`npm run dist:win`).
    2. Install on a clean Windows machine.
  - Expected: Signed installer to reduce SmartScreen warnings.
  - Actual: Unsigned build may trigger warnings.
  - Notes: Requires user-provided signing certificate; not configured yet.

- [MAJOR] SmartScreen reputation warnings unverified
  - Repro steps:
    1. Download the installer from GitHub Releases on a clean Windows machine.
    2. Observe SmartScreen / Defender prompts.
  - Expected: Minimal warnings for trusted builds.
  - Actual: Reputation warnings likely without signing.
  - Notes: Validate after signing is in place.

- [MINOR] GitHub Release visibility can block auto-update
  - Repro steps:
    1. Publish a release as draft or prerelease.
    2. Launch the installed app and trigger auto-update.
  - Expected: Auto-update finds the latest release.
  - Actual: Draft/prerelease assets are not used by auto-update.
  - Notes: Ensure releases are published and visible.

- [MINOR] Windows renderer glyph rendering for Quest Log disclosure arrows unverified
  - Repro steps:
    1. Launch the app on Windows.
    2. Open the Quest Log and expand/collapse items.
    3. Observe the disclosure arrow glyphs (▶/▼).
  - Expected: Arrow glyphs render consistently with UTF-8 styling.
  - Actual: Not yet verified on Windows.
  - Notes: Minor visual risk; confirm during Windows validation.

## Notes

- 2026-02-01: MOBILE-005 completed (offline detection + banner via connectivity service + tests); checks not run (automation policy).
- 2026-02-01: MOBILE-004 completed (AppState + Provider wiring + unit test); checks not run (automation policy).
- 2026-02-01: MOBILE-003 completed (mobile domain models + repository interface + in-memory repo + tests); checks not run (automation policy).
- 2026-02-01: MOBILE-001 mobile_check.sh added (Flutter pub get/format/analyze/test); checks not run (automation policy).
- 2026-02-01: `npm install --no-fund --no-audit` and `NPM_CONFIG_CACHE=/tmp/npm-cache npm install --no-fund --no-audit --prefer-offline` timed out after 120s; `npm run dist:win` failed (`electron-builder` not found); `dist/` not created.
- 2026-02-01: Retried `NPM_CONFIG_CACHE=/tmp/npm-cache npm install --no-fund --no-audit --prefer-offline` (timed out after 120s); `npm run dist:win` still failed (`electron-builder` not found); `dist/` still missing.
- 2026-01-31: Windows manual smoke run (app shell + module load + navigation) not executed in this session (no Windows environment); recorded in `docs/status.md`.
- 2026-01-31: Windows manual click-through checklist added (`docs/WINDOWS_CLICKTHROUGH_CHECKLIST.md`); tests not run (automation policy).
- 2026-01-31: `npm run dist:win` failed because electron-builder was not found; `npm install --no-fund --no-audit` failed with `EAI_AGAIN` for registry.npmjs.org, so `dist/` artifacts were not created.
- 2026-01-31: Retried `npm run dist:win` (electron-builder still missing); `npm install --no-fund --no-audit` timed out after 120s, so `dist/` artifacts remain unverified.
- 2026-01-31: Retried `npm install --no-fund --no-audit` (timed out after 120s); electron-builder still missing, `npm run dist:win` failed, and `dist/` was not created.
- 2026-01-31: Retried `npm install --no-fund --no-audit` (failed with `EAI_AGAIN` for registry.npmjs.org and `/home/barney/.npm/_logs` write error); `npm run dist:win` failed (`electron-builder` not found) and `dist/` is still not created.
- 2026-01-31: Retried `NPM_CONFIG_CACHE=/tmp/npm-cache npm install --no-fund --no-audit` (timed out after 120s); `npm run dist:win` failed (`electron-builder` not found) and `dist/` remains unverified.
- 2026-01-31: Retried `NPM_CONFIG_CACHE=/tmp/npm-cache npm install --no-fund --no-audit --prefer-offline` (failed with `EAI_AGAIN` for registry.npmjs.org); `npm run dist:win` failed (`electron-builder` not found) and `dist/` is still not created.
- 2026-01-31: Verified XP header values + level names against constitution; `docs/XP_AUDIT.md` updated; tests not run (automation policy).
- 2026-01-31: Quest Log states + green check verified against constitution; completed check alignment tightened; tests not run (automation policy).
- 2026-01-31: Character sheet final polish completed (layout balance, empty states, keyboard focus); tests not run (automation policy).
- 2026-01-31: Settings overlay final polish (spacing, focus order, labels, keyboard access) completed; tests not run (automation policy).
- 2026-01-31: Verified module tab labels and quest accept copy match constitution wording (Elmélet/Vizuális modell/Teszt/Gyakorlás, Küldetés elfogadása); no code changes; tests not run (automation policy).
- 2026-01-31: Module consistency check run; testResult payloads now use explicit grade/percentage keys across modules; tests not run (automation policy).
- 2026-01-31: HU consistency sweep completed for practice validation copy (nehézségi szint) across remaining modules; tests not run (automation policy).
- 2026-01-31: TEST-E2E-001 completed (data-testid hooks for app shell/module list/module link + startup console-error smoke check); tests not run (automation policy).
- 2026-01-31: TEST-UNIT-001 completed (core logic unit tests for progress persistence/normalization, difficulty normalization, results updates, achievements); tests not run (automation policy).
- 2026-01-31: TEST-SETUP-001 completed (deterministic test helpers + headless xvfb-run gate); tests not run (automation policy).
- 2026-01-31: UI-PROD-001 implemented (packaged builds hide menu + dev shortcuts; dev override via `MATEKMESTER_PROD_UI=1`); tests not run (automation policy).
- 2026-01-31: UI-POLISH-001 implemented (base UI stylesheet + Prettier config/scripts); npm install not run (offline), package-lock update pending.
- 2026-01-31: Buffs HUD finalized (icon alignment, tooltip content with unlock/active info, and locked/active visual states); tests not run (automation policy).
- 2026-01-31: Prepared autopilot task specs for UI polish, production UI gating, test foundation, and CI; tests not run (prep-only).
- 2026-01-27: Module integrity quick scan completed; inline module scripts extracted into matching `.js` files (including achievements/results/settings/character_sheet + placeholder stub) and tab labels verified against constitution phrasing; tests not run (automation policy).
- 2026-01-27: Final HU consistency sweep for app shell/settings/results/character sheet/modules (MatekMester naming + placeholder copy aligned); tests not run (automation policy).
- 2026-01-26: Mobile E2E coverage expanded for Quest Log drawer + tab layout across halmazmuveletek, linearis_fuggveny, terulet_kerulet, kor_helyzetek, permutaciok, hatarertek; tests not run (automation policy).
- 2026-01-26: Orientation-change responsive tweaks applied to logaritmus, exp_log_fuggveny, trigonometrikus_fuggvenyek, forgastestek, kozepertekek, terfogatszamitas; tests not run (automation policy).
- 2026-01-26: Buff rendszer bővítve (új buffok + feloldási/aktív szabályok + ikon tokenek); buff specifikáció és asset lista dokumentálva; tesztek nem futottak (automation policy).
- 2026-01-26: Character sheet/profile views polished (list wrapping + focus states; results theme overlay + responsive tweaks; achievements card alignment); tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to klasszikus_valoszinuseg, geometriai_valoszinuseg, felteteles_valoszinuseg, statisztika_temazaro, adatok_abrazolasa, kozepertekek, szorodas; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to valstat_modulzaro, kombinatorika_temazaro, permutaciok, variaciok, kombinaciok, binomialis_tetel, valszam_temazaro; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to vektorok, egyenes_egyenlete, kor_egyenlete, alakzatok_metszespontja, tergeometria_temazaro, hasabok_gulak, forgastestek; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to fuggveny_alapok, fuggveny_jellemzes, paritas, fuggveny_transzformaciok, nevezetes_fuggvenyek_temazaro, linearis_fuggveny; tests not run (automation policy).
- 2026-01-25: Mobile module tab layout E2E smoke test added (grid tabs + overflow guard + touch target token); tests not run (automation policy).
- 2026-01-25: Module tab responsive override refined with <=480px grid layout and overflow guards to avoid iframe horizontal scrolling at 360–414px.
- 2026-01-25: Buff catalog config module added (`buffs_config.js`); tests not run (automation policy).
- 2026-01-25: Buff persistence added (progress stores unlocked/active buffs; IPC save hook); tests not run (automation policy).
- 2026-01-25: Buff HUD rendering now draws from buff catalog/progress state with HU tooltips and icon mapping scaffolds; tests not run (automation policy).
- 2026-01-25: XP unit tests added for cap/clamp, reachability, and monotonic curve; tests not run (automation policy).
- 2026-01-25: Settings persistence unit/integration tests added (defaults, save/cancel, round-trip); tests not run (automation policy).
- 2026-01-25: Mobile touch target audit completed; 44px minimum enforced for app shell controls, settings inputs, and module iframe controls (including test pagination dots).
- 2026-01-25: AI TODO refreshed to isolate remaining Desktop V1 systems/quality work; no new critical risks added.
- 2026-01-25: Hungarian consistency sweep completed for app shell/settings/results/character sheet/tooltips/toasts; ASCII fallbacks removed; tests not run (automation policy).
- 2026-01-25: Unit vs E2E npm script split clarified (`npm run test:unit` / `npm run test:e2e`) and documented in `docs/test_strategy.md`.
- 2026-01-25: Module tab responsive override refined to prevent iframe horizontal scrolling at 360–414px.
- 2026-01-25: Mobile Quest Log drawer auto-collapses on small screens, closes after navigation, and hides closed-state shadow/border; header stack spacing refined for phones.
- 2026-01-25: Orientation change handling now restores Quest Log state when moving between portrait/landscape breakpoints.
- 2026-01-25: Compact landscape header height + Quest Log spacing tuned for short-height orientation changes; tests not run (automation policy).
- 2026-01-25: Mobile quest drawer E2E smoke test added (drawer/backdrop visibility + auto-close on navigation).
- 2026-01-25: Teszt/Gyakorlás kérdés-változatosság növelve (teszt pool bővítés, gyakorlás history 12 + retry 24) a gyakori ismétlődés csökkentésére.
- 2026-01-25: Alapozó/Algebra elméleti blokkok bővítve kidolgozott példákkal és diagramokkal.
- 2026-01-25: Localization sweep #1 aligned difficulty phrasing, XP next-level labels, and achievement fallback copy to the glossary.
- 2026-01-25: Results and character sheet enriched with trend summaries and per-topic insights.
- 2026-01-25: Achievementek külön nézetként elérhetők, és új achievement feloldáskor toast értesítés jelenik meg.
- 2026-01-24: Module content alignment audit completed; no mismatches found (see `docs/module_content_audit.md`).
- 2026-01-24: TopicId alias normalization added for legacy `abszolut_ertek_fuggveny` → `specialis_fuggvenyek` to keep progress data aligned with navigation.
- 2026-01-24: XP weight audit completed; corrected Geometria main topic weight in `constitution/curriculum/difficulties.md` to match `constitution/xp/xp_formula.md` (1.2).
- 2026-01-24: Difficulty tag audit completed for test generators; no curriculum mismatches found (see `docs/difficulty_tag_audit.md`).
- 2026-01-24: Added module consistency script (`scripts/check_module_consistency.js`) and usage notes in `docs/module_consistency.md` for tabs and result payload checks.
- 2026-01-24: Documented test execution strategy in `docs/test_strategy.md` (commands, headless/WSL expectations).
- 2026-01-24: E2E randomness seeding documented and wired for deterministic question generation in tests.
- 2026-01-24: Added minimal unit-test coverage targets and generator/helper unit tests; `npm run test` now includes unit + E2E.
- 2026-01-24: Release readiness report added in `docs/release_readiness_report.md`; WSL2 test run recorded in `docs/status.md`.
- 2026-01-25: Responsive breakpoint refinements shipped for tablet/mobile layouts (style + settings overlay tweaks).
- 2026-01-25: Autopilot scripts hardened for Codex flag detection and write-enabled sandboxing; new Desktop V1 P0 checklist + skeleton testing/XP audit docs added.
- 2026-01-25: Automation policy clarified in AGENTS + autopilot prompt; tests are not run automatically.
- 2026-01-25: Unit-test scaffolding added for XP/settings/buffs/character sheet (fixtures + TODO assertions); tests not run.
- 2026-01-25: E2E scaffolding added for settings save/cancel, character sheet panels, and buff tooltips; data-testid hooks added for app shell and character sheet.
- 2026-01-25: XP audit completed (xp_config + XP utilities vs constitution); level-50 total XP mismatch documented in `docs/XP_AUDIT.md` (18,949 in code vs 20,325 in constitution).
- 2026-01-25: XP audit script implemented (`scripts/xp_audit.js`) with scripted metrics added to `docs/XP_AUDIT.md` (level deltas + reachability).
- 2026-01-25: XP cap/clamp behavior implemented; max-level XP total now aligns with the constitution (20,325).
- 2026-01-25: Settings overlay categories wired to state, Save/Cancel flow, and settings persistence (sound + gameplay options now stored).
- 2026-01-25: Character sheet layout panels aligned with fixed sizing and internal scroll regions (tabs + achievements).
- 2026-01-25: Character sheet UX updated with glossary-aligned labels, quest/achievement empty states, and keyboard tab focus handling.
- 2026-01-25: Responsive breakpoint re-validation updated header column sizing to preserve the 5% HUD layout with minimum widths for tablet/mobile.
- 2026-01-25: AI TODO refocused on theory expansion; THEORY_TEMPLATE + glossary updated; no new critical bugs logged.
- 2026-01-25: THEORY_TEMPLATE + Hungarian consistency sweep applied to Alapozó modulzáró/témazáró and Halmaz/logika témakörök; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to oszthatosag, lnko_lkkt, primtenyezok, szamrendszerek, racionalis_szamok_temazaro, tortek; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to tizedes_tortek, szazalekszamitas, hatvany_temazaro, hatvanyozas, gyokvonas, logaritmus; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to algebra_modulzaro, algebrai_kif_temazaro, polinomok, nevezetes_azonossagok, algebrai_tortek, egyenletek_temazaro; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to linearis_egyenletek, masodfoku_egyenlet, viete_formulak, parameteres_masodfoku, specialis_egyenletek, fuggvenyek_alt_temazaro; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to masodfoku_fuggveny, hatvanyfuggvenyek, exp_log_fuggveny, trigonometrikus_fuggvenyek, specialis_fuggvenyek, linearis_fuggveny; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to hatarertek, derivalt_fogalma, derivalasi_szabalyok, fuggvenyvizsgalat, integral_temazaro, hatarozatlan_integral; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to geometria_modulzaro, haromszogek_temazaro, nevezetes_vonalak, haromszog_egyenlotlenseg, szogtetelek, szinusz_koszinusz_tetel; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to sokszogek_temazaro, terulet_kerulet, specialis_negyszogek, kor_temazaro, keruleti_szogek, latokoriv; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to kor_helyzetek, geo_transzform_temazaro, tukrozes, eltolas_forgatas, hasonlosag, koordinatageometria_temazaro; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to emelt_modulzaro, sorozatok_temazaro, szamtani_mertani, kamatoskamat, konvergencia, differencial_temazaro; tests not run (automation policy).
- 2026-01-26: THEORY_TEMPLATE + Hungarian consistency sweep applied to hatarozott_integral, newton_leibniz, terfogatszamitas, hatarozatlan_integral, derivalt_fogalma, hatarertek; tests not run (automation policy).
- 2026-01-26: Settings menu cleanup (labels, focus order, glossary alignment) applied to settings/results/achievements modules; tests not run (automation policy).
- 2026-01-26: XP gyakorlás szöveg frissítve a maximális XP/pacing jelzésére (halmazmuveletek, linearis_egyenletek, linearis_fuggveny, terulet_kerulet, permutaciok, derivalt_fogalma); tesztek nem futottak (automation policy).
- 2026-01-26: Mobile app shell + Quest Log drawer re-validation (Quest Log sorok tördelése + quick link középre igazítás); tesztek nem futottak (automation policy).
- 2026-01-26: Mobile module tab overflow + touch target audit applied (halmazmuveletek, polinomok, kor_helyzetek, vektorok, permutaciok, hatarozott_integral); tesztek nem futottak (automation policy).
