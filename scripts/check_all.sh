#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Running Node checks (npm test) in $ROOT_DIR"
pushd "$ROOT_DIR" >/dev/null
npm test
popd >/dev/null

echo "Running mobile checks (scripts/mobile_check.sh)"
bash "$ROOT_DIR/scripts/mobile_check.sh"
