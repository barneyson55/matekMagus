#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/mobile_app"

if ! command -v flutter >/dev/null 2>&1; then
  echo "flutter not found on PATH. Install Flutter to run mobile checks."
  exit 1
fi

if ! command -v dart >/dev/null 2>&1; then
  echo "dart not found on PATH. Install Dart SDK (or Flutter) to run mobile checks."
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "mobile_app directory not found at $APP_DIR"
  exit 1
fi

echo "Running mobile checks in $APP_DIR"

pushd "$APP_DIR" >/dev/null
flutter pub get
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test
popd >/dev/null
