# MatekMagus - Mandatory Constitution Scan

Before any code change or design decision, read the constitution docs listed below. This is required for every change.

Constitution map (what lives where):
- constitution/README.md: overview of intent + expected sections.
- constitution/structure/: app shell, navigation flow, module view, module lifecycle, quest log, practice engine, progress tracking, persistence/sync, xp system, settings overlay, character sheet.
  - Files: app-shell.md, navigation-flow.md, module-view.md, module-lifecycle.md, quest-log.md,
    practice-enginge.md (filename typo), progress-tracking.md, persistence-and-sync.md,
    xp-system.md, settings-overlay.md, character-sheet.md.
- constitution/style/: visual system rules for app shell, colors/themes, typography/icons, UI elements, quest log.
  - Files: app-shell.md, colors-and-themes.md, typography-and-icons.md, ui-elements.md, quest-log.md.
- constitution/xp/: XP formulas + roadmap.
  - Files: xp_formula.md, xp_roadmap.md.
- constitution/curriculum/: topic roadmap + difficulty notes.
  - Files: roadmap.md, difficulties.md.
- constitution/achievements/: achievements overview (README.md).

Required pre-checks by change type:
- App shell / layout / navigation: structure/app-shell.md + structure/navigation-flow.md + style/app-shell.md.
- Module view (tabs, headers, accept button, test/practice structure): structure/module-view.md + structure/module-lifecycle.md.
- Practice/test logic and XP: structure/practice-enginge.md + structure/xp-system.md + style/ui-elements.md.
- Quest log UI/state: structure/quest-log.md + style/quest-log.md.
- Settings / themes: structure/settings-overlay.md + style/colors-and-themes.md + style/typography-and-icons.md.
- Progress + persistence: structure/progress-tracking.md + structure/persistence-and-sync.md.
- XP formulas + level names: xp/xp_formula.md + xp/xp_roadmap.md.
- Curriculum alignment: curriculum/roadmap.md + curriculum/difficulties.md.
- Character sheet/results: structure/character-sheet.md.

Rule of precedence: if code conflicts with constitution, update code to match the constitution.

---

# Autopilot Workflow

## Project Goal
Matek Mester is an Electron-based, modular math learning app for Hungarian students.
It covers foundations through advanced topics with theory, visual models, tests, and practice modules.

## Non-negotiables
- Keep changes small and incremental.
- Prefer minimal dependencies; ask before adding new ones.
- Always update `docs/status.md` and `docs/ai_todo.md` at end of each task.
- Never commit secrets; only `.env.example` if needed.

## Quality Gates
- Tests: `npm run test` (alias) and `npm run test:e2e`
- Lint: TBD (no lint script found)
- Format: TBD (no format script found)
- Build: TBD (no build script found)
- Minimum verify when needed: `npm install` then `npm run test`
- In WSL or other headless environments, E2E (Playwright + Electron) tests may be skipped or treated as expected failures.
- Automation policy: do not run tests automatically; only generate/update them. Record skipped runs in `docs/status.md`.


## Task Protocol
1) Read `docs/SPEC.md` + `docs/ACCEPTANCE.md` + `docs/critical_todo.md`
2) Pick top unchecked item from `docs/ai_todo.md`
3) Implement
4) Run quality gates only when explicitly requested; otherwise skip and note in `docs/status.md`
5) Update `docs/status.md` + `docs/ai_todo.md` + `docs/critical_todo.md`
6) If user decision needed: write into `docs/user_todo.md` and STOP
