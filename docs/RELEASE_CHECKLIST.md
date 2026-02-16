# Release Checklist (Manual Smoke Test)

Use this checklist for a fast, manual smoke test of the Electron app before a release.
Keep notes for any failures (steps, expected vs actual, logs/screenshots if needed).

## Test metadata
- Date:
- Tester:
- OS / environment:
- App build/branch:
- Notes:

## Preflight
- [ ] If you need a clean state, point `MATEK_MESTER_USER_DATA` to a fresh folder or remove `progress.json` and `settings.json` from the Electron userData path.
- [ ] Launch the app from the intended build (not from a dev hot-reload window).

## Launch
- [ ] App launches without crash and shows the main shell (header, quest log, main content).
- [ ] Header shows app name, XP bar, avatar, and hamburger toggle.
- [ ] Quest Log is visible and lists modules plus the `Eredmenyeim` button.
- [ ] Settings FAB (gear) is visible in the bottom-right corner.

## Navigation (Quest Log + Character Sheet)
- [ ] Hamburger toggles Quest Log open/closed without layout glitches.
- [ ] Clicking a module in the Quest Log loads the correct module in the iframe.
- [ ] If the module is not accepted, the `Küldetés elfogadása` button is visible.
- [ ] Accepting a quest updates the Quest Log state (active styling).
- [ ] Clicking the avatar opens the Character Sheet in the main content area.
- [ ] Selecting a module from the Quest Log returns from Character Sheet to module view.

## Module tabs
- [ ] Module view shows tabs for `Elmélet`, `Vizuális modell`, `Teszt`, `Gyakorlás`.
- [ ] Switching tabs changes only the main content area and keeps the shell intact.
- [ ] Tab buttons remain usable on smaller widths (wrap or scroll without overlap).

## Tests (Teszt)
- [ ] Start a test in a module and answer at least one question.
- [ ] Submitting shows a result/grade and XP feedback.
- [ ] The result is saved and appears in `Eredmenyeim`.

## Practice (Gyakorlás)
- [ ] Start a practice session and verify feedback for correct/incorrect answers.
- [ ] XP updates are reflected in the header after practice.
- [ ] Practice completion is saved and appears in `Eredmenyeim` (if applicable).

## Results (Eredmenyeim)
- [ ] `Eredmenyeim` opens and loads results without errors.
- [ ] Latest test/practice results are visible and formatted correctly.
- [ ] Returning to a module preserves the results state.

## Settings
- [ ] Open Settings overlay with the FAB; focus moves into the dialog.
- [ ] Switch between settings categories (Theme/UI/Sound/Gameplay) without errors.
- [ ] Adjust at least one theme value and click `Mentes`.
- [ ] Settings apply to the shell and iframe content.
- [ ] Close and reopen the app; settings persist.

## Persistence
- [ ] Close and reopen the app; quest states and XP persist.
- [ ] `Eredmenyeim` still shows the latest saved results.
- [ ] `progress.json` and `settings.json` update in the Electron userData folder.

## Issues found
- [ ] None
- Notes:
