#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_TODO="$ROOT_DIR/docs/user_todo.md"
AI_TODO="$ROOT_DIR/docs/ai_todo.md"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex not found. Install Codex CLI first (see docs/SETUP_AUTOMATION.md)."
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

CURRENT_SANDBOX="${CODEX_SANDBOX:-}"
if [ -n "$CURRENT_SANDBOX" ] && [ "$CURRENT_SANDBOX" != "workspace" ]; then
  echo "For safety, forcing CODEX_SANDBOX=workspace (was: $CURRENT_SANDBOX)"
fi
export CODEX_SANDBOX="workspace"
PROMPT="Follow AGENTS.md. Complete the next task from docs/ai_todo.md: $NEXT_ITEM"

echo "Running Codex (exec) with sandbox: $CODEX_SANDBOX"
echo "Task: $NEXT_ITEM"

codex exec \
  --full-auto \
  "$PROMPT"

