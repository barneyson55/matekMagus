# MOBILE-006 — Local persistence for UserProfile (SharedPreferences)

## Goal
Persist the current `UserProfile` locally so app restarts keep state, without Firebase.

## Requirements
- Add `shared_preferences`.
- Implement `LocalUserRepository implements UserRepository`.
- Store profile JSON under a single key.
- Provide `watchCurrentUserProfile()` stream updates.

## Tests
- Use `SharedPreferences.setMockInitialValues({})`.
- Roundtrip test: save -> load -> equals.
- Stream emits on upsert.

## Acceptance Criteria
- `flutter test` and `flutter analyze` are green in WSL.
- Restart simulation in tests shows data persists (via mock prefs).
