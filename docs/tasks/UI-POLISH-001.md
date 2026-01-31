# UI-POLISH-001 — Safe base UI stylesheet + formatting automation

## Goal
Create a minimal, safe “base UI style” that improves consistency without breaking existing module layouts.
Also add formatting automation to keep HTML/CSS/JS clean.

## Constraints
- Keep changes low-risk: don’t redesign; just unify typography, spacing defaults, and fix obvious CSS hazards (overflow, unreadable fonts).
- Formatting should not reformat the whole repo in one go. Only format files touched by this task (or a small allowlist).
- No functional changes to business logic.

## Implementation plan (when the autopilot executes this task)
1) Locate where UI HTML lives:
   - modules/**/*.html or docs-like content used inside the app
   - main index page / shell page (renderer entry)
2) Add a base stylesheet, prefer one of:
   - assets/styles/base.css
   - or existing global CSS folder if present
   Base CSS should:
   - set a sane font stack
   - set background/foreground defaults
   - ensure buttons/inputs have consistent baseline
   - prevent horizontal overflow (e.g. `body { overflow-x: hidden; }` only if safe)
3) Ensure all renderer entry points load this base CSS:
   - Add `<link rel="stylesheet" href=".../base.css">`
   - Keep relative paths correct.
4) Add formatting tool:
   - Add Prettier (dev dependency) if not present.
   - Add scripts:
     - `format` (formats a small allowlist or staged/touched files)
     - `format:check` (CI-safe)
   - Add a minimal `.prettierrc` and `.prettierignore`.
5) Add a small “UI sanity check” script:
   - `npm run ui:check` should run at least: `format:check` and tests later.
   - In this task, set up the script and wire it to the next tasks.

## Definition of Done
- There is a base stylesheet and it is loaded by the renderer entry points.
- No visible dev-only header/menu is introduced (that’s UI-PROD-001 anyway).
- Formatting scripts exist and run successfully.
- Diff size is controlled (not a full-repo reformat).

## Verification (later)
- `npm run format:check` passes.
- Launch app in dev mode; UI is not broken (manual quick check).
