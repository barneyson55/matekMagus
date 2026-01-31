# TEST-UNIT-001 — Unit tests for core logic

## Goal
Add real unit tests for the most valuable logic:
- task generation / randomization rules (if any)
- answer checking / scoring
- progress persistence (read/write, schema validation, defaults)
- any “leveling” or difficulty logic

## Constraints
- Unit tests must not require a GUI.
- If logic currently lives inside renderer scripts in an untestable way, refactor minimally:
  - extract pure functions into modules that can be required/imported in tests
  - keep public API stable
- No huge rewrite.

## Implementation (when the autopilot executes this task)
1) Identify candidate modules using ripgrep:
   - generation functions (e.g. "generate", "random", "task", "exercise")
   - progress store (e.g. "progress.json", "userData", "save", "load")
   - scoring/checking ("checkAnswer", "validate")
2) Create tests in tests/unit/:
   - cover happy paths + edge cases
   - add at least 15 meaningful assertions
3) Add fixtures under tests/fixtures/ if needed.

## Definition of Done
- `npm run test:unit` passes reliably.
- Tests are readable and deterministic.
- Coverage focus is on logic, not UI.
