#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_TODO="$ROOT_DIR/docs/user_todo.md"
AI_TODO="$ROOT_DIR/docs/ai_todo.md"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex not found. Install Codex CLI first."
  exit 1
fi

if [[ ! -f "$USER_TODO" || ! -f "$AI_TODO" ]]; then
  echo "Required docs missing: docs/user_todo.md or docs/ai_todo.md"
  exit 1
fi

# Normalize CRLF / CR-only line terminators to LF to make grep-based parsing reliable.
normalize() { tr '\r' '\n'; }

has_unchecked() {
  # matches: - [ ] ..., * [ ] ..., + [ ] ... with optional indentation and whitespace
  normalize < "$1" | grep -qE '^[[:space:]]*[-*+][[:space:]]*\[[[:space:]]\][[:space:]]+'
}

next_unchecked_line() {
  normalize < "$AI_TODO" | grep -nE '^[[:space:]]*[-*+][[:space:]]*\[[[:space:]]\][[:space:]]+' | head -n1 || true
}

if has_unchecked "$USER_TODO"; then
  echo "STOP: user input required. See docs/user_todo.md"
  exit 0
fi

NEXT_LINE="$(next_unchecked_line)"
if [[ -z "$NEXT_LINE" ]]; then
  echo "No pending items in docs/ai_todo.md"
  exit 0
fi

# Strip "N:" prefix + checkbox markup; keep the rest of the line as task text.
NEXT_ITEM="$(printf '%s\n' "$NEXT_LINE" | sed -E 's/^[0-9]+:[[:space:]]*[-*+][[:space:]]*\[[[:space:]]\][[:space:]]+//')"

PROMPT="$(cat <<PROMPT
Follow AGENTS.md and any constitution/automation rules in the repo.

Complete the next task from docs/ai_todo.md:
- $NEXT_ITEM

Requirements:
- Work only inside this repository.
- Make the necessary code/doc changes directly in the working tree.
- Update docs/ai_todo.md by checking off the completed item when done.
- Do not ask the user questions; make reasonable assumptions and proceed.
PROMPT
)"

echo "Running Codex (repo: $ROOT_DIR)"
echo "Task: $NEXT_ITEM"

# IMPORTANT: these are GLOBAL flags (must come BEFORE 'exec')
# See Codex CLI docs for --ask-for-approval and --sandbox. 
cd "$ROOT_DIR"
codex --ask-for-approval never --sandbox workspace-write --cd "$ROOT_DIR" --no-alt-screen exec "$PROMPT"
