# ACCEPTANCE

## Definition of Done (DoD)
- Required quality gates pass (see AGENTS.md).
- No regressions in app logic or UI behavior.
- Docs updated: `docs/status.md` and `docs/ai_todo.md` (and `docs/critical_todo.md` if needed).
- No new dependencies without explicit approval.

## Safety Rules
- Never commit secrets; only `.env.example` if needed.
- No mass-email or user-impacting automation.
- Avoid destructive commands or data loss.

## Style Rules
- Preserve existing naming conventions and module patterns.
- Keep changes small, incremental, and reviewable.
