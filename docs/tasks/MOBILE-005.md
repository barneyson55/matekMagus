# MOBILE-005 - Offline detection + banner

## Goal
Detect online/offline state and show a small banner when offline.
Must be testable in WSL headless tests.

## Deliverables
- Add `connectivity_plus`
- Add abstraction:
  - `ConnectivityService` with `watchIsOnline()` + `checkIsOnline()`
- Production impl uses connectivity_plus
- Fake impl for tests
- AppState exposes `isOnline`
- UI shows/hides a banner based on `isOnline`

## Acceptance Criteria
- `flutter test` is green in WSL.
- No plugin exceptions in unit/widget tests.
- Banner appears offline and disappears online.

## Verify
```bash
cd ~/code/matekMagus/mobile_app
flutter test
flutter analyze
```
