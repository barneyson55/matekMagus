# SYNC-002 — Pure merge/resolve helpers + tests (desktop-first)

## Goal
Implement deterministic merge helpers for local vs cloud states, with tests.
Start on desktop side (pure JS/TS function), no Firebase calls yet.

## Acceptance Criteria
- A pure `mergeProgress(local, remote)` exists with documented rules.
- Unit tests cover at least:
  - XP conflict handling (no decrease)
  - achievements union
  - results append-only / de-dup if ids match
