# Release Notes - v0.1.1 (2026-02-26)

## Summary
- Maintenance release focused on release readiness docs and backlog hygiene.
- Version bump from `0.1.0` to `0.1.1`.

## Highlights
- Added concrete release notes artifact from the project template.
- Consolidated recent progress context for the next Windows packaging pass.

## Fixes
- Ensured `package.json` version is incremented for the next tagged build.

## Known Issues
- Windows packaging (`npm run dist:win`) still requires a Windows environment with working `electron-builder` install and symlink privilege.
- Windows smoke + E2E verification remain pending.

## Tests
- `npm run test:unit` (2026-02-26, WSL2)

## Artifacts
- Installer: pending
- Portable: pending
- Checksums: pending
