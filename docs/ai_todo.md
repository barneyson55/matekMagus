# AI TODO

Last updated: 2026-01-28

## Desktop Release (Windows)
- [ ] HU consistency sweep (mandatory) across app shell, settings, results, character sheet, and modules (align with `docs/localization_glossary.md`).
- [ ] Run `node scripts/check_module_consistency.js` and fix any tab/payload mismatches it reports.
- [ ] Verify module tab labels and quest copy are consistent with constitution wording (Elmélet/Vizuális modell/Teszt/Gyakorlás, Küldetés elfogadása).
- [ ] Settings overlay final polish (spacing, focus order, labels, keyboard access).
- [ ] Character sheet final polish (layout balance, empty states, keyboard focus).
- [ ] Buffs HUD finalization (icon alignment, tooltips, unlock/active states).
- [ ] Verify Quest Log states and visuals match constitution (NOT_ACCEPTED/ACTIVE/COMPLETED + green check).
- [ ] Verify XP header values + level names against constitution; update `docs/XP_AUDIT.md` if needed.
- [ ] Windows manual click-through checklist (app shell, module load, navigation, settings, results, achievements).
- [ ] Windows smoke run (manual) for app shell + module load + navigation; record in `docs/status.md`.
- [ ] Run Windows E2E tests (`npm run test:e2e`) and record results in `docs/status.md`.
- [ ] Build Windows installer artifacts (`npm run dist:win`) and verify `dist/` outputs.
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
