# AI TODO

Last updated: 2026-01-27

## Desktop Release (Windows)
- [ ] Final HU consistency sweep (mandatory) across app shell, settings, results, character sheet, and modules (align with `docs/localization_glossary.md`).
- [ ] Module integrity quick scan: confirm every module has matching `.html` + `.js` and base structure matches constitution phrasing (Elmelet / Vizualis modell / Teszt / Gyakorlas).
- [ ] Run `node scripts/check_module_consistency.js` and fix any tab/payload mismatches it reports.
- [ ] Verify module tab labels and quest copy are consistent with constitution wording (Elmelet/Vizualis modell/Teszt/Gyakorlas, Kuldetes elfogadasa).
- [ ] Settings overlay final polish (spacing, focus order, labels, keyboard access).
- [ ] Character sheet final polish (layout balance, empty states, keyboard focus).
- [ ] Buffs HUD finalization (icon alignment, tooltips, unlock/active states).
- [ ] Verify XP header values + level names against constitution; update `docs/XP_AUDIT.md` if needed.
- [ ] Verify Quest Log states and visuals match constitution (NOT_ACCEPTED/ACTIVE/COMPLETED + green check for completed).
- [ ] Windows smoke run (manual) for app shell + module load + navigation.
- [ ] Run Windows manual release checklist (`docs/RELEASE_CHECKLIST.md`) and record results in `docs/status.md`.
- [ ] Run Windows E2E tests (`npm run test:e2e`) and record results in `docs/status.md`.
- [ ] Packaging tool decision and approval (electron-builder recommended).
- [ ] Add `electron-builder` devDependency (after approval).
- [ ] Add packaging config (appId/productName/icon/output/targets) via `electron-builder.yml` or `package.json` `build` block.
- [ ] Add packaging scripts to `package.json` (e.g., `pack` and `dist`).
- [ ] Build Windows installer + portable and verify artifacts in `dist/`.
- [ ] Verify packaged app launch + progress persistence (installer and portable).
- [ ] Update `docs/release_readiness_report.md` with Windows packaging/test outcomes.
- [ ] Create release notes from `docs/RELEASE_NOTES_TEMPLATE.md` and bump `package.json` version.

## V2 / Mobile (later)
- [ ] Mobile app shell + Quest Log drawer re-validation on small screens.
- [ ] Mobile module tab overflow + touch target audit.
- [ ] Orientation-change regression checks (portrait/landscape).
- [ ] Mobile E2E coverage expansion for Quest Log drawer + module tabs.
- [ ] Responsive QA sweep across representative modules.
