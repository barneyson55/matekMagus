# Windows Release Guide (Desktop Only)

## Scope
- Desktop (PC) release packaging for Windows only.
- No mobile scope in this guide.

## Current State (2026-01-28)
- electron-builder configured in `package.json`.
- Auto-update uses GitHub Releases + electron-updater (NSIS only).

## Prerequisites
- Windows 10/11
- Node.js LTS + npm
- Git
- GitHub release access (GH_TOKEN with `repo` scope)

## Clean Install
```powershell
npm ci
```
If `npm ci` fails (missing or incompatible lockfile), use:
```powershell
npm install
```

## Run the App (Development)
```powershell
npm start
```

## Build Installer (NSIS + portable)
```powershell
npm run dist:win
```

## Publish Installer + Update Metadata (GitHub Releases)
```powershell
$env:GH_TOKEN = "YOUR_GITHUB_TOKEN"
npm run publish:win
Remove-Item Env:GH_TOKEN
```

Notes:
- Auto-update works only for the installed NSIS build.
- Portable builds do not support silent auto-update.

## Artifacts Location
- `dist/`
- Expected outputs:
  - NSIS installer `.exe` (e.g., `dist/MatekMester Setup <version>.exe`)
  - Portable `.exe` (e.g., `dist/MatekMester <version>.exe`)
  - `latest.yml` + `*.blockmap` (auto-update metadata)

## Release Notes
Use `docs/RELEASE_NOTES_TEMPLATE.md` for each release and record:
- Version number in `package.json`
- Tests executed and environment details
- Artifact names and checksums
