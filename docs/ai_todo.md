# AI TODO

Last updated: 2026-01-25

## DESKTOP V1 — SYSTEMS & QUALITY (P0)
- [ ] Generate unit-test scaffolding in `tests/unit/` for XP, settings persistence, buffs, and character sheet rendering (fixtures/mocks + TODO assertions; no execution).
- [ ] Generate E2E scaffolding in `tests/e2e/` for settings save/cancel, character sheet panels, and buff tooltips; add `data-testid` hooks where missing.
- [ ] XP audit: compare `xp_config.js` + XP utilities against `constitution/xp/xp_formula.md` and `constitution/xp/xp_roadmap.md`; record deltas in `docs/XP_AUDIT.md`.
- [ ] XP audit: implement `scripts/xp_audit.js` to compute per-level XP deltas, total XP to max, and reachability with current reward sources; write findings to `docs/XP_AUDIT.md`.
- [ ] XP audit: define explicit max level and XP cap/clamp behavior in code + docs (update `xp_config.js` and any XP helpers).
- [ ] XP tests: add unit tests for max-level reachability, cap/clamp behavior, and monotonic XP curve progression.
- [ ] Settings completion: wire all settings categories (Skin & Téma, UI & Hozzáférhetőség, Hang & Visszajelzés, Játékélmény & Segítség) to state, Save/Cancel flow, and persistence.
- [ ] Settings persistence tests: add unit/integration tests for defaults, Save/Cancel behavior, and persistence round-trips.
- [ ] Character sheet layout: fix panel sizing/overflow, scroll regions, and header alignment per `constitution/structure/character-sheet.md`.
- [ ] Character sheet UX: normalize labels to the localization glossary, add empty states for achievements/quests, and ensure sane keyboard focus order.
- [ ] Buff system: define a buff catalog (id, HU name, description, icon token, unlock rule) in a single config module.
- [ ] Buff system persistence: store unlocked/active buffs in the progress state and load/save through the persistence layer.
- [ ] Buff rendering: render buff icons in the HUD, add Hungarian tooltips, and add unit/E2E scaffolding for icon mapping.
- [ ] Full Hungarian consistency sweep: audit app shell, settings, character sheet, results, tooltips, and toasts against `docs/localization_glossary.md`; fix remaining English/ASCII fallbacks.

## V2 / MOBILE (later)
- [ ] Re-validate responsive breakpoints in `style.css` for tablet/mobile widths.
- [ ] Mobile Quest Log drawer behavior and header stacking polish.
- [ ] Module tab wrapping/scrolling on small screens; remove iframe horizontal scroll at 360–414px.
- [ ] Touch target audit for mobile (44px minimum across controls).
- [ ] Orientation change checks (portrait/landscape) for header + Quest Log.
- [ ] Add mobile-focused smoke tests or E2E coverage.
