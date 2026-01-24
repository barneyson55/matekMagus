# Critical TODO / Risks

Last reviewed: 2026-01-24 (Bug triage log initialized)

## Bug Triage Log

- [BLOCKER] Curriculum module coverage incomplete (geometry/probability/statistics/advanced topics missing)
  - Repro steps:
    1. Launch the app.
    2. Open the Quest Log.
    3. Compare available modules to `constitution/curriculum/roadmap.md`.
    4. Note missing Geometry/Valószínűség–Statisztika/Emelt topic modules in navigation or `modules/`.
  - Expected: All roadmap topics have matching modules with theory/test/practice tabs.
  - Actual: Multiple modules are missing beyond the triangle-related topics.
  - Inventory: Detailed missing-module list captured in `docs/module_coverage.md` (2026-01-24).
  - Notes: Release blocker due to curriculum coverage gaps.

- [MAJOR] Windows native smoke tests not executed/logged
  - Repro steps:
    1. On a Windows machine, run `npm run test:e2e`.
    2. Capture results and update `docs/status.md`.
  - Expected: Windows smoke test results are recorded.
  - Actual: No Windows run logged; results unknown.
  - Notes: Verification gap that could hide platform regressions.

- [MINOR] Windows renderer glyph rendering for Quest Log disclosure arrows unverified
  - Repro steps:
    1. Launch the app on Windows.
    2. Open the Quest Log and expand/collapse items.
    3. Observe the disclosure arrow glyphs (▶/▼).
  - Expected: Arrow glyphs render consistently with UTF-8 styling.
  - Actual: Not yet verified on Windows.
  - Notes: Minor visual risk; confirm during Windows validation.

## Notes

- 2026-01-24: Module content alignment audit completed; no mismatches found (see `docs/module_content_audit.md`).
- 2026-01-24: TopicId alias normalization added for legacy `abszolut_ertek_fuggveny` → `specialis_fuggvenyek` to keep progress data aligned with navigation.
- 2026-01-24: XP weight audit completed; corrected Geometria main topic weight in `constitution/curriculum/difficulties.md` to match `constitution/xp/xp_formula.md` (1.2).
- 2026-01-24: Difficulty tag audit completed for test generators; no curriculum mismatches found (see `docs/difficulty_tag_audit.md`).
- 2026-01-24: Added module consistency script (`scripts/check_module_consistency.js`) and usage notes in `docs/module_consistency.md` for tabs and result payload checks.
- 2026-01-24: Documented test execution strategy in `docs/test_strategy.md` (commands, headless/WSL expectations).
- 2026-01-24: E2E randomness seeding documented and wired for deterministic question generation in tests.
- 2026-01-24: Added minimal unit-test coverage targets and generator/helper unit tests; `npm run test` now includes unit + E2E.
- 2026-01-24: Release readiness report added in `docs/release_readiness_report.md`; WSL2 test run recorded in `docs/status.md`.
