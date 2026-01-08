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
