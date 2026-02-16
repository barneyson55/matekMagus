
## Windows packaging
- [x] Enable Windows Developer Mode or run PowerShell as Administrator so electron-builder can create symlinks (required for `npm run dist:win`).

## Moved from ai_todo (manual/Windows) (2026-02-01 16:58)
- [ ] Build Windows installer artifacts (`npm run dist:win`) and verify `dist/` outputs. (Blocked: `winCodeSign` extraction failed with "Cannot create symbolic link" due to missing symlink privilege on 2026-01-31; enable Windows Developer Mode or run the build in an elevated terminal. Also blocked here because `electron-builder` is not installed; `NPM_CONFIG_CACHE=/tmp/npm-cache npm install --no-fund --no-audit --prefer-offline` timed out again on 2026-02-01; `npm run dist:win` still fails and `dist/` is missing.)
- [ ] Install NSIS build and verify app launch + progress persistence.
- [ ] Auto-update verification checklist on installed build (update available → download → quitAndInstall).
- [ ] Confirm GitHub Release assets include `latest.yml` and `*.blockmap` files.
- [ ] Update `docs/release_readiness_report.md` with Windows packaging/update outcomes.
- [ ] Code signing setup (optional but recommended; user-provided certificate).
- [ ] SmartScreen / Defender warning check on signed installer.
- [ ] Windows installer click-through checklist (UAC prompts, install dir, uninstall, shortcuts).
