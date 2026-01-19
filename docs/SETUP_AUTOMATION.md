# Setup Automation (Codex Autopilot)

## Safe Codex Usage
- Use workspace-only permissions whenever possible.
- Avoid running destructive commands without explicit approval.
- Keep secrets out of the repo; use `.env.example` only.

## Codex CLI
- Install Codex CLI per official docs (TBD: exact install command for your environment).
- Login/authenticate per CLI instructions (TBD).
- Common config locations (verify in your setup):
  - Windows: `%USERPROFILE%\\.codex`
  - macOS/Linux: `$HOME/.codex`

If any of the above are unknown, update `docs/user_todo.md`.

## Windows + VS Code + WSL (Recommended)
- Open the repo in VS Code.
- Use WSL for running bash scripts if possible:
  - `wsl bash scripts/autopilot.sh`
  - `wsl bash scripts/review_only.sh`
- If you do not use WSL, run the scripts from Git Bash.

## Autopilot Loop (Minimal Concept)
1. Check `docs/user_todo.md` for unchecked items; stop if any exist.
2. Read `docs/ai_todo.md` and pick the top unchecked task.
3. Run Codex non-interactively to complete the task.
4. Update `docs/status.md`, `docs/ai_todo.md`, and `docs/critical_todo.md`.

## Script Configuration (TBD)
The scripts use these environment variables to avoid hard-coding CLI flags:
- `CODEX_AUTOPILOT_ARGS` (default in `scripts/autopilot.sh`: `--non-interactive`)
- `CODEX_REVIEW_ARGS` (default in `scripts/review_only.sh`: `--non-interactive --read-only`)
- `CODEX_SANDBOX` (default: `workspace`)

Adjust these to match your Codex CLI version.
