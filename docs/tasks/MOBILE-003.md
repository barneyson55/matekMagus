# MOBILE-003 - Domain models + repository interfaces (no Firebase)

## Goal
Introduce core domain models and a repository interface in the Flutter app, Firebase-free.

## Deliverables
### Models (Dart)
- `UserProfile`
- `Achievement`
- `Buff`

Requirements:
- `toJson()` / `fromJson()`
- DateTimes as ISO-8601 strings
- Unit tests for JSON round-trip

### Repository
- `abstract class UserRepository`
- `InMemoryUserRepository` for bootstrap/testing
- Tests for stream updates and upsert behavior

## Suggested file layout
- `lib/domain/models/...`
- `lib/domain/repositories/user_repository.dart`
- `lib/data/in_memory/in_memory_user_repository.dart`

## Acceptance Criteria
- `flutter test` and `flutter analyze` are green.
- Model JSON roundtrips are tested.
- InMemory repository emits updates.

## Verify
```bash
cd ~/code/matekMagus/mobile_app
flutter test
flutter analyze
```
