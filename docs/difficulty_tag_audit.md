# Difficulty Tag Review (2026-01-24)

## Scope
- Reviewed all topic modules with test generators in `modules/` (both inline-script HTML modules and .js-backed modules).
- Verified selected difficulty tags (konnyu/normal/nehez) are passed into test generation and influence question pools and/or numeric ranges.
- Cross-referenced topicWeight expectations against `constitution/curriculum/difficulties.md` and `xp_config.js`.

## Findings
- All reviewed modules pass the selected difficulty into `buildTestQuestions` / `buildQuestion` and adjust question pools or parameter ranges.
- Modules with identical question pools across difficulty tiers (difficulty scaling is handled by numeric ranges):
  - algebrai_tortek
  - masodfoku_egyenlet
  - tizedes_tortek
  - tortek
- Inline-script modules use difficulty configs for numeric ranges:
  - halmazmuveletek
  - linearis_fuggveny
  - lnko_lkkt
  - logikai_szita
  - oszthatosag
  - primtenyezok
  - skatulya_elv
  - szamrendszerek

## Notes
- No mismatches found between curriculum difficulty weights and in-module difficulty scaling.
- If needed later, consider adding hard-only question types for the four modules listed above to further separate normal vs hard.
