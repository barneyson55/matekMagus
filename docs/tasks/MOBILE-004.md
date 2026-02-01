# MOBILE-004 - AppState + Provider wiring

## Goal
Add `AppState extends ChangeNotifier` and wire it with `provider`.
UI must not call repositories directly.

## Deliverables
- Add `provider` to `pubspec.yaml`
- `lib/app_state/app_state.dart`
  - holds `UserProfile? currentUser`
  - exposes `isLoading`
  - `load()` + one simple mutation method (e.g. `setDisplayName`)
- `main.dart` wires `Provider`/`MultiProvider`

## Tests
- Unit test for AppState notifying on state changes.

## Acceptance Criteria
- `flutter test` and `flutter analyze` are green.
- UI depends on AppState, not on repositories.

## Verify
```bash
cd ~/code/matekMagus/mobile_app
flutter test
flutter analyze
```
