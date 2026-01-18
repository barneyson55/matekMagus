# TODO (execution order)

1. Constitution source of truth cleanup
   - DONE: Update `constitution/README.md` to match the real structure (no skins/).
   - DONE: Align XP award rule (first success + grade-improvement delta only).
   - DONE: Align difficulty naming to `könnyű / normál / nehéz`.
   - DONE: Remove/replace references to missing `style-const.md` and skins in style docs.
   - DONE: Complete `constitution/style/ui-elements.md`.
   - DONE: Confirm test layout spec gaps: question count, no topic selector at topic level,
     and alt/main topic test flow + pagination behavior.
   - DONE: Confirm quest log hierarchy expectations vs missing main/sub topic modules
     (spec requires main/sub/topic hierarchy; current code only has topic-level modules,
     missing main/sub views to be handled in items 4 and 9).

2. XP + level system alignment (spec -> code)
   - DONE: Implement XP formula from `constitution/xp/xp_formula.md` in `main.js`.
   - DONE: Replace current linear level rules with `constitution/xp/xp_roadmap.md` thresholds and names.
   - DONE: Update IPC responses and UI labels to match the new level naming and thresholds.
   - DONE: Add automated tests for XP math and level thresholds.

3. Progress tracking data model
   - DONE: Align `progress.json` with `constitution/structure/progress-tracking.md`:
     - structured results (attempts, best grades, per topic/difficulty),
     - quest state per main/sub/topic,
     - practice stats, achievements state.
   - DONE: Add migration/compat layer to keep existing saves valid.
   - DONE: Add automated tests for data migration and summary calculations.

4. Quest lifecycle and hierarchy status
   - DONE: Implement quest status rules from `constitution/structure/module-lifecycle.md`:
     - main/sub/topic aggregation, not just per topic.
   - DONE: Update quest log indicators and status circles to reflect aggregated state.
   - DONE: Add automated tests for status transitions (NOT_ACCEPTED -> ACTIVE -> COMPLETED).

5. Settings overlay + theme tokens
   - DONE: Ensure settings apply consistently to main UI and iframe modules.
   - DONE: Ensure Save/Cancel behavior matches `constitution/structure/settings-overlay.md`.
   - DONE: Confirm overlay close behaviors (X, ESC, overlay click) match spec.
   - DONE: Add automated tests for settings persistence and iframe styling.

6. Practice engine consistency
   - DONE: Unify practice flow with `constitution/structure/practice-enginge.md`:
     - randomization, non-repeat logic, answer normalization,
       auto-advance timing, and XP rewards by difficulty.
   - DONE: Add automated tests for practice non-repeat coverage and XP awards.

7. Test UI standardization
   - DONE: Align all test tabs to the same layout:
     - difficulty selector,
     - pagination dots with arrows on the same row,
     - prompt block,
     - finish/evaluate button at bottom.
   - DONE: Fix any module still deviating (confirm `modules/halmazmuveletek.html`,
     `modules/linearis_fuggveny.html`, `modules/logikai_szita.html`).
   - DONE: Add automated tests for navigation and submission flow.

8. Achievements + character sheet + results
   - DONE: Implement persistent achievements per `constitution/achievements/README.md`.
   - DONE: Drive character sheet stats from stored progress instead of mock rules.
   - DONE: Ensure results/character sheet reflect real progress and quests.
   - DONE: Add automated tests for achievements and summary views.

9. Module backlog (start after core systems)
   - Implement missing modules from `constitution/curriculum/roadmap.md`.
   - DONE: Implement `modules/skatulya_elv.html` (Alapozo -> Gondolkodasi modserek, Halmazok).
   - DONE: Add automated tests for Skatulya-elv practice + visual model.
   - DONE: Implement `modules/oszthatosag.html` (Alapozo -> Szamelmelet temazaro).
   - DONE: Add automated tests for Oszthatosag test, practice, and visual model.
   - DONE: Implement `modules/lnko_lkkt.html` (Alapozo -> Szamelmelet temazaro).
   - DONE: Add automated tests for LNKO/LKKT test, practice, and visual model.
   - DONE: Implement `modules/primtenyezok.html` (Alapozo -> Szamelmelet temazaro).
   - DONE: Add automated tests for Prímtenyezős felbontás test, practice, and visual model.
   - DONE: Implement `modules/szamrendszerek.html` (Alapozo -> Szamelmelet temazaro).
   - DONE: Add automated tests for Szamrendszerek test, practice, and visual model.
   - DONE: Implement `modules/racionalis_szamok_temazaro.html` (Alapozo -> Racionalis szamok).
   - DONE: Add automated tests for Racionalis szamok temazaro test, practice, and visual model.
   - DONE: Implement `modules/tortek.html` (Alapozo -> Racionalis szamok).
   - DONE: Add automated tests for Tortek test, practice, and visual model.
   - DONE: Implement `modules/tizedes_tortek.html` (Alapozo -> Racionalis szamok).
   - DONE: Add automated tests for Tizedes tortek test, practice, and visual model.
   - DONE: Implement `modules/szazalekszamitas.html` (Alapozo -> Racionalis szamok).
   - DONE: Add automated tests for Szazalekszamitas test, practice, and visual model.
   - DONE: Implement `modules/hatvany_temazaro.html` (Alapozo -> Hatvany, Gyok, Logaritmus).
   - DONE: Add automated tests for Hatvany temazaro test, practice, and visual model.
   - DONE: Implement `modules/hatvanyozas.html` (Alapozo -> Hatvany, Gyok, Logaritmus).
   - DONE: Add automated tests for Hatvanyozas test, practice, and visual model.
   - DONE: Implement `modules/gyokvonas.html` (Alapozo -> Hatvany, Gyok, Logaritmus).
   - DONE: Add automated tests for Gyokvonas test, practice, and visual model.
   - DONE: Implement `modules/logaritmus.html` (Alapozo -> Hatvany, Gyok, Logaritmus).
   - DONE: Add automated tests for Logaritmus test, practice, and visual model.
   - DONE: Implement `modules/algebrai_kif_temazaro.html` (Algebra -> Algebrai kifejezesek).
   - DONE: Add automated tests for Algebrai kifejezesek temazaro test, practice, and visual model.
   - DONE: Implement `modules/polinomok.html` (Algebra -> Algebrai kifejezesek).
   - DONE: Add automated tests for Polinomok test, practice, and visual model.
   - DONE: Implement `modules/nevezetes_azonossagok.html` (Algebra -> Algebrai kifejezesek).
   - DONE: Add automated tests for Nevezetes azonossagok test, practice, and visual model.
   - DONE: Implement `modules/algebrai_tortek.html` (Algebra -> Algebrai kifejezesek).
   - DONE: Add automated tests for Algebrai tortek test, practice, and visual model.
   - DONE: Implement `modules/linearis_egyenletek.html` (Algebra -> Egyenletek, egyenlotlensegek).
   - DONE: Add automated tests for Linearis egyenletek test, practice, and visual model.
   - DONE: Implement `modules/egyenletek_temazaro.html` + `modules/egyenletek_temazaro.js` (Algebra -> Egyenletek, egyenlotlensegek).
   - DONE: Add automated tests for Egyenletek temazaro test, practice, and visual model.
   - Keep module structure consistent with spec and existing templates.

10. Cleanup and deprecation
   - Remove or hide legacy modules that are no longer needed (e.g. `modules/xp_guide.html`).
   - Re-audit unused assets and confirm no dead links in `index.html`.

Notes:
- This list is ordered. We should finish each item (including tests) before moving to the next.
