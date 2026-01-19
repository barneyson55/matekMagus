#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_TODO="$ROOT_DIR/docs/user_todo.md"
AI_TODO="$ROOT_DIR/docs/ai_todo.md"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex not found. Install Codex CLI first."
  exit 1
fi

if [ ! -f "$USER_TODO" ] || [ ! -f "$AI_TODO" ]; then
  echo "Required docs missing: docs/user_todo.md or docs/ai_todo.md"
  exit 1
fi

if grep -q "^- \\[ \\]" "$USER_TODO"; then
  echo "STOP: user input required. See docs/user_todo.md"
  exit 0
fi

NEXT_LINE="$(grep -n "^- \\[ \\]" "$AI_TODO" | head -n1 || true)"
if [ -z "$NEXT_LINE" ]; then
  echo "No pending items in docs/ai_todo.md"
  exit 0
fi

NEXT_ITEM="$(echo "$NEXT_LINE" | sed 's/^[0-9]*:- \\[ \\] //')"

export CODEX_SANDBOX="${CODEX_SANDBOX:-workspace}"
CODEX_AUTOPILOT_ARGS="${CODEX_AUTOPILOT_ARGS:---non-interactive}"
read -r -a CODEX_ARGS <<< "$CODEX_AUTOPILOT_ARGS"

PROMPT="Follow AGENTS.md. Complete the next task from docs/ai_todo.md: $NEXT_ITEM"

echo "Running Codex with sandbox: $CODEX_SANDBOX"
echo "Task: $NEXT_ITEM"
codex "${CODEX_ARGS[@]}" "$PROMPT"
