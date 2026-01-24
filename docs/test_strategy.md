# Test Strategy

## Scope

This repository uses an Electron E2E smoke test as the primary quality gate and
adds a minimal unit-test layer for generator/helper invariants.

## Commands (run from repo root)

1) Install dependencies (first time or after lockfile changes):

```
npm install
```

2) Run the default test alias (unit + E2E):

```
npm run test
```

3) Run the unit tests only:

```
npm run test:unit
```

4) Run the Electron E2E suite directly:

```
npm run test:e2e
```

Notes:
- `npm run test` runs unit tests first and then the E2E suite in a single Node test run.
- `npm run test:unit` runs only the unit tests under `tests/unit/`.
- The E2E command uses Node's test runner on `tests/e2e/electron-smoke.test.js`.
- Playwright browsers are not required because the test launches Electron.

## Unit-test coverage targets (minimal)

Unit tests focus on generator/helper invariants that are hard to validate purely
via UI smoke tests. The minimal targets are:

- RNG helpers: `randomInt`, `shuffle`, `pickNonZero` (range, membership, no mutation).
- Input parsing/formatting: `parseNumberInput` + `formatNumber` handling commas and fractions.
- Geometry generators: `generateTriangleSides` (triangle inequality) and `generateAngles` (sum to 180°).
- Fraction helpers: `simplifyFraction` + `pickFraction` (terminating denominator pools).
- Difficulty helpers: `pickBase`, `pickExponent`, `pickRandomDifficulty` (range + membership).

These tests live in `tests/unit/generator_helpers.test.js` and load module scripts
with a lightweight DOM stub to keep the unit layer dependency-free.

## Deterministic randomness in E2E

Question generation in modules uses `Math.random`, which can make E2E assertions flaky
when uniqueness or question-type coverage is expected. The E2E suite now seeds a
deterministic RNG for each launch:

- `tests/e2e/electron-smoke.test.js` calls `window.__setMatekSeed(<seed>)` after launch.
- `index.html` stores the seed in `localStorage` (`matek-mester-rng-seed`) and
  re-applies a seeded `Math.random` for every iframe load.

To change the seed, update `E2E_RANDOM_SEED` in the test file or pass
`{ randomSeed: <value> }` to `launchApp`. To disable the seed for a run, pass
`{ randomSeed: null }` and clear the storage key if needed.

## Environment behavior (expected)

- Windows (native, with GUI): E2E runs normally.
- Linux/macOS with a display server (X11/Wayland/MIR): E2E runs normally.
- WSL (any): E2E is auto-skipped by design.
- Headless Linux (no DISPLAY/WAYLAND/MIR): E2E is auto-skipped by design.

The skip behavior is implemented in `tests/e2e/electron-smoke.test.js` and reports
one of these reasons:
- "WSL detected; skipping Electron E2E."
- "Headless environment detected; skipping Electron E2E."

## Headless caveats

- In WSL or headless environments, a SKIP status is expected and not a failure.
- If CI needs E2E coverage, use Windows or Linux with a virtual display (Xvfb)
  and set `DISPLAY` so Electron can launch.

## Expected failures

- Expected: E2E tests show as SKIPPED in WSL/headless environments.
- Unexpected: Any failures on Windows or on Linux/macOS with a display should be
  treated as regressions.

## Recording results

After running tests, update `docs/status.md` with the environment and outcome.
