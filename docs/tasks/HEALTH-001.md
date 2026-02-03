# HEALTH-001 — scripts/check_all.sh

## Goal
Create a single repo-root script that runs both Node and Flutter checks in WSL.

## Acceptance Criteria
- `scripts/check_all.sh` exists + executable.
- Runs:
  - `npm test` (or the repo’s canonical node test command)
  - `bash scripts/mobile_check.sh`
- Script exits non-zero on failure.
