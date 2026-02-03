# SYNC-001 — Sync contract (Firestore schema + conflict rules)

## Goal
Write a single source-of-truth document for cloud sync:
- Firestore paths
- data schema
- conflict rules

## Acceptance Criteria
- `docs/sync_contract.md` created with:
  - `users/{uid}` doc + subcollections (results/achievements/buffs)
  - rules: results append-only, XP increment/transaction, achievements/buffs union
  - fields: `updatedAt`, versioning
- Document is explicit enough that mobile + desktop can implement without guessing.
