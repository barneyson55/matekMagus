# User TODO

- [x] Provide Codex CLI install and login steps for this environment.
  - Codex CLI runs inside Ubuntu WSL.
  - Installed via `npm install -g @openai/codex`.
  - Auth via ChatGPT Pro login (no API key).
- [x] Confirm Codex CLI flags for non-interactive autopilot and read-only review (and sandbox/approval behavior).
  Decision:
  - Autopilot (writes allowed):
    `codex exec --full-auto --sandbox workspace-write --ask-for-approval on-request "<task>"`
  - Review (read-only):
    `codex exec --sandbox read-only --ask-for-approval never "<review>"`

- [x] Confirm module priority after `paritas` (finish functions first vs start geometry).
  Decision:
  - After `paritas`, continue with function-related modules.
  - Priority: complete linear functions first, then quadratic functions.
  - Geometry is postponed to a later milestone.

- [x] Provide or confirm the app icon file/path for `assets/icon.png`.
  Decision:
  - Use a placeholder icon for now.
  - Final app icon will be provided before packaging.

- [x] Decide whether to create `assets/temakorok` and generate navigation, or keep a manual list in `index.html`.
  Decision:
  - Keep navigation manually defined in `index.html`.
  - Do not auto-generate navigation from `assets/temakorok` in this phase.

- [x] Define packaging/distribution targets and platforms (installer expectations).
  Decision:
  - No packaging or installers in the current phase.
  - Development-only Electron runs.
  - Packaging decisions deferred to a later milestone.

- [x] Decide whether CI/CD or release automation is required.
  Decision:
  - No CI/CD or release automation in this phase.
  - Revisit after core content and functionality stabilization.

- [x] Define backup/sync expectations beyond local `progress.json`.
  Decision:
  - Local-only persistence using `progress.json`.
  - No cloud sync, backup, or multi-device support in this phase.

- [x] Set the next milestone for the project.
  Next milestone:
  - Fully functional linear and quadratic function modules.
  - Task generation, evaluation, and scoring.
  - Stable progress tracking integration.
