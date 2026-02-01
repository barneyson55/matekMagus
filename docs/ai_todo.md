# AI TODO

## Next Autopilot Batch (UI + Tests)
- [x] UI-PROD-001: Hide default app menu + dev shortcuts in packaged builds (spec: docs/tasks/UI-PROD-001.md)
- [x] UI-POLISH-001: Add safe base UI stylesheet + formatting automation (spec: docs/tasks/UI-POLISH-001.md)
- [x] TEST-SETUP-001: Establish deterministic test harness + npm scripts (spec: docs/tasks/TEST-SETUP-001.md)
- [x] TEST-UNIT-001: Write unit tests for core logic (spec: docs/tasks/TEST-UNIT-001.md)
- [x] TEST-E2E-001: Write Electron E2E smoke tests (spec: docs/tasks/TEST-E2E-001.md)
- [x] CI-001: Add GitHub Actions CI for lint + tests (spec: docs/tasks/CI-001.md)

- [x] MOBILE-001: Mobile baseline + WSL headless checks (spec: docs/tasks/MOBILE-001.md)
- [x] MOBILE-003: Domain models + repository interfaces (no Firebase) (spec: docs/tasks/MOBILE-003.md)
- [x] MOBILE-004: AppState + Provider wiring (spec: docs/tasks/MOBILE-004.md)
- [x] MOBILE-005: Offline detection + banner (spec: docs/tasks/MOBILE-005.md)

Last updated: 2026-02-01

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
- [ ] Build Windows installer artifacts (`npm run dist:win`) and verify `dist/` outputs. (Blocked: `winCodeSign` extraction failed with "Cannot create symbolic link" due to missing symlink privilege on 2026-01-31; enable Windows Developer Mode or run the build in an elevated terminal. Also blocked here because `electron-builder` is not installed; `NPM_CONFIG_CACHE=/tmp/npm-cache npm install --no-fund --no-audit --prefer-offline` timed out again on 2026-02-01; `npm run dist:win` still fails and `dist/` is missing.)
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
