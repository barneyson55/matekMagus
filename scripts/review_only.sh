#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex not found. Install Codex CLI first."
  exit 1
fi

export CODEX_SANDBOX="${CODEX_SANDBOX:-workspace}"
CODEX_REVIEW_ARGS="${CODEX_REVIEW_ARGS:---non-interactive --read-only}"
read -r -a CODEX_ARGS <<< "$CODEX_REVIEW_ARGS"

PROMPT="Review the repo in read-only mode. Do not change code or UI. Write suggestions only to docs/ai_todo.md and docs/critical_todo.md."

echo "Running Codex review with sandbox: $CODEX_SANDBOX"
codex "${CODEX_ARGS[@]}" "$PROMPT"
