#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function listTests(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.test.js'))
    .sort()
    .map((name) => path.join(dir, name));
}

function runNodeTests(files, label) {
  if (files.length === 0) {
    console.warn(`No ${label} tests found.`);
    return 0;
  }
  const result = spawnSync(process.execPath, ['--test', ...files], {
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(result.error);
    return 1;
  }
  return result.status ?? 1;
}

const unitTests = listTests(path.join(ROOT_DIR, 'tests', 'unit'));
const e2eTests = listTests(path.join(ROOT_DIR, 'tests', 'e2e'));

const args = process.argv.slice(2);
const runOnlyUnit = args.includes('--unit');
const runOnlyE2E = args.includes('--e2e');

if (runOnlyUnit && runOnlyE2E) {
  console.error('Pick only one: --unit or --e2e.');
  process.exit(1);
}

const IS_WINDOWS = process.platform === 'win32';
const WSL_ENV_VARS = ['WSL_DISTRO_NAME', 'WSL_INTEROP'];
const isWsl = !IS_WINDOWS
  && (WSL_ENV_VARS.some((key) => Boolean(process.env[key]))
    || os.release().toLowerCase().includes('microsoft'));
const hasDisplay = Boolean(
  process.env.DISPLAY
  || process.env.WAYLAND_DISPLAY
  || process.env.MIR_SOCKET
);
const isHeadless = !IS_WINDOWS && !hasDisplay;
const shouldSkipE2E = isWsl || isHeadless;
const isXvfbAttempt = process.env.MATEK_XVFB === '1';

function runE2EWithXvfb() {
  const result = spawnSync(
    'xvfb-run',
    ['-a', process.execPath, __filename, '--e2e'],
    {
      stdio: 'inherit',
      env: { ...process.env, MATEK_XVFB: '1' },
    }
  );
  if (result.error) {
    return null;
  }
  return result.status ?? 1;
}

let exitCode = 0;
if (!runOnlyE2E) {
  exitCode = runNodeTests(unitTests, 'unit');
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
  if (runOnlyUnit) {
    process.exit(0);
  }
}

if (shouldSkipE2E) {
  if (isHeadless && !isWsl && !isXvfbAttempt) {
    const xvfbExit = runE2EWithXvfb();
    if (xvfbExit !== null) {
      process.exit(xvfbExit);
    }
  }
  const reason = isWsl
    ? 'WSL detected; skipping Electron E2E.'
    : 'Headless environment detected; xvfb-run unavailable; skipping Electron E2E.';
  console.log(reason);
  process.exit(0);
}

exitCode = runNodeTests(e2eTests, 'e2e');
process.exit(exitCode);
