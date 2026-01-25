# Critical TODO / Risks

Last reviewed: 2026-01-25 (Bug triage log initialized)

## Bug Triage Log

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

- [MINOR] Windows renderer glyph rendering for Quest Log disclosure arrows unverified
  - Repro steps:
    1. Launch the app on Windows.
    2. Open the Quest Log and expand/collapse items.
    3. Observe the disclosure arrow glyphs (▶/▼).
  - Expected: Arrow glyphs render consistently with UTF-8 styling.
  - Actual: Not yet verified on Windows.
  - Notes: Minor visual risk; confirm during Windows validation.

## Notes

- 2026-01-25: Mobile touch target audit completed; 44px minimum enforced for app shell controls, settings inputs, and module iframe controls.
- 2026-01-25: Module tab responsive override refined to prevent iframe horizontal scrolling at 360–414px.
- 2026-01-25: Mobile Quest Log drawer auto-collapses on small screens and closes after navigation; header stack spacing refined for phones.
- 2026-01-25: Orientation change handling now restores Quest Log state when moving between portrait/landscape breakpoints.
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
