const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright-core');

const DEFAULT_TIMEOUT_MS = 15000;
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
const skipReason = isWsl
  ? 'WSL detected; skipping Electron E2E.'
  : 'Headless environment detected; skipping Electron E2E.';
const e2eTest = shouldSkipE2E
  ? (name, fn) => nodeTest(name, { skip: skipReason }, fn)
  : nodeTest;

async function launchApp() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'matek-mester-e2e-'));
  const env = {
    ...process.env,
    APPDATA: userDataDir,
    LOCALAPPDATA: userDataDir,
    MATEK_MESTER_USER_DATA: userDataDir,
    ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: ['.'],
    env,
  });

  const page = await app.firstWindow();
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#content-frame');

  return { app, page };
}

async function waitForIframeSrc(page, fragment) {
  await page.waitForFunction((frag) => {
    const frame = document.getElementById('content-frame');
    return frame && frame.src.includes(frag);
  }, fragment);
}

e2eTest('mobile module tabs use grid layout and avoid overflow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForFunction(() => {
      const tier = getComputedStyle(document.documentElement)
        .getPropertyValue('--viewport-tier')
        .trim();
      return tier === 'mobile';
    });

    await page.waitForFunction(() => document.body.classList.contains('quest-collapsed'));
    await page.click('#quest-toggle');
    await page.waitForFunction(() => !document.body.classList.contains('quest-collapsed'));

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="gondolkodas_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    const moduleLink = page.locator('[data-topic-id="halmazmuveletek"]');
    await moduleLink.scrollIntoViewIfNeeded();
    await moduleLink.click();
    await waitForIframeSrc(page, 'modules/halmazmuveletek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-buttons').waitFor();

    const frame = page.frame({ url: /modules\/halmazmuveletek\.html/ });
    if (!frame) {
      throw new Error('Module frame not found');
    }

    const tabMetrics = await frame.evaluate(() => {
      const tabs = document.querySelector('.tab-buttons');
      const button = tabs ? tabs.querySelector('.tab-button') : null;
      const tabsStyle = tabs ? getComputedStyle(tabs) : null;
      const buttonStyle = button ? getComputedStyle(button) : null;
      const rootStyles = getComputedStyle(document.documentElement);
      return {
        hasTabs: Boolean(tabs),
        display: tabsStyle ? tabsStyle.display : '',
        overflowX: tabsStyle ? tabsStyle.overflowX : '',
        clientWidth: tabs ? tabs.clientWidth : null,
        scrollWidth: tabs ? tabs.scrollWidth : null,
        touchTarget: rootStyles.getPropertyValue('--touch-target-size').trim(),
        buttonMinHeight: buttonStyle ? buttonStyle.minHeight : '',
      };
    });

    assert.ok(tabMetrics.hasTabs);
    assert.equal(tabMetrics.display, 'grid');
    assert.equal(tabMetrics.overflowX, 'hidden');
    assert.ok(tabMetrics.clientWidth !== null && tabMetrics.scrollWidth !== null);
    assert.ok(tabMetrics.scrollWidth <= tabMetrics.clientWidth + 1);
    assert.equal(tabMetrics.touchTarget, '44px');

    const minHeightValue = Number.parseFloat(tabMetrics.buttonMinHeight);
    assert.ok(Number.isFinite(minHeightValue));
    assert.ok(minHeightValue >= 44);
  } finally {
    await app.close();
  }
});
