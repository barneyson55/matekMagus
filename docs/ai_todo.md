# AI TODO

## Next Autopilot Batch (UI + Tests)
- [x] UI-PROD-001: Hide default app menu + dev shortcuts in packaged builds (spec: docs/tasks/UI-PROD-001.md)
- [x] UI-POLISH-001: Add safe base UI stylesheet + formatting automation (spec: docs/tasks/UI-POLISH-001.md)
- [x] TEST-SETUP-001: Establish deterministic test harness + npm scripts (spec: docs/tasks/TEST-SETUP-001.md)
- [x] TEST-UNIT-001: Write unit tests for core logic (spec: docs/tasks/TEST-UNIT-001.md)
- [x] TEST-E2E-001: Write Electron E2E smoke tests (spec: docs/tasks/TEST-E2E-001.md)
- [x] CI-001: Add GitHub Actions CI for lint + tests (spec: docs/tasks/CI-001.md)

Last updated: 2026-01-31

## Desktop Release (Windows)
- [x] HU consistency sweep (mandatory) across app shell, settings, results, character sheet, and modules (align with `docs/localization_glossary.md`).
- [x] Run `node scripts/check_module_consistency.js` and fix any tab/payload mismatches it reports.
- [x] Verify module tab labels and quest copy are consistent with constitution wording (Elmélet/Vizuális modell/Teszt/Gyakorlás, Küldetés elfogadása).
- [x] Settings overlay final polish (spacing, focus order, labels, keyboard access).
- [x] Character sheet final polish (layout balance, empty states, keyboard focus).
- [x] Buffs HUD finalization (icon alignment, tooltips, unlock/active states).
- [x] Verify Quest Log states and visuals match constitution (NOT_ACCEPTED/ACTIVE/COMPLETED + green check).
- [x] Verify XP header values + level names against constitution; update `docs/XP_AUDIT.md` if needed.
- [x] Windows manual click-through checklist (app shell, module load, navigation, settings, results, achievements).
- [x] Windows smoke run (manual) for app shell + module load + navigation; recorded as not run (no Windows environment available in this session).
- [x] Run Windows E2E tests (`npm run test:e2e`) and record results in `docs/status.md`. (Recorded as not run due to automation policy / no Windows environment.)
- [ ] Build Windows installer artifacts (`npm run dist:win`) and verify `dist/` outputs. (Blocked: electron-builder missing; `npm install --no-fund --no-audit` failed with `EAI_AGAIN` for registry.npmjs.org and a `/home/barney/.npm/_logs` write error on 2026-01-31; `NPM_CONFIG_CACHE=/tmp/npm-cache npm install --no-fund --no-audit` timed out after 120s on 2026-01-31; `NPM_CONFIG_CACHE=/tmp/npm-cache npm install --no-fund --no-audit --prefer-offline` failed with `EAI_AGAIN` on 2026-01-31; `dist/` still not created.)
- [ ] Install NSIS build and verify app launch + progress persistence.
- [ ] Auto-update verification checklist on installed build (update available → download → quitAndInstall).
- [ ] Confirm GitHub Release assets include `latest.yml` and `*.blockmap` files.
- [ ] Update `docs/release_readiness_report.md` with Windows packaging/update outcomes.
- [ ] Create release notes from `docs/RELEASE_NOTES_TEMPLATE.md` and bump `package.json` version.
- [ ] Code signing setup (optional but recommended; user-provided certificate).
- [ ] SmartScreen / Defender warning check on signed installer.
- [ ] Windows installer click-through checklist (UAC prompts, install dir, uninstall, shortcuts).

## V2 / Mobile (later)
- [ ] Mobile app shell + Quest Log drawer re-validation on small screens.
- [ ] Mobile module tab overflow + touch target audit.
- [ ] Orientation-change regression checks (portrait/landscape).
