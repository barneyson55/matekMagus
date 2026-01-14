# TODO (execution order)

1. Constitution source of truth cleanup
   - DONE: Update `constitution/README.md` to match the real structure (no skins/).
   - DONE: Align XP award rule (first success + grade-improvement delta only).
   - DONE: Align difficulty naming to `könnyű / normál / nehéz`.
   - DONE: Remove/replace references to missing `style-const.md` and skins in style docs.
   - DONE: Complete `constitution/style/ui-elements.md`.
   - DONE: Confirm test layout spec gaps: question count, no topic selector at topic level,
     and alt/main topic test flow + pagination behavior.
   - Confirm quest log hierarchy expectations vs missing main/sub topic modules.

2. XP + level system alignment (spec -> code)
   - Implement XP formula from `constitution/xp/xp_formula.md` in `main.js`.
   - Replace current linear level rules with `constitution/xp/xp_roadmap.md` thresholds and names.
   - Update IPC responses and UI labels to match the new level naming and thresholds.
   - Add automated tests for XP math and level thresholds.

3. Progress tracking data model
   - Align `progress.json` with `constitution/structure/progress-tracking.md`:
     - structured results (attempts, best grades, per topic/difficulty),
     - quest state per main/sub/topic,
     - practice stats, achievements state.
   - Add migration/compat layer to keep existing saves valid.
   - Add automated tests for data migration and summary calculations.

4. Quest lifecycle and hierarchy status
   - Implement quest status rules from `constitution/structure/module-lifecycle.md`:
     - main/sub/topic aggregation, not just per topic.
   - Update quest log indicators and status circles to reflect aggregated state.
   - Add automated tests for status transitions (NOT_ACCEPTED -> ACTIVE -> COMPLETED).

5. Settings overlay + theme tokens
   - Ensure settings apply consistently to main UI and iframe modules.
   - Ensure Save/Cancel behavior matches `constitution/structure/settings-overlay.md`.
   - Confirm overlay close behaviors (X, ESC, overlay click) match spec.
   - Add automated tests for settings persistence and iframe styling.

6. Practice engine consistency
   - Unify practice flow with `constitution/structure/practice-enginge.md`:
     - randomization, non-repeat logic, answer normalization,
       auto-advance timing, and XP rewards by difficulty.
   - Add automated tests for generator output and XP awards.

7. Test UI standardization
   - Align all test tabs to the same layout:
     - difficulty selector,
     - pagination dots with arrows on the same row,
     - prompt block,
     - finish/evaluate button at bottom.
   - Fix any module still deviating (confirm `modules/halmazmuveletek.html`,
     `modules/linearis_fuggveny.html`, `modules/logikai_szita.html`).
   - Add automated tests for navigation and submission flow.

8. Achievements + character sheet + results
   - Implement persistent achievements per `constitution/achievements/README.md`.
   - Drive character sheet stats from stored progress instead of mock rules.
   - Ensure results/character sheet reflect real progress and quests.
   - Add automated tests for achievements and summary views.

9. Module backlog (start after core systems)
   - Implement missing modules from `constitution/curriculum/roadmap.md`.
   - First target: `modules/skatulya_elv.html` (Alapozo -> Gondolkodasi modserek, Halmazok).
   - Keep module structure consistent with spec and existing templates.

10. Cleanup and deprecation
   - Remove or hide legacy modules that are no longer needed (e.g. `modules/xp_guide.html`).
   - Re-audit unused assets and confirm no dead links in `index.html`.

Notes:
- This list is ordered. We should finish each item (including tests) before moving to the next.
