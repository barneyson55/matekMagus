# MOBILE-001 - Mobile baseline + WSL headless checks

## Goal
Add a repo-root script `scripts/mobile_check.sh` that validates the Flutter mobile app in WSL (headless).

## Scope
- Create `scripts/mobile_check.sh` at repo root.
- Run in `mobile_app/`:
  - `flutter pub get`
  - `dart format --output=none --set-exit-if-changed .`
  - `flutter analyze`
  - `flutter test`

## Acceptance Criteria
- `bash scripts/mobile_check.sh` is green in WSL without Android SDK.
- The script fails if formatting/analyze/tests fail.

## Verify
```bash
cd ~/code/matekMagus
bash scripts/mobile_check.sh
```
