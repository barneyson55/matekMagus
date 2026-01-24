#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_TODO="$ROOT_DIR/docs/user_todo.md"
AI_TODO="$ROOT_DIR/docs/ai_todo.md"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/autopilot.log"

mkdir -p "$LOG_DIR"

normalize() { tr '\r' '\n'; }

has_unchecked() {
  normalize < "$1" | grep -qE '^[[:space:]]*[-*+][[:space:]]*\[[[:space:]]\][[:space:]]+'
}

echo "== autopilot_loop starting =="
echo "repo: $ROOT_DIR"
echo "log:  $LOG_FILE"
echo

while true; do
  set +e
  (cd "$ROOT_DIR" && bash scripts/autopilot.sh) 2>&1 | tee -a "$LOG_FILE"
  status=${PIPESTATUS[0]}
  set -e

  if [[ $status -ne 0 ]]; then
    echo "autopilot.sh failed with exit code $status"
    exit "$status"
  fi

  if has_unchecked "$USER_TODO"; then
    echo "STOP: user input required. See docs/user_todo.md"
    exit 0
  fi

  if ! has_unchecked "$AI_TODO"; then
    echo "No pending items in docs/ai_todo.md"
    exit 0
  fi

  sleep 2
done
