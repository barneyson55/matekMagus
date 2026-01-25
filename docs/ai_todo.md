# AI TODO

Last updated: 2026-01-25

## DESKTOP V1 — SYSTEMS & QUALITY (P0)
- [x] Generate unit-test scaffolding in `tests/unit/` for XP, settings persistence, buffs, and character sheet rendering (fixtures/mocks + TODO assertions; no execution).
- [x] Generate E2E scaffolding in `tests/e2e/` for settings save/cancel, character sheet panels, and buff tooltips; add `data-testid` hooks where missing.
- [x] XP audit: compare `xp_config.js` + XP utilities against `constitution/xp/xp_formula.md` and `constitution/xp/xp_roadmap.md`; record deltas in `docs/XP_AUDIT.md`.
- [x] XP audit: implement `scripts/xp_audit.js` to compute per-level XP deltas, total XP to max, and reachability with current reward sources; write findings to `docs/XP_AUDIT.md`.
- [x] XP audit: define explicit max level and XP cap/clamp behavior in code + docs (update `xp_config.js` and any XP helpers).
- [x] XP tests: add unit tests for max-level reachability, cap/clamp behavior, and monotonic XP curve progression.
- [x] Settings completion: wire all settings categories (Skin & Téma, UI & Hozzáférhetőség, Hang & Visszajelzés, Játékélmény & Segítség) to state, Save/Cancel flow, and persistence.
- [x] Settings persistence tests: add unit/integration tests for defaults, Save/Cancel behavior, and persistence round-trips.
- [x] Character sheet layout: fix panel sizing/overflow, scroll regions, and header alignment per `constitution/structure/character-sheet.md`.
- [x] Character sheet UX: normalize labels to the localization glossary, add empty states for achievements/quests, and ensure sane keyboard focus order.
- [x] Buff system: define a buff catalog (id, HU name, description, icon token, unlock rule) in a single config module.
- [x] Buff system persistence: store unlocked/active buffs in the progress state and load/save through the persistence layer.
- [x] Buff rendering: render buff icons in the HUD, add Hungarian tooltips, and add unit/E2E scaffolding for icon mapping.
- [x] Full Hungarian consistency sweep: audit app shell, settings, character sheet, results, tooltips, and toasts against `docs/localization_glossary.md`; fix remaining English/ASCII fallbacks.

## V2 / MOBILE (later)
- [x] Re-validate responsive breakpoints in `style.css` for tablet/mobile widths.
- [x] Mobile Quest Log drawer behavior and header stacking polish.
- [x] Module tab wrapping/scrolling on small screens; remove iframe horizontal scroll at 360–414px.
- [x] Touch target audit for mobile (44px minimum across controls).
- [x] Orientation change checks (portrait/landscape) for header + Quest Log.
- [x] Add mobile-focused smoke tests or E2E coverage.
