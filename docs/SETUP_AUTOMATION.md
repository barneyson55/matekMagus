# Setup Automation (Codex Autopilot)

## Safe Codex Usage
- Recommended sandbox: workspace-only (for example `CODEX_SANDBOX=workspace` or `--sandbox workspace`).
- Recommended approval policy: require confirmation for commands outside the repo (TBD: exact flag).
- Keep secrets out of the repo; use `.env.example` only.
- Automation policy: do not run tests automatically; only generate/update them. Record skips in `docs/status.md`.

## Codex CLI
- Install: `npm install -g @openai/codex`
- Run inside WSL Ubuntu

## Windows + VS Code + WSL (Recommended)
- Open the repo in VS Code.
- Run scripts via WSL:
  - `wsl bash scripts/autopilot.sh`
  - `wsl bash scripts/review_only.sh`
- Without WSL, use Git Bash or PowerShell and run the scripts directly.

## Autopilot Loop (Minimal Concept)
1. Stop if `docs/user_todo.md` has unchecked items.
2. Read `docs/ai_todo.md` and pick the top unchecked task.
3. Run Codex non-interactively to complete the task.
4. Update `docs/status.md`, `docs/ai_todo.md`, and `docs/critical_todo.md`.

## Script Configuration
- `scripts/autopilot.sh`:
  - Default args: `--non-interactive` (override via `CODEX_AUTOPILOT_ARGS`).
  - Sandbox is forced to `workspace` inside the script.
- `scripts/review_only.sh`:
  - Default args: `--non-interactive --read-only` (override via `CODEX_REVIEW_ARGS`).
  - Sandbox is forced to `workspace` inside the script.
- If your Codex CLI uses different flags, update the env vars or scripts (TBD).
