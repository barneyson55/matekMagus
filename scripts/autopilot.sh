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

# Detect Codex CLI flags across versions (exec or global options).
HELP_EXEC="$(codex exec --help 2>&1 || true)"
HELP_ROOT="$(codex --help 2>&1 || true)"
HELP_TEXT="${HELP_EXEC}"$'\n'"${HELP_ROOT}"

escape_regex() {
  sed -E 's/[][\\.^$*+?(){}|]/\\\\&/g' <<<"$1"
}

flag_present() {
  local flag="$1"
  local text="$2"
  local escaped
  escaped="$(escape_regex "$flag")"
  grep -qE "(^|[[:space:]])${escaped}([[:space:]]|,|$)" <<<"$text"
}

has_flag() {
  local flag="$1"
  flag_present "$flag" "$HELP_TEXT"
}

flag_in_exec() {
  local flag="$1"
  flag_present "$flag" "$HELP_EXEC"
}

flag_in_root() {
  local flag="$1"
  flag_present "$flag" "$HELP_ROOT"
}

GLOBAL_ARGS=()
EXEC_ARGS=()

add_flag() {
  local flag="$1"
  local value="${2-}"
  if flag_in_exec "$flag"; then
    EXEC_ARGS+=("$flag")
    [[ -n "$value" ]] && EXEC_ARGS+=("$value")
    return 0
  fi
  if flag_in_root "$flag"; then
    GLOBAL_ARGS+=("$flag")
    [[ -n "$value" ]] && GLOBAL_ARGS+=("$value")
    return 0
  fi
  return 1
}

# Ensure a write-enabled sandbox is selected.
if has_flag "--sandbox"; then
  add_flag "--sandbox" "workspace-write"
elif has_flag "--full-auto"; then
  add_flag "--full-auto"
elif has_flag "--config" || has_flag "-c"; then
  CONFIG_FLAG="--config"
  if ! has_flag "--config" && has_flag "-c"; then
    CONFIG_FLAG="-c"
  fi
  if grep -q 'sandbox_mode' <<<"$HELP_TEXT"; then
    add_flag "$CONFIG_FLAG" 'sandbox_mode="workspace-write"'
  else
    add_flag "$CONFIG_FLAG" 'sandbox_permissions=["workspace-write"]'
  fi
else
  echo "No supported sandbox flag found; refusing to run without write-enabled sandbox."
  exit 1
fi

# Approval policy (best-effort based on supported flags).
if has_flag "--ask-for-approval"; then
  add_flag "--ask-for-approval" "never"
elif has_flag "--approval"; then
  add_flag "--approval" "never"
fi

# Preferred UX flags if supported.
add_flag "--cd" "$ROOT_DIR" || true
add_flag "--no-alt-screen" || true

# Strip "N:" prefix + checkbox markup; keep the rest of the line as task text.
NEXT_ITEM="$(printf '%s\n' "$NEXT_LINE" | sed -E 's/^[0-9]+:[[:space:]]*[-*+][[:space:]]*\[[[:space:]]\][[:space:]]+//')"

PROMPT="$(cat <<PROMPT
Follow AGENTS.md and any constitution/automation rules in the repo.

Complete the next task from docs/ai_todo.md:
- $NEXT_ITEM

Requirements:
- Work only inside this repository.
- Automation policy: do not run tests automatically; only generate/update them.
- Make the necessary code/doc changes directly in the working tree.
- Update docs/ai_todo.md by checking off the completed item when done.
- Do not ask the user questions; make reasonable assumptions and proceed.
PROMPT
)"

echo "Running Codex (repo: $ROOT_DIR)"
echo "Task: $NEXT_ITEM"

cd "$ROOT_DIR"
codex "${GLOBAL_ARGS[@]}" exec "${EXEC_ARGS[@]}" "$PROMPT"
