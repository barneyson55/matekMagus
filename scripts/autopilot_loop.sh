#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

while true; do
  RUN_LOG="$(mktemp)"

  echo "=== $(date -Is) ===" | tee -a "$LOG_DIR/autopilot.log" > "$RUN_LOG"

  set +e
  bash "$ROOT_DIR/scripts/autopilot.sh" 2>&1 | tee -a "$LOG_DIR/autopilot.log" >> "$RUN_LOG"
  STATUS=${PIPESTATUS[0]}
  set -e

  # Normal stop conditions
  if grep -q "STOP: user input required" "$RUN_LOG"; then
    echo "Autopilot STOP: user input required -> docs/user_todo.md" | tee -a "$LOG_DIR/autopilot.log"
    exit 0
  fi

  if grep -q "No pending items in docs/ai_todo.md" "$RUN_LOG"; then
    echo "Autopilot DONE: no pending AI tasks -> docs/ai_todo.md" | tee -a "$LOG_DIR/autopilot.log"
    exit 0
  fi

  # Real error
  if [ $STATUS -ne 0 ]; then
    echo "Autopilot ERROR: exit $STATUS (see logs/autopilot.log)" | tee -a "$LOG_DIR/autopilot.log"
    exit $STATUS
  fi

  sleep 2
done
