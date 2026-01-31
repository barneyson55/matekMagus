const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright-core');
const { repoRoot } = require('../helpers/paths');
const { DEFAULT_TIMEOUT_MS } = require('../helpers/timeouts');
const { BUFF_CATALOG } = require('../../buffs_config');

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
    args: [repoRoot],
    env,
  });

  const page = await app.firstWindow();
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#content-frame');

  return { app, page, userDataDir };
}

async function waitForIframeSrc(page, fragment) {
  await page.waitForFunction((frag) => {
    const frame = document.getElementById('content-frame');
    return frame && frame.src.includes(frag);
  }, fragment);
}

e2eTest('settings overlay save persists selection (scaffold)', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getSettings);

    await page.locator('[data-testid="settings-open"]').click();
    await page.waitForFunction(() => {
      const overlay = document.querySelector('[data-testid="settings-overlay"]');
      return overlay && !overlay.classList.contains('is-hidden');
    });

    await page.locator('[data-testid="theme-card-galaxis"]').click();
    await page.waitForFunction(() => {
      const card = document.querySelector('[data-testid="theme-card-galaxis"]');
      return card && card.classList.contains('selected');
    });

    await page.locator('[data-testid="settings-save"]').click();
    await page.waitForFunction(() => {
      const overlay = document.querySelector('[data-testid="settings-overlay"]');
      return overlay && overlay.classList.contains('is-hidden');
    });

    await page.waitForFunction(async () => {
      const settings = await window.electronAPI.getSettings();
      return settings && settings.themeId === 'galaxis';
    });
  } finally {
    await app.close();
  }
});

e2eTest('settings overlay cancel discards changes (scaffold)', async () => {
  const { app, page, userDataDir } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getSettings);

    await page.locator('[data-testid="settings-open"]').click();
    await page.waitForFunction(() => {
      const overlay = document.querySelector('[data-testid="settings-overlay"]');
      return overlay && !overlay.classList.contains('is-hidden');
    });

    await page.locator('[data-testid="theme-card-galaxis"]').click();
    await page.waitForFunction(() => {
      const card = document.querySelector('[data-testid="theme-card-galaxis"]');
      return card && card.classList.contains('selected');
    });

    await page.locator('[data-testid="settings-cancel"]').click();
    await page.waitForFunction(() => {
      const overlay = document.querySelector('[data-testid="settings-overlay"]');
      return overlay && overlay.classList.contains('is-hidden');
    });

    const settingsPath = path.join(userDataDir, 'settings.json');
    assert.equal(fs.existsSync(settingsPath), false, 'TODO: ensure cancel does not persist settings');
  } finally {
    await app.close();
  }
});

e2eTest('character sheet panels render and tabs switch (scaffold)', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.click('#player-avatar');
    await waitForIframeSrc(page, 'modules/character_sheet.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('[data-testid="character-sheet"]').waitFor();

    assert.equal(await frameLocator.locator('[data-testid="character-sheet-left"]').count(), 1);
    assert.equal(await frameLocator.locator('[data-testid="character-sheet-right"]').count(), 1);

    await frameLocator.locator('[data-testid="character-sheet-tab-results"]').click();
    const frame = page.frame({ url: /modules\/character_sheet\.html/ });
    if (!frame) {
      throw new Error('Character sheet frame not found');
    }
    await frame.waitForFunction(() => {
      const panel = document.querySelector('[data-testid="character-sheet-panel-results"]');
      return panel && panel.classList.contains('is-active');
    });
  } finally {
    await app.close();
  }
});

e2eTest('buff icons expose tooltip text (scaffold)', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const now = new Date().toISOString();
    const buffState = { unlocked: {}, active: [] };
    BUFF_CATALOG.forEach((buff, index) => {
      const unlockedAt = new Date(Date.now() + index * 1000).toISOString();
      buffState.unlocked[buff.id] = { isUnlocked: true, unlockedAt };
      buffState.active.push({ id: buff.id, activatedAt: now });
    });

    await page.evaluate((state) => {
      window.electronAPI.saveBuffState(state);
    }, buffState);
    await page.evaluate(() => window.__refreshProgressSummary && window.__refreshProgressSummary());

    for (const buff of BUFF_CATALOG) {
      const icon = page.locator(`[data-testid="buff-icon-${buff.id}"]`);
      await icon.waitFor();
      const tooltip = await icon.locator('.buff-tooltip').textContent();
      const token = await icon.getAttribute('data-icon');
      assert.ok(tooltip && tooltip.includes(buff.nameHu), 'TODO: confirm buff tooltip uses Hungarian copy');
      assert.equal(token, buff.iconToken, 'TODO: confirm buff icon token mapping');
    }
  } finally {
    await app.close();
  }
});
