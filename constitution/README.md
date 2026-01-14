# Constitution Folder

This folder holds design and specification docs for MatekMagus. These files guide
implementation and are not shipped with the final build.

## Purpose
- Provide a single source of truth for structure, flow, and UI behavior.
- Define XP, level, quest lifecycle, and curriculum scope.
- Keep visuals consistent across themes.

## Structure
- xp/: XP and level system docs
  - xp_formula.md
  - xp_roadmap.md
- achievements/: Achievement plan
  - README.md
- curriculum/: Curriculum hierarchy and difficulty weights
  - roadmap.md
  - difficulties.md
- structure/: App shell, navigation, module lifecycle, progress tracking
  - app-shell.md
  - navigation-flow.md
  - module-view.md
  - module-lifecycle.md
  - quest-log.md
  - settings-overlay.md
  - xp-system.md
  - practice-enginge.md
  - progress-tracking.md
  - persistence-and-sync.md
  - character-sheet.md
- style/: Visual style rules and tokens
  - app-shell.md
  - colors-and-themes.md
  - quest-log.md
  - typography-and-icons.md
  - ui-elements.md

Notes:
- The xp docs above replace older "xp_progress_plan" and "level_names" files.
- There is no skins/ directory; theme tokens live in style/.
