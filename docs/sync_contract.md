# Sync Contract (Firestore)

Status: Draft
Last updated: 2026-02-03

This document defines the single source of truth for cloud sync. It is written to
be explicit enough for both desktop and mobile implementations.

## Scope
- Sync user progress + settings only.
- Static curriculum content is not synced.
- Offline-first: clients can write locally, then reconcile when online.

## Identifiers and timestamps
- `uid`: Firebase Auth user id.
- `clientId`: stable per-device id (UUID). Stored locally and sent with every write.
- `createdAt` / `updatedAt`: Firestore `Timestamp` (use `serverTimestamp()`).
- `clientUpdatedAt`: ISO 8601 string from the client clock for user-facing ordering.
- `schemaVersion`: integer for this contract (bump on breaking schema change).
- `progressVersion`: integer aligned with desktop `PROGRESS_VERSION` in `main.js`.
- `docVersion`: integer incremented by the writer on every update for optimistic
  concurrency (optional if using transactions everywhere).

## Firestore path layout
```
/users/{uid}
/users/{uid}/results/{resultId}
/users/{uid}/achievements/{achievementId}
/users/{uid}/buffs/{buffId}
```

## Schema

### users/{uid}
Primary user state and aggregated progress.

Required fields:
- `schemaVersion` (number)
- `progressVersion` (number)
- `docVersion` (number)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)
- `clientId` (string)
- `displayName` (string, optional)
- `totalXp` (number)
- `level` (number)
- `levelName` (string)
- `xpToNextLevel` (number)

Progress fields:
- `quests` (map)
  - `mainTopics` (map: topicId -> status)
  - `subtopics` (map: topicId -> status)
  - `topics` (map: topicId -> status)
  - `status` is one of: `NOT_ACCEPTED`, `ACTIVE`, `COMPLETED`
- `practice` (map)
  - `statsByTopic` (map: topicId -> practiceEntry)
  - `practiceEntry`:
    - `xpEarned` (number)
    - `correctCount` (number)
    - `totalCount` (number)
    - `lastPracticedAt` (Timestamp or ISO string)
    - `difficulties` (map: `konnyu` / `normal` / `nehez`)
      - `correctCount` (number)
      - `totalCount` (number)

Settings fields (optional, may be empty until implemented):
- `settings` (map)
  - `themeId` (string)
  - `fontScale` (number)
  - `highContrast` (bool)
  - `soundEnabled` (bool)
  - `gameplayHints` (bool)
  - `updatedAt` (Timestamp)

Notes:
- `level`, `levelName`, `xpToNextLevel` are denormalized. Clients should
  recompute from `totalXp` using the local XP table when rendering.
- Avoid large arrays in this doc; per-test attempts live in `results`.

### users/{uid}/results/{resultId}
Append-only test results. One document per attempt.

Required fields:
- `schemaVersion` (number)
- `resultId` (string, same as doc id)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)
- `clientId` (string)
- `clientUpdatedAt` (string, ISO 8601)
- `topicId` (string)
- `scope` (string: `topic` | `subtopic` | `main`)
- `difficulty` (string: `konnyu` | `normal` | `nehez` | `none`)
- `grade` (number)
- `percentage` (number)
- `xpAwarded` (number)
- `durationSeconds` (number, optional)

Recommended fields:
- `attemptNumber` (number, optional)
- `source` (string: `desktop` | `mobile`)

### users/{uid}/achievements/{achievementId}
One document per achievement id.

Required fields:
- `schemaVersion` (number)
- `achievementId` (string, same as doc id)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)
- `clientId` (string)
- `isUnlocked` (bool)
- `unlockedAt` (Timestamp, nullable)
- `grantedXp` (number)

### users/{uid}/buffs/{buffId}
One document per buff id.

Required fields:
- `schemaVersion` (number)
- `buffId` (string, same as doc id)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)
- `clientId` (string)
- `isUnlocked` (bool)
- `unlockedAt` (Timestamp, nullable)
- `isActive` (bool)
- `activatedAt` (Timestamp, nullable)
- `expiresAt` (Timestamp, nullable)

## Conflict and merge rules

### Global
- Server timestamps (`updatedAt`) are used for LWW only when a merge rule does
  not otherwise define deterministic behavior.
- `schemaVersion` gates migrations. If client schemaVersion < server, client
  must migrate before writing back.

### Results (append-only)
- Results are append-only: create new docs only, never update or delete.
- Each attempt has a stable `resultId` generated once and stored locally.
- If a result doc with the same id already exists, the write is a no-op.
- Aggregations (best grades, quest completion) are derived client-side or via a
  separate server job, not by mutating existing result docs.

### XP (increment/transaction)
- `totalXp` is updated using Firestore transactions or `FieldValue.increment`.
- A test result write must be in the same transaction as the `totalXp` increment
  to guarantee idempotency:
  - If the `results/{resultId}` doc exists, skip the increment.
  - If it does not exist, create it and increment `totalXp` by `xpAwarded`.
- Achievement unlocks that grant XP follow the same pattern:
  - If `achievements/{achievementId}` is newly unlocked, increment `totalXp` by
    `grantedXp` once.

### Achievements (union)
- Merge is a union by `achievementId`.
- `isUnlocked` is monotonic: once true, never set to false.
- `unlockedAt` resolves to the earliest timestamp seen (preserve first unlock).
- `grantedXp` resolves to the max value seen (avoid double reward).

### Buffs (union)
- Merge is a union by `buffId`.
- `isUnlocked` is monotonic: once true, never set to false.
- `unlockedAt` resolves to the earliest timestamp seen.
- `isActive` resolves to true if any device reports active and `expiresAt` is in
  the future. If multiple active entries exist, keep the latest `expiresAt`.

### Quests
- Quest status is monotonic: `NOT_ACCEPTED` < `ACTIVE` < `COMPLETED`.
- Merge rule is max-status per topic id.

### Practice stats
- Merge rule is additive for counts and `xpEarned`.
- `lastPracticedAt` resolves to the latest timestamp.

### Settings
- Settings are LWW based on `settings.updatedAt`.

## Suggested write flows

1) Append a test result
- Generate `resultId` locally and store with the attempt.
- Transaction:
  - Read `results/{resultId}`.
  - If absent: create result doc + increment `totalXp` by `xpAwarded`.
  - Update `users/{uid}.updatedAt` and `docVersion`.

2) Unlock an achievement
- Transaction:
  - Read `achievements/{achievementId}`.
  - If `isUnlocked` is false or doc missing: set unlocked + increment XP.

3) Update quests/practice/settings
- Use `merge` updates with additive increments for practice stats.
- Apply quest max-status logic client-side before write.

## Versioning
- `schemaVersion` starts at `1` for this contract.
- `progressVersion` tracks local progress schema versions to aid migrations.
- Backward-compatible additions (new optional fields) do not require version
  bumps; removals or semantic changes do.
