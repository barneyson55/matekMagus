# DESKTOP-ARCH-001 — ProgressRepository abstraction (sync-ready)

## Goal
Refactor desktop persistence so `progress.json` read/write is behind a repository interface.

## Deliverables
- Create a `ProgressRepository` (or similar) interface/module.
- Implement `LocalProgressRepository` using existing `progress.json` logic.
- Update main process handlers to use the repository, not direct file calls.
- Add unit tests for repository behavior (read/write/atomic save if applicable).

## Acceptance Criteria
- `npm test` remains green.
- No behavior change: progress still persists locally as before.
- Clear seam exists for a future `FirestoreProgressRepository`.
