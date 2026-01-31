# Testing

## Commands (Windows)
- `npm install`
- `npm run test` (unit + E2E)
- `npm run test:unit`
- `npm run test:e2e`

## Commands (WSL / Headless)
- `npm run test:unit` (always runs)
- `npm run test` / `npm run test:e2e`
  - WSL: E2E auto-skips by design.
  - Headless Linux: attempts `xvfb-run -a` if available; otherwise skips.

## Automation Policy
- Autopilot must not run tests; only generate/update them.
