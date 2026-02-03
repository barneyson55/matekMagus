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

- [x] UI-BUFF-001: Fix header buff tooltip hover positioning (spec: docs/tasks/UI-BUFF-001.md)

- [x] MOBILE-006: Persist UserProfile locally (SharedPreferences-backed UserRepository) (spec: docs/tasks/MOBILE-006.md)
- [x] DESKTOP-ARCH-001: Extract progress.json persistence into ProgressRepository (sync-ready) (spec: docs/tasks/DESKTOP-ARCH-001.md)
- [x] SYNC-001: Define sync contract (Firestore schema + conflict rules) (spec: docs/tasks/SYNC-001.md)
- [x] SYNC-002: Implement pure merge/resolve helpers + tests (desktop-first) (spec: docs/tasks/SYNC-002.md)
- [x] HEALTH-001: Add scripts/check_all.sh to run Node + Flutter checks in WSL (spec: docs/tasks/HEALTH-001.md)
Last updated: 2026-02-03

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

- [x] (meta) Remaining Windows release tasks moved out of ai_todo (manual/backlog).
## V2 / Mobile (later)
- [x] (meta) V2 mobile backlog moved to docs/ai_backlog.md.
