# Windows Release Guide (Desktop Only)

## Scope
- Desktop (PC) release packaging for Windows only.
- No mobile scope in this guide.

## Current State (2026-01-27)
- No packaging tool configured in `package.json`.
- Planned standard approach: electron-builder (requires approval to add a devDependency).

## Prerequisites
- Windows 10/11
- Node.js LTS + npm
- Git

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

## Run Tests on Windows
```powershell
npm run test:unit
npm run test
npm run test:e2e
```
Notes:
- `npm run test` runs unit + E2E (E2E should execute on Windows GUI).
- Avoid WSL/headless for E2E; use a native Windows session.

## Packaging (Planned Standard: electron-builder)
This project does not yet include a packaging tool. The steps below are the planned minimal setup
and require explicit approval because they add a new devDependency.

### One-time Setup (pending approval)
```powershell
npm install --save-dev electron-builder
```

Add a minimal `electron-builder.yml` (example):
```yaml
appId: hu.matek.mester
productName: MatekMester
directories:
  output: dist
files:
  - "**/*"
  - "!**/tests/**"
  - "!**/logs/**"
win:
  target:
    - nsis
    - portable
  icon: assets/icon.png
```

### Build Installer + Portable (x64)
```powershell
npx electron-builder --win --x64
```

## Artifacts Location
- Default output directory: `dist/`
- Expected outputs:
  - `dist/win-unpacked/` (unpacked app)
  - NSIS installer `.exe` (e.g., `dist/MatekMester Setup <version>.exe`)
  - Portable `.exe` (e.g., `dist/MatekMester <version>.exe`)

## Release Notes
Use `docs/RELEASE_NOTES_TEMPLATE.md` for each release and record:
- Version number in `package.json`
- Tests executed and environment details
- Artifact names and checksums
