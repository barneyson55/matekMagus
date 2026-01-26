const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright-core');

const DEFAULT_TIMEOUT_MS = 15000;
const E2E_RANDOM_SEED = 424242;
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

const MOBILE_QUEST_MODULES = [
  { id: 'halmazmuveletek', src: 'modules/halmazmuveletek.html' },
  { id: 'linearis_fuggveny', src: 'modules/linearis_fuggveny.html' },
  { id: 'terulet_kerulet', src: 'modules/terulet_kerulet.html' },
  { id: 'kor_helyzetek', src: 'modules/kor_helyzetek.html' },
  { id: 'permutaciok', src: 'modules/permutaciok.html' },
  { id: 'hatarertek', src: 'modules/hatarertek.html' },
];

async function applyE2ERandomSeed(page, seed) {
  if (!Number.isFinite(seed)) return;
  await page.waitForFunction(() => typeof window.__setMatekSeed === 'function');
  await page.evaluate((value) => {
    window.__setMatekSeed(value);
  }, seed);
}

async function launchApp(options = {}) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'matek-mester-e2e-'));
  if (options.seedProgress) {
    fs.writeFileSync(
      path.join(userDataDir, 'progress.json'),
      JSON.stringify(options.seedProgress, null, 2)
    );
  }
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
  const seed = Object.prototype.hasOwnProperty.call(options, 'randomSeed')
    ? options.randomSeed
    : E2E_RANDOM_SEED;
  await applyE2ERandomSeed(page, seed);

  return { app, page, userDataDir };
}

async function waitForIframeSrc(page, fragment) {
  await page.waitForFunction((frag) => {
    const frame = document.getElementById('content-frame');
    return frame && frame.src.includes(frag);
  }, fragment);
}

async function openQuestDrawer(page) {
  const isCollapsed = await page.evaluate(() => document.body.classList.contains('quest-collapsed'));
  if (isCollapsed) {
    await page.click('#quest-toggle');
    await page.waitForFunction(() => !document.body.classList.contains('quest-collapsed'));
  }
}

async function expandAllQuestDetails(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.sidebar details').forEach((detail) => {
      detail.open = true;
    });
  });
}

async function postTestResult(page, overrides = {}) {
  const result = {
    topicId: 'halmazmuveletek',
    topicName: 'Halmazmuveletek',
    difficulty: 'konnyu',
    grade: 5,
    percentage: 95,
    timestamp: new Date().toISOString(),
    questions: [],
    ...overrides,
  };

  await page.evaluate((payload) => {
    window.postMessage({ type: 'testResult', result: payload }, '*');
  }, result);

  return result;
}

async function postLegacyTestResult(page, overrides = {}) {
  const payload = {
    type: 'testResult',
    topicId: 'logikai_szita',
    topicName: 'Logikai szita formula',
    difficulty: 'konnyu',
    grade: 5,
    percentage: 90,
    timestamp: new Date().toISOString(),
    questions: [],
    ...overrides,
  };

  await page.evaluate((legacyPayload) => {
    window.postMessage(legacyPayload, '*');
  }, payload);

  return payload;
}

e2eTest('launches and navigates between modules', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const title = await page.title();
    assert.match(title, /Matek Mester/i);

    await waitForIframeSrc(page, 'modules/placeholder.html');
    await page.waitForFunction(() => {
      const banner = document.getElementById('module-banner');
      const btn = document.getElementById('quest-accept-btn');
      return banner && banner.hidden && btn && btn.hidden;
    });
    await page.waitForFunction(() => !document.querySelector('.sidebar-title'));

    await page.click('#results-btn');
    await waitForIframeSrc(page, 'modules/results.html');
    await page.waitForFunction(() => {
      const banner = document.getElementById('module-banner');
      const title = document.getElementById('module-title-text');
      return banner && !banner.hidden && title && title.textContent.includes('Eredm');
    });
    const frame = page.frameLocator('#content-frame');
    await frame.locator('#results-container').waitFor();
    const headerMatch = await page.evaluate(() => {
      const header = document.querySelector('.app-header');
      const banner = document.getElementById('module-banner');
      if (!header || !banner) return false;
      return getComputedStyle(header).backgroundColor === getComputedStyle(banner).backgroundColor;
    });
    assert.ok(headerMatch);
    const resultsHeaderCount = await frame.locator('h1').count();
    assert.equal(resultsHeaderCount, 0);
    await page.click('#settings-fab');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('settings-overlay');
      return overlay && !overlay.classList.contains('is-hidden');
    });
    await page.click('#settings-close');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('settings-overlay');
      return overlay && overlay.classList.contains('is-hidden');
    });
  } finally {
    await app.close();
  }
});

e2eTest('uses compact header height token', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const headerMetrics = await page.evaluate(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      const headerHeightVar = rootStyles.getPropertyValue('--header-height').trim();
      const headerEl = document.querySelector('.app-header');
      const headerHeight = headerEl ? getComputedStyle(headerEl).height : '';
      const headerMain = document.querySelector('.header-main');
      const headerRowGap = headerMain ? getComputedStyle(headerMain).rowGap : '';
      const burgerIcon = document.querySelector('#quest-toggle .burger-icon');
      const burgerWidth = burgerIcon ? getComputedStyle(burgerIcon).width : '';
      const burgerHeight = burgerIcon ? getComputedStyle(burgerIcon).height : '';
      const levelLabel = document.getElementById('xp-level-label');
      const levelName = document.getElementById('xp-level-name');
      const avatar = document.getElementById('player-avatar');
      return {
        headerHeightVar,
        headerHeight,
        headerRowGap,
        burgerWidth,
        burgerHeight,
        levelNameText: levelName ? levelName.textContent : '',
        levelNameBetween: Boolean(levelLabel && levelName && avatar
          && levelLabel.nextElementSibling === levelName
          && levelName.nextElementSibling === avatar),
      };
    });

    assert.equal(headerMetrics.headerHeightVar, '72px');
    const headerHeightValue = Number.parseFloat(headerMetrics.headerHeight);
    assert.ok(Number.isFinite(headerHeightValue));
    assert.ok(Math.abs(headerHeightValue - 72) < 1);
    const rowGapValue = Number.parseFloat(headerMetrics.headerRowGap);
    assert.ok(Number.isFinite(rowGapValue));
    assert.ok(rowGapValue <= 0.5);
    const burgerWidth = Number.parseFloat(headerMetrics.burgerWidth);
    const burgerHeight = Number.parseFloat(headerMetrics.burgerHeight);
    assert.ok(Number.isFinite(burgerWidth));
    assert.ok(Number.isFinite(burgerHeight));
    assert.ok(burgerWidth >= 38);
    assert.ok(burgerHeight >= 38);
    assert.ok(headerMetrics.levelNameBetween);
    assert.ok(headerMetrics.levelNameText.trim().length > 0);
  } finally {
    await app.close();
  }
});

e2eTest('quest log toggle collapses sidebar', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const initialState = await page.evaluate(() => ({
      collapsed: document.body.classList.contains('quest-collapsed'),
      expanded: document.getElementById('quest-toggle')?.getAttribute('aria-expanded') || ''
    }));

    await page.click('#quest-toggle');

    await page.waitForFunction((initial) => {
      return document.body.classList.contains('quest-collapsed') !== initial;
    }, initialState.collapsed);

    const toggledState = await page.evaluate(() => ({
      collapsed: document.body.classList.contains('quest-collapsed'),
      expanded: document.getElementById('quest-toggle')?.getAttribute('aria-expanded') || ''
    }));

    assert.equal(toggledState.collapsed, !initialState.collapsed);
    assert.equal(toggledState.expanded, String(!toggledState.collapsed));
  } finally {
    await app.close();
  }
});

e2eTest('mobile quest drawer opens and auto-closes', async () => {
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

    const baseState = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      const backdrop = document.getElementById('quest-drawer-backdrop');
      const sidebarStyle = sidebar ? getComputedStyle(sidebar) : null;
      const backdropStyle = backdrop ? getComputedStyle(backdrop) : null;
      return {
        sidebarPosition: sidebarStyle ? sidebarStyle.position : '',
        backdropHidden: backdrop ? backdrop.getAttribute('aria-hidden') : '',
        backdropOpacity: backdropStyle ? backdropStyle.opacity : '',
      };
    });
    assert.equal(baseState.sidebarPosition, 'absolute');
    assert.equal(baseState.backdropHidden, 'true');
    assert.equal(Number.parseFloat(baseState.backdropOpacity), 0);

    await openQuestDrawer(page);

    const openState = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      const backdrop = document.getElementById('quest-drawer-backdrop');
      const backdropStyle = backdrop ? getComputedStyle(backdrop) : null;
      const rect = sidebar ? sidebar.getBoundingClientRect() : null;
      return {
        backdropHidden: backdrop ? backdrop.getAttribute('aria-hidden') : '',
        backdropOpacity: backdropStyle ? backdropStyle.opacity : '',
        sidebarLeft: rect ? rect.left : null,
        sidebarRight: rect ? rect.right : null,
      };
    });
    assert.equal(openState.backdropHidden, 'false');
    assert.ok(Number.parseFloat(openState.backdropOpacity) > 0);
    assert.ok(openState.sidebarLeft <= 1);
    assert.ok(openState.sidebarRight > 0);

    for (const module of MOBILE_QUEST_MODULES) {
      await openQuestDrawer(page);
      await expandAllQuestDetails(page);

      const moduleLink = page.locator(`[data-topic-id="${module.id}"]`).first();
      await moduleLink.scrollIntoViewIfNeeded();
      await moduleLink.click();
      await waitForIframeSrc(page, module.src);

      await page.waitForFunction(() => document.body.classList.contains('quest-collapsed'));
      const closedState = await page.evaluate(() => {
        const backdrop = document.getElementById('quest-drawer-backdrop');
        const backdropStyle = backdrop ? getComputedStyle(backdrop) : null;
        return {
          backdropHidden: backdrop ? backdrop.getAttribute('aria-hidden') : '',
          backdropOpacity: backdropStyle ? backdropStyle.opacity : '',
        };
      });
      assert.equal(closedState.backdropHidden, 'true');
      assert.equal(Number.parseFloat(closedState.backdropOpacity), 0);
    }

    await openQuestDrawer(page);
    await page.click('#quest-drawer-backdrop');
    await page.waitForFunction(() => document.body.classList.contains('quest-collapsed'));
  } finally {
    await app.close();
  }
});

e2eTest('keeps header and quest log stable across orientation changes', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const assertLayoutAtViewport = async (label, width, height) => {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(([targetWidth, targetHeight]) => {
        return window.innerWidth === targetWidth && window.innerHeight === targetHeight;
      }, [width, height]);

      const metrics = await page.evaluate(() => {
        const header = document.querySelector('.app-header');
        const sidebar = document.querySelector('.sidebar');
        const container = document.querySelector('.app-container');
        const headerRect = header ? header.getBoundingClientRect() : null;
        const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
        const containerRect = container ? container.getBoundingClientRect() : null;
        const headerStyle = header ? getComputedStyle(header) : null;
        const sidebarStyle = sidebar ? getComputedStyle(sidebar) : null;
        const rootStyles = getComputedStyle(document.documentElement);
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          tier: rootStyles.getPropertyValue('--viewport-tier').trim(),
          headerRect: headerRect ? {
            top: headerRect.top,
            left: headerRect.left,
            width: headerRect.width,
            height: headerRect.height,
            right: headerRect.right,
            bottom: headerRect.bottom
          } : null,
          sidebarRect: sidebarRect ? {
            top: sidebarRect.top,
            left: sidebarRect.left,
            width: sidebarRect.width,
            height: sidebarRect.height,
            right: sidebarRect.right,
            bottom: sidebarRect.bottom
          } : null,
          containerRect: containerRect ? {
            top: containerRect.top,
            left: containerRect.left,
            width: containerRect.width,
            height: containerRect.height,
            right: containerRect.right,
            bottom: containerRect.bottom
          } : null,
          headerDisplay: headerStyle ? headerStyle.display : '',
          sidebarPosition: sidebarStyle ? sidebarStyle.position : '',
          sidebarTransform: sidebarStyle ? sidebarStyle.transform : '',
          questCollapsed: document.body.classList.contains('quest-collapsed'),
        };
      });

      assert.ok(metrics.headerRect, `${label}: header missing`);
      assert.ok(metrics.sidebarRect, `${label}: sidebar missing`);
      assert.ok(metrics.containerRect, `${label}: container missing`);

      const header = metrics.headerRect;
      const sidebar = metrics.sidebarRect;
      const container = metrics.containerRect;
      const viewport = metrics.viewport;

      assert.ok(Math.abs(header.top) <= 1, `${label}: header top drift`);
      assert.ok(Math.abs(header.left) <= 1, `${label}: header left drift`);
      assert.ok(Math.abs(header.width - viewport.width) <= 1, `${label}: header width mismatch`);
      assert.ok(header.height > 0, `${label}: header height invalid`);
      assert.ok(header.bottom <= viewport.height + 1, `${label}: header bottom out of view`);

      const containerDelta = Math.abs(container.top - header.bottom);
      assert.ok(containerDelta <= 1.5, `${label}: container not aligned to header`);

      const sidebarDelta = Math.abs(sidebar.top - container.top);
      assert.ok(sidebarDelta <= 1.5, `${label}: sidebar not aligned to container`);
      assert.ok(sidebar.height > 0, `${label}: sidebar height invalid`);
      assert.ok(sidebar.right > 0, `${label}: sidebar off-screen`);
      assert.ok(sidebar.left < viewport.width, `${label}: sidebar off-screen`);

      if (metrics.tier === 'mobile') {
        assert.equal(metrics.sidebarPosition, 'absolute', `${label}: sidebar not absolute on mobile`);
        assert.ok(metrics.sidebarTransform.includes('matrix') || metrics.sidebarTransform === 'none',
          `${label}: sidebar transform missing`);
      } else {
        assert.ok(['static', 'relative'].includes(metrics.sidebarPosition),
          `${label}: sidebar position unexpected`);
        const headerHeightDelta = Math.abs(header.height - 72);
        assert.ok(headerHeightDelta <= 2, `${label}: header height drift`);
      }
    };

    await assertLayoutAtViewport('portrait', 390, 844);
    await assertLayoutAtViewport('landscape', 844, 390);
  } finally {
    await app.close();
  }
});

e2eTest('opens character sheet from avatar', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.click('#player-avatar');
    await waitForIframeSrc(page, 'modules/character_sheet.html');

    const frame = page.frameLocator('#content-frame');
    await page.waitForFunction(() => {
      const banner = document.getElementById('module-banner');
      const title = document.getElementById('module-title-text');
      return banner && !banner.hidden && title && title.textContent.includes('Karakterlap');
    });
    const sheetHeaderCount = await frame.locator('.sheet-header').count();
    assert.equal(sheetHeaderCount, 0);
  } finally {
    await app.close();
  }
});

e2eTest('accepts legacy testResult payloads', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const result = await postLegacyTestResult(page);

    const statusSelector = `.status[data-grade-for="${result.topicId}"]`;
    await page.waitForFunction((selector) => {
      const el = document.querySelector(selector);
      return el && el.classList.contains('grade-5');
    }, statusSelector);

    await page.click('#results-btn');
    await waitForIframeSrc(page, 'modules/results.html');

    const frame = page.frameLocator('#content-frame');
    const resultItem = frame.locator('.result-item', { hasText: result.topicName }).first();
    await resultItem.waitFor();
  } finally {
    await app.close();
  }
});

e2eTest('test results apply indicators and formula xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const baseTimestamp = new Date().toISOString();
    const resultA = {
      topicId: 'alapozo_modulzaro',
      topicName: 'Alapozo Modulok',
      difficulty: 'k\u00f6nny\u0171',
      grade: 5,
      percentage: 95,
      timestamp: baseTimestamp,
      questions: [],
    };
    const resultB = {
      topicId: 'gondolkodas_temazaro',
      topicName: 'Gondolkodasi modszer, Halmazok',
      difficulty: 'norm\u00e1l',
      grade: 4,
      percentage: 80,
      timestamp: baseTimestamp,
      questions: [],
    };

    await page.evaluate((payload) => {
      window.postMessage({ type: 'testResult', result: payload }, '*');
    }, resultA);
    await page.waitForFunction((topicId) => {
      const el = document.querySelector(`.status[data-grade-for="${topicId}"]`);
      return el && el.classList.contains('grade-5');
    }, resultA.topicId);

    await page.evaluate((payload) => {
      window.postMessage({ type: 'testResult', result: payload }, '*');
    }, resultB);
    await page.waitForFunction((topicId) => {
      const el = document.querySelector(`.status[data-grade-for="${topicId}"]`);
      return el && el.classList.contains('grade-4');
    }, resultB.topicId);

    await page.waitForFunction(async (expectedXp) => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.xp === expectedXp;
    }, 823);

    const summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.xp, 823);
    assert.equal(summary.level.level, 12);
    assert.equal(summary.level.xpIntoLevel, 34);
    assert.equal(summary.level.xpForNext, 105);
  } finally {
    await app.close();
  }
});

e2eTest('test XP awards only grade improvement delta', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const baseTimestamp = new Date().toISOString();
    const firstResult = {
      topicId: 'halmazmuveletek',
      topicName: 'Halmazmuveletek',
      difficulty: 'norm\u00e1l',
      grade: 3,
      percentage: 65,
      timestamp: baseTimestamp,
      questions: [],
    };
    const secondResult = {
      topicId: 'halmazmuveletek',
      topicName: 'Halmazmuveletek',
      difficulty: 'norm\u00e1l',
      grade: 5,
      percentage: 95,
      timestamp: new Date().toISOString(),
      questions: [],
    };

    await page.evaluate((payload) => {
      window.postMessage({ type: 'testResult', result: payload }, '*');
    }, firstResult);
    await page.waitForFunction((topicId) => {
      const el = document.querySelector(`.status[data-grade-for="${topicId}"]`);
      return el && el.classList.contains('grade-3');
    }, firstResult.topicId);

    await page.evaluate((payload) => {
      window.postMessage({ type: 'testResult', result: payload }, '*');
    }, secondResult);
    await page.waitForFunction((topicId) => {
      const el = document.querySelector(`.status[data-grade-for="${topicId}"]`);
      return el && el.classList.contains('grade-5');
    }, secondResult.topicId);

    await page.waitForFunction(async (expectedXp) => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.xp === expectedXp;
    }, 79);

    const summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.xp, 79);
  } finally {
    await app.close();
  }
});

e2eTest('low grade test does not award xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const result = {
      topicId: 'linearis_fuggveny',
      topicName: 'Linearis fuggveny',
      difficulty: 'k\u00f6nny\u0171',
      grade: 1,
      percentage: 20,
      timestamp: new Date().toISOString(),
      questions: [],
    };

    await page.evaluate((payload) => {
      window.postMessage({ type: 'testResult', result: payload }, '*');
    }, result);

    await page.waitForFunction((topicId) => {
      const el = document.querySelector(`.status[data-grade-for="${topicId}"]`);
      return el && el.classList.contains('grade-1');
    }, result.topicId);

    const summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.xp, 0);
  } finally {
    await app.close();
  }
});

e2eTest('levels update at xp thresholds', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const addPracticeXp = async (amount, expectedTotal) => {
      await page.evaluate((payload) => {
        window.electronAPI.savePracticeXp(payload);
      }, { topicId: 'linearis_fuggveny', xp: amount });

      await page.waitForFunction(async (expectedXp) => {
        const summary = await window.electronAPI.getProgressSummary();
        return summary && summary.xp === expectedXp;
      }, expectedTotal);
    };

    await addPracticeXp(49, 49);
    let summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.level.level, 1);
    assert.equal(summary.level.xpIntoLevel, 49);
    assert.equal(summary.level.xpForNext, 50);

    await addPracticeXp(1, 50);
    summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.level.level, 2);
    assert.equal(summary.level.xpIntoLevel, 0);
    assert.equal(summary.level.xpForNext, 54);

    await addPracticeXp(53, 103);
    summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.level.level, 2);
    assert.equal(summary.level.xpIntoLevel, 53);
    assert.equal(summary.level.xpForNext, 54);

    await addPracticeXp(1, 104);
    summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.level.level, 3);
    assert.equal(summary.level.xpIntoLevel, 0);
    assert.equal(summary.level.xpForNext, 57);
  } finally {
    await app.close();
  }
});

e2eTest('migrates legacy progress data into structured results', async () => {
  const legacyProgress = {
    xp: 120,
    tests: [
      {
        topicId: 'halmazmuveletek',
        topicName: 'Halmazmuveletek',
        difficulty: 'konnyu',
        grade: 4,
        percentage: 80,
        timestamp: new Date('2023-01-01T10:00:00.000Z').toISOString(),
        questions: [],
      },
    ],
    completions: {
      halmazmuveletek: {
        konnyu: { grade: 3, timestamp: new Date('2023-01-01T09:00:00.000Z').toISOString() },
      },
    },
    practiceXp: { halmazmuveletek: 5 },
    quests: { version: 1, topics: { halmazmuveletek: 'ACTIVE' } },
  };

  const { app, page, userDataDir } = await launchApp({ seedProgress: legacyProgress });
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.xp, 120);
    assert.equal(summary.practiceXp.halmazmuveletek, 5);
    assert.equal(summary.quests.topics.halmazmuveletek, 'ACTIVE');
    assert.equal(summary.completions.halmazmuveletek.konnyu.grade, 4);

    const progressPath = path.join(userDataDir, 'progress.json');
    const stored = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    assert.equal(stored.version, 2);
    assert.equal(stored.totalXp, 120);
    assert.equal(stored.xp, undefined);
    assert.equal(stored.completions, undefined);
    assert.ok(stored.results && stored.results.topics && stored.results.topics.halmazmuveletek);
    const diffEntry = stored.results.topics.halmazmuveletek.difficulties.konnyu;
    assert.ok(diffEntry);
    assert.equal(diffEntry.bestGrade, 4);
    assert.ok(Array.isArray(diffEntry.attempts));
    assert.ok(stored.practice && stored.practice.statsByTopic.halmazmuveletek);
    assert.equal(stored.practice.statsByTopic.halmazmuveletek.xpEarned, 5);
    assert.equal(stored.quests.topics.halmazmuveletek, 'ACTIVE');
  } finally {
    await app.close();
  }
});

e2eTest('practice xp updates structured stats', async () => {
  const { app, page, userDataDir } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      window.electronAPI.savePracticeXp({ topicId: 'halmazmuveletek', xp: 2 });
    });

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.practiceXp && summary.practiceXp.halmazmuveletek === 2;
    });

    const progressPath = path.join(userDataDir, 'progress.json');
    const stored = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    const stats = stored.practice.statsByTopic.halmazmuveletek;
    assert.equal(stats.xpEarned, 2);
    assert.equal(stats.correctCount, 1);
    assert.equal(stats.totalCount, 1);
    assert.equal(stats.difficulties.normal.correctCount, 1);
  } finally {
    await app.close();
  }
});

e2eTest('awards achievements on first hard perfect test', async () => {
  const { app, page, userDataDir } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const result = {
      topicId: 'halmazmuveletek',
      topicName: 'Halmazmuveletek',
      difficulty: 'neh\u00e9z',
      grade: 5,
      percentage: 95,
      timestamp: new Date().toISOString(),
      questions: [],
    };

    await page.evaluate((payload) => {
      window.postMessage({ type: 'testResult', result: payload }, '*');
    }, result);

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.achievements
        && summary.achievements.first_test?.isUnlocked
        && summary.achievements.hard_first?.isUnlocked
        && summary.achievements.hard_perfect?.isUnlocked;
    });

    const progressPath = path.join(userDataDir, 'progress.json');
    const stored = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    assert.ok(stored.achievements && stored.achievements.first_test && stored.achievements.first_test.isUnlocked);
  } finally {
    await app.close();
  }
});

e2eTest('character sheet reflects quest counts and achievements', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      const questState = {
        version: 2,
        mainTopics: { alapozo_modulzaro: 'ACTIVE' },
        subtopics: { gondolkodas_temazaro: 'COMPLETED' },
        topics: { halmazmuveletek: 'COMPLETED', logikai_szita: 'ACTIVE' },
      };
      try {
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
      if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
        window.electronAPI.saveQuestState(questState);
      }
    });

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.quests
        && summary.quests.mainTopics?.alapozo_modulzaro === 'ACTIVE'
        && summary.quests.subtopics?.gondolkodas_temazaro === 'COMPLETED'
        && summary.quests.topics?.logikai_szita === 'ACTIVE';
    });

    await page.evaluate(() => {
      if (window.electronAPI && typeof window.electronAPI.saveTestResult === 'function') {
        window.electronAPI.saveTestResult({
          topicId: 'halmazmuveletek',
          topicName: 'Halmazmuveletek',
          difficulty: 'k\u00f6nny\u0171',
          grade: 2,
          percentage: 55,
          timestamp: new Date().toISOString(),
          questions: [],
        });
      }
    });

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.achievements && summary.achievements.first_test?.isUnlocked;
    });

    await page.click('#player-avatar');
    await waitForIframeSrc(page, 'modules/character_sheet.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('#stat-active').waitFor();
    const frame = page.frame({ url: /modules\/character_sheet\.html/ });
    if (!frame) {
      throw new Error('Character sheet frame not found');
    }
    await frame.waitForFunction(() => {
      const active = document.getElementById('stat-active')?.textContent?.trim() || '';
      const completed = document.getElementById('stat-completed')?.textContent?.trim() || '';
      return active === '2' && completed === '2';
    });
    const stats = await frame.evaluate(() => ({
      active: document.getElementById('stat-active')?.textContent || '',
      completed: document.getElementById('stat-completed')?.textContent || '',
    }));
    assert.equal(stats.active.trim(), '2');
    assert.equal(stats.completed.trim(), '2');

    const unlocked = frameLocator.locator('.achievement-item.is-unlocked[data-achievement-id="first_test"]');
    await unlocked.waitFor();
    const unlockedCount = await unlocked.count();
    assert.equal(unlockedCount, 1);
  } finally {
    await app.close();
  }
});

e2eTest('accepts quests from the module banner', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { halmazmuveletek: 'NOT_ACCEPTED' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="gondolkodas_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="halmazmuveletek"]');
    await page.waitForFunction(() => {
      const lock = document.getElementById('module-lock');
      const frame = document.getElementById('content-frame');
      return lock && !lock.classList.contains('is-hidden') && frame && frame.classList.contains('is-hidden');
    });

    await page.waitForFunction(() => {
      const banner = document.getElementById('module-banner');
      return banner && !banner.hidden;
    });

    const acceptBtn = page.locator('#quest-accept-btn');
    await acceptBtn.waitFor({ state: 'visible' });
    await acceptBtn.click();

    await page.waitForFunction(() => {
      const btn = document.getElementById('quest-accept-btn');
      return btn && btn.hidden;
    });

    await page.waitForFunction(() => {
      const lock = document.getElementById('module-lock');
      const frame = document.getElementById('content-frame');
      return lock && lock.classList.contains('is-hidden') && frame && !frame.classList.contains('is-hidden');
    });

    await waitForIframeSrc(page, 'modules/halmazmuveletek.html');

    await page.waitForFunction(() => {
      const link = document.querySelector('[data-topic-id="halmazmuveletek"]');
      return link && link.dataset.questStatus === 'ACTIVE';
    });
    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="halmazmuveletek"]');
      return circle && circle.dataset.questStatus === 'ACTIVE';
    });

    const questStatus = await page.evaluate(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.quests && summary.quests.topics
        ? summary.quests.topics.halmazmuveletek
        : null;
    });
    assert.equal(questStatus, 'ACTIVE');
  } finally {
    await app.close();
  }
});

e2eTest('aggregates quest status up the hierarchy', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const baseTimestamp = new Date().toISOString();
    const results = [
      { difficulty: 'k\u00f6nny\u0171', grade: 5 },
      { difficulty: 'norm\u00e1l', grade: 5 },
      { difficulty: 'neh\u00e9z', grade: 5 },
    ];

    for (const entry of results) {
      await page.evaluate((payload) => {
        window.postMessage({ type: 'testResult', result: payload }, '*');
      }, {
        topicId: 'halmazmuveletek',
        topicName: 'Halmazmuveletek',
        difficulty: entry.difficulty,
        grade: entry.grade,
        percentage: 100,
        timestamp: baseTimestamp,
        questions: [],
      });
    }

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="halmazmuveletek"]');
      return circle && circle.classList.contains('grade-5');
    });

    const summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.quests.topics.halmazmuveletek, 'COMPLETED');
    assert.equal(summary.quests.subtopics.gondolkodas_temazaro, 'ACTIVE');
    assert.equal(summary.quests.mainTopics.alapozo_modulzaro, 'ACTIVE');
  } finally {
    await app.close();
  }
});

e2eTest('practice accepts formatted set answers', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { halmazmuveletek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="gondolkodas_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="halmazmuveletek"]');
    await waitForIframeSrc(page, 'modules/halmazmuveletek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    await page.waitForFunction(() => {
      const subtitle = document.getElementById('module-subtitle');
      return subtitle && subtitle.textContent.includes('Gyakorl');
    });
    await frameLocator.locator('#start-practice-btn').click();
    await frameLocator.locator('#practice-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/halmazmuveletek\.html/ });
    if (!frame) {
      throw new Error('Module frame not found');
    }

    await frame.waitForFunction(() => typeof currentPracticeAnswer === 'string');
    const practiceSamples = await frame.evaluate(() => {
      const samples = [];
      for (let i = 0; i < 6; i += 1) {
        if (typeof nextPracticeQuestion === 'function') {
          nextPracticeQuestion();
        }
        const question = document.getElementById('practice-question')?.textContent || '';
        const answer = (typeof currentPracticeAnswer === 'string') ? currentPracticeAnswer : '';
        const difficulty = (typeof currentPracticeDifficulty === 'string') ? currentPracticeDifficulty : '';
        const kind = (typeof currentPracticeKind === 'string') ? currentPracticeKind : '';
        samples.push({ question, answer, difficulty, kind });
      }
      return samples;
    });
    const practiceSignatures = practiceSamples.map((item) => (
      `${item.difficulty}|${item.kind}|${item.question}|${item.answer}`
    ));
    assert.equal(new Set(practiceSignatures).size, practiceSignatures.length);
    practiceSamples.forEach((item) => {
      assert.ok(['union', 'intersection', 'diff_ab', 'diff_ba', 'comp_a', 'symdiff'].includes(item.kind));
    });
    const inputValue = await frame.evaluate(() => {
      const answer = (typeof currentPracticeAnswer === 'string') ? currentPracticeAnswer : '';
      if (!answer.trim()) return '∅';
      const parts = answer.split(',').map(item => item.trim()).filter(Boolean);
      return `{ ${parts.join(', ')} }`;
    });

    const input = frameLocator.locator('#practice-input');
    await input.fill(inputValue);
    await input.press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes');
    });
  } finally {
    await app.close();
  }
});

e2eTest('halmaz module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { halmazmuveletek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="gondolkodas_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="halmazmuveletek"]');
    await waitForIframeSrc(page, 'modules/halmazmuveletek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();

    const frame = page.frame({ url: /modules\/halmazmuveletek\.html/ });
    if (!frame) {
      throw new Error('Halmaz module frame not found');
    }

    await frame.waitForFunction(() => {
      const testArea = document.getElementById('test-area');
      return testArea && getComputedStyle(testArea).display !== 'none';
    });
    await frame.waitForFunction(() => Array.isArray(questions) && questions.length > 0);
    const totalQuestions = await frame.evaluate(() => questions.length);
    assert.equal(totalQuestions, 10);

    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    for (let i = 0; i < totalQuestions; i += 1) {
      const payload = await frame.evaluate(() => {
        const q = questions[currentQuestionIndex];
        return q ? { type: q.type, answer: q.a } : null;
      });
      if (!payload) {
        throw new Error('Question payload missing');
      }
      if (payload.type === 'mc') {
        await frameLocator
          .locator(`#test-area label[for=\"opt${payload.answer}\"]`)
          .click();
      } else {
        await frameLocator.locator('#test-area .options-input').fill(String(payload.answer));
      }
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }

    await frameLocator.locator('#finish-test-btn').click();
    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });
  } finally {
    await app.close();
  }
});

e2eTest('linearis module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      window.lastTestResult = null;
      window.addEventListener('message', (event) => {
        if (event && event.data && event.data.type === 'testResult') {
          window.lastTestResult = event.data.result || null;
        }
      });
    });

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { linearis_fuggveny: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="linearis_fuggveny"]');
    await waitForIframeSrc(page, 'modules/linearis_fuggveny.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await difficultyButtons.nth(1).click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/linearis_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Linearis module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 3);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);
    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'number');
      const payload = await frame.evaluate(() => ({
        answer: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      const answer = payload.answer;
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(answer));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    const expectedKindsCount = await frame.evaluate(() => Array.isArray(QUESTION_TYPES) ? QUESTION_TYPES.length : 0);
    assert.equal(seenKinds.size, expectedKindsCount);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      return window.lastTestResult
        && Array.isArray(window.lastTestResult.questions)
        && window.lastTestResult.questions.length > 0;
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="linearis_fuggveny"]');
      return circle && circle.classList.contains('grade-5');
    });

    const resultPayload = await page.evaluate(() => window.lastTestResult);
    assert.equal(resultPayload.topicId, 'linearis_fuggveny');
    assert.equal(resultPayload.difficulty, 'normál');
    assert.equal(resultPayload.questions.length, totalQuestions);
    resultPayload.questions.forEach((question) => {
      assert.ok(question.question);
      assert.ok(question.kind);
      assert.ok(Number.isFinite(question.expectedValue));
      assert.ok(question.correctAnswer);
      assert.equal(question.isCorrect, true);
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(DIFFICULTY_LABELS || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        const signatures = questions.map((q) => `${q.kind}|${q.question}|${q.answer}`);
        const uniqueCount = new Set(signatures).size;
        const kinds = new Set(questions.map(q => q.kind));
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersFinite: questions.every(q => typeof q.answer === 'number' && Number.isFinite(q.answer)),
          kindsValid: questions.every(q => QUESTION_TYPES.includes(q.kind)),
          unique: uniqueCount === questions.length,
          hasAllKinds: QUESTION_TYPES.every(type => kinds.has(type))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersFinite);
      assert.ok(entry.kindsValid);
      assert.ok(entry.unique);
      assert.ok(entry.hasAllKinds);
    });
  } finally {
    await app.close();
  }
});

e2eTest('linearis module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { linearis_fuggveny: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="linearis_fuggveny"]');
    await waitForIframeSrc(page, 'modules/linearis_fuggveny.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorlás' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/linearis_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Linearis module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'number');
    const practiceSamples = await frame.evaluate(() => {
      const samples = [];
      for (let i = 0; i < 6; i += 1) {
        if (typeof nextPracticeQuestion === 'function') {
          nextPracticeQuestion();
        }
        const question = document.getElementById('practice-question')?.textContent || '';
        const answer = (typeof window.currentPracticeAnswer === 'number') ? window.currentPracticeAnswer : null;
        const difficulty = (typeof window.currentPracticeDifficulty === 'string') ? window.currentPracticeDifficulty : '';
        const kind = (typeof window.currentPracticeKind === 'string') ? window.currentPracticeKind : '';
        samples.push({ question, answer, difficulty, kind });
      }
      return samples;
    });
    const practiceSignatures = practiceSamples.map((item) => (
      `${item.difficulty}|${item.kind}|${item.question}|${item.answer}`
    ));
    assert.equal(new Set(practiceSignatures).size, practiceSignatures.length);
    practiceSamples.forEach((item) => {
      assert.ok(['value-from-equation', 'slope-from-points', 'intercept-from-point', 'x-intercept'].includes(item.kind));
    });
    const practicePayload = await frame.evaluate(() => ({
      answer: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    const answer = practicePayload.answer;
    assert.ok(['value-from-equation', 'slope-from-points', 'intercept-from-point', 'x-intercept'].includes(practicePayload.kind));
    await frameLocator.locator('#practice-input').fill(String(answer));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('linearis visual model updates equation', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { linearis_fuggveny: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="linearis_fuggveny"]');
    await waitForIframeSrc(page, 'modules/linearis_fuggveny.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/linearis_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Linearis module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('sliderM'));
    await frame.evaluate(() => {
      const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = String(value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('sliderM', 3);
      setValue('sliderB', -2);
    });

    const equationText = await frame.evaluate(() => {
      const equation = document.getElementById('equation');
      const valueM = document.getElementById('valueM');
      const valueB = document.getElementById('valueB');
      return {
        equation: equation ? equation.textContent : '',
        valueM: valueM ? valueM.textContent : '',
        valueB: valueB ? valueB.textContent : ''
      };
    });
    assert.ok(equationText.equation.includes('3x'));
    assert.ok(equationText.equation.includes('- 2'));
    assert.equal(equationText.valueM.trim(), '3');
    assert.equal(equationText.valueB.trim(), '-2');
  } finally {
    await app.close();
  }
});

e2eTest('masodfoku fuggveny module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { masodfoku_fuggveny: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="masodfoku_fuggveny"]');
    await waitForIframeSrc(page, 'modules/masodfoku_fuggveny.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/masodfoku_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Masodfoku fuggveny module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="masodfoku_fuggveny"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('masodfoku fuggveny module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { masodfoku_fuggveny: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="masodfoku_fuggveny"]');
    await waitForIframeSrc(page, 'modules/masodfoku_fuggveny.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/masodfoku_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Masodfoku fuggveny module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('masodfoku fuggveny visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { masodfoku_fuggveny: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="masodfoku_fuggveny"]');
    await waitForIframeSrc(page, 'modules/masodfoku_fuggveny.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/masodfoku_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Masodfoku fuggveny module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('quadf-a'));
    await frame.evaluate(() => {
      const a = document.getElementById('quadf-a');
      const b = document.getElementById('quadf-b');
      const c = document.getElementById('quadf-c');
      if (!a || !b || !c) return;
      a.value = '1';
      b.value = '-4';
      c.value = '3';
      a.dispatchEvent(new Event('input', { bubbles: true }));
      b.dispatchEvent(new Event('input', { bubbles: true }));
      c.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const equation = document.getElementById('parabola-equation')?.textContent || '';
      const axis = document.getElementById('parabola-axis')?.textContent || '';
      const vertex = document.getElementById('parabola-vertex')?.textContent || '';
      const range = document.getElementById('parabola-range')?.textContent || '';
      const root1 = document.getElementById('parabola-root-1')?.textContent || '';
      const root2 = document.getElementById('parabola-root-2')?.textContent || '';
      const yIntercept = document.getElementById('parabola-y-intercept')?.textContent || '';
      return equation.trim() === 'f(x) = x^2 - 4x + 3'
        && axis.trim() === 'x = 2'
        && vertex.trim() === '(2, -1)'
        && range.trim() === 'y >= -1'
        && root1.trim() === '1'
        && root2.trim() === '3'
        && yIntercept.trim() === '3';
    });
  } finally {
    await app.close();
  }
});

e2eTest('hatvanyfuggvenyek module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { hatvanyfuggvenyek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="hatvanyfuggvenyek"]');
    await waitForIframeSrc(page, 'modules/hatvanyfuggvenyek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/hatvanyfuggvenyek\.html/ });
    if (!frame) {
      throw new Error('Hatvanyfuggvenyek module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="hatvanyfuggvenyek"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('hatvanyfuggvenyek module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { hatvanyfuggvenyek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="hatvanyfuggvenyek"]');
    await waitForIframeSrc(page, 'modules/hatvanyfuggvenyek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/hatvanyfuggvenyek\.html/ });
    if (!frame) {
      throw new Error('Hatvanyfuggvenyek module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeExpected?.answerString || window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
      difficulty: window.currentPracticeDifficulty,
    }));
    assert.ok(practicePayload.kind);
    assert.equal(practicePayload.difficulty, 'neh\u00e9z');
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#check-practice-btn').click();
    await frame.evaluate(() => {
      if (typeof checkPracticeAnswer === 'function') {
        checkPracticeAnswer();
      }
    });

    await frame.waitForTimeout(200);
    const debugState = await frame.evaluate(() => ({
      feedbackExists: Boolean(document.getElementById('practice-feedback')),
      feedbackText: document.getElementById('practice-feedback')?.textContent || '',
      checkPracticeType: typeof checkPracticeAnswer,
      practiceActiveType: typeof practiceActive,
      practiceActiveValue: typeof practiceActive !== 'undefined' ? practiceActive : null
    }));
    assert.ok(debugState.feedbackExists, `Feedback element missing: ${JSON.stringify(debugState)}`);
    assert.ok(debugState.feedbackText.trim().length > 0, `No feedback: ${JSON.stringify(debugState)}`);
    const feedbackText = debugState.feedbackText;
    assert.ok(feedbackText.includes('Helyes'), `Unexpected feedback: ${feedbackText}`);
    assert.ok(feedbackText.includes('+3 XP'), `Unexpected feedback: ${feedbackText}`);

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.xp > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('hatvanyfuggvenyek visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { hatvanyfuggvenyek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="hatvanyfuggvenyek"]');
    await waitForIframeSrc(page, 'modules/hatvanyfuggvenyek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/hatvanyfuggvenyek\.html/ });
    if (!frame) {
      throw new Error('Hatvanyfuggvenyek module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('power-coef'));
    await frame.evaluate(() => {
      const coef = document.getElementById('power-coef');
      const exp = document.getElementById('power-exp');
      const xValue = document.getElementById('power-x');
      if (!coef || !exp || !xValue) return;
      coef.value = '-2';
      exp.value = '3';
      xValue.value = '2';
      coef.dispatchEvent(new Event('input', { bubbles: true }));
      exp.dispatchEvent(new Event('input', { bubbles: true }));
      xValue.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const equation = document.getElementById('power-equation')?.textContent || '';
      const domain = document.getElementById('power-domain')?.textContent || '';
      const range = document.getElementById('power-range')?.textContent || '';
      const parity = document.getElementById('power-parity')?.textContent || '';
      const monotonicity = document.getElementById('power-monotonicity')?.textContent || '';
      const value = document.getElementById('power-value')?.textContent || '';
      return equation.trim() === 'f(x) = -2x^3'
        && domain.trim() === 'R'
        && range.trim() === 'R'
        && parity.trim() === 'P\u00e1ratlan'
        && monotonicity.trim() === 'Szigor\u00faan cs\u00f6kken\u0151'
        && value.trim() === '-16';
    });
  } finally {
    await app.close();
  }
});

e2eTest('logikai szita module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { logikai_szita: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="gondolkodas_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="logikai_szita"]');
    await waitForIframeSrc(page, 'modules/logikai_szita.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await difficultyButtons.nth(1).click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/logikai_szita\.html/ });
    if (!frame) {
      throw new Error('Logikai szita module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 3);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);
    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'number');
      const payload = await frame.evaluate(() => ({
        answer: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      const answer = payload.answer;
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(answer));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 2);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="logikai_szita"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = [DIFF_EASY, DIFF_NORMAL, DIFF_HARD];
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        const allowed = QUESTION_TYPES_BY_DIFFICULTY[difficulty] || [];
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersFinite: questions.every(q => typeof q.answer === 'number' && Number.isFinite(q.answer)),
          kindsValid: questions.every(q => allowed.includes(q.kind))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersFinite);
      assert.ok(entry.kindsValid);
    });
  } finally {
    await app.close();
  }
});

e2eTest('logikai szita module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { logikai_szita: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="gondolkodas_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="logikai_szita"]');
    await waitForIframeSrc(page, 'modules/logikai_szita.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorlás' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="könnyű"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="nehéz"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/logikai_szita\.html/ });
    if (!frame) {
      throw new Error('Logikai szita module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'number');
    const practiceSamples = await frame.evaluate(() => {
      const samples = [];
      for (let i = 0; i < 6; i += 1) {
        if (typeof nextPracticeQuestion === 'function') {
          nextPracticeQuestion();
        }
        const question = document.getElementById('practice-question')?.textContent || '';
        const answer = (typeof window.currentPracticeAnswer === 'number') ? window.currentPracticeAnswer : null;
        const difficulty = (typeof window.currentPracticeDifficulty === 'string') ? window.currentPracticeDifficulty : '';
        const kind = (typeof window.currentPracticeKind === 'string') ? window.currentPracticeKind : '';
        samples.push({ question, answer, difficulty, kind });
      }
      return samples;
    });
    const practiceSignatures = practiceSamples.map((item) => (
      `${item.difficulty}|${item.kind}|${item.question}|${item.answer}`
    ));
    assert.equal(new Set(practiceSignatures).size, practiceSignatures.length);
    practiceSamples.forEach((item) => {
      assert.ok(['set-union', 'set-intersection', 'multiples-union', 'multiples-intersection'].includes(item.kind));
    });
    const practicePayload = await frame.evaluate(() => ({
      answer: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    const answer = practicePayload.answer;
    assert.ok(['set-union', 'set-intersection', 'multiples-union', 'multiples-intersection'].includes(practicePayload.kind));
    await frameLocator.locator('#practice-input').fill(String(answer));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('logikai szita visual model updates counts', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { logikai_szita: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="gondolkodas_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="logikai_szita"]');
    await waitForIframeSrc(page, 'modules/logikai_szita.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/logikai_szita\.html/ });
    if (!frame) {
      throw new Error('Logikai szita module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('set-size-a'));
    await frame.evaluate(() => {
      const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = String(value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('set-size-a', 14);
      setValue('set-size-b', 9);
      setValue('set-intersection', 5);
      setValue('range-n', 60);
      setValue('range-a', 4);
      setValue('range-b', 6);
    });

    const setResults = await frame.evaluate(() => ({
      union: document.getElementById('set-union-value')?.textContent || '',
      onlyA: document.getElementById('set-only-a')?.textContent || '',
      onlyB: document.getElementById('set-only-b')?.textContent || '',
      intersection: document.getElementById('set-intersection-value')?.textContent || '',
      formula: document.getElementById('set-formula')?.textContent || ''
    }));
    assert.equal(setResults.union.trim(), '18');
    assert.equal(setResults.onlyA.trim(), '9');
    assert.equal(setResults.onlyB.trim(), '4');
    assert.equal(setResults.intersection.trim(), '5');
    assert.ok(setResults.formula.includes('18'));

    const rangeResults = await frame.evaluate(() => ({
      union: document.getElementById('range-count-union')?.textContent || '',
      countA: document.getElementById('range-count-a')?.textContent || '',
      countB: document.getElementById('range-count-b')?.textContent || '',
      countBoth: document.getElementById('range-count-both')?.textContent || '',
      formula: document.getElementById('range-formula')?.textContent || ''
    }));
    assert.equal(rangeResults.countA.trim(), '15');
    assert.equal(rangeResults.countB.trim(), '10');
    assert.equal(rangeResults.countBoth.trim(), '5');
    assert.equal(rangeResults.union.trim(), '20');
    assert.ok(rangeResults.formula.includes('20'));
  } finally {
    await app.close();
  }
});

e2eTest('skatulya elv module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { skatulya_elv: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="gondolkodas_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="skatulya_elv"]');
    await waitForIframeSrc(page, 'modules/skatulya_elv.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role=\"practice-help\"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value=\"k\u00f6nny\u0171\"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value=\"norm\u00e1l\"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value=\"neh\u00e9z\"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/skatulya_elv\.html/ });
    if (!frame) {
      throw new Error('Skatulya elv module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'number');
    const practicePayload = await frame.evaluate(() => ({
      answer: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(['min-per-box', 'pair-guarantee', 'k-of-same', 'remainder'].includes(practicePayload.kind));
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answer));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.trim().length > 0;
    });
    const feedbackText = await frame.evaluate(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback ? feedback.textContent : '';
    });
    assert.ok(feedbackText.includes('Helyes'), `Unexpected feedback: ${feedbackText}`);
    assert.ok(feedbackText.includes('+3 XP'), `Unexpected feedback: ${feedbackText}`);

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('skatulya elv visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { skatulya_elv: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id=\"alapozo_modulzaro\"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id=\"gondolkodas_temazaro\"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id=\"skatulya_elv\"]');
    await waitForIframeSrc(page, 'modules/skatulya_elv.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/skatulya_elv\.html/ });
    if (!frame) {
      throw new Error('Skatulya elv module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('pigeon-items'));
    await frame.evaluate(() => {
      const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = String(value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('pigeon-items', 10);
      setValue('pigeon-boxes', 3);
      setValue('pair-colors', 5);
      setValue('pair-needed', 3);
    });

    const pigeonResults = await frame.evaluate(() => ({
      min: document.getElementById('pigeon-min')?.textContent || '',
      distribution: Array.from(document.querySelectorAll('#pigeon-grid .box-cell strong'))
        .map(el => el.textContent || '')
    }));
    assert.equal(pigeonResults.min.trim(), '4');
    assert.deepEqual(pigeonResults.distribution.map(value => value.trim()), ['4', '3', '3']);

    const pairResult = await frame.evaluate(() => (
      document.getElementById('pair-min')?.textContent || ''
    ));
    assert.equal(pairResult.trim(), '11');
  } finally {
    await app.close();
  }
});

e2eTest('oszthatosag module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { oszthatosag: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="oszthatosag"]');
    await waitForIframeSrc(page, 'modules/oszthatosag.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await difficultyButtons.nth(1).click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/oszthatosag\.html/ });
    if (!frame) {
      throw new Error('Oszthatosag module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);
    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 2);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="oszthatosag"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(DIVISORS_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answerTypes: questions.every(q => typeof q.answer === 'boolean'),
          answerTextOk: questions.every(q => q.answerText === 'igen' || q.answerText === 'nem'),
          kindOk: questions.every(q => typeof q.kind === 'string' && q.kind.startsWith('divisible-'))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answerTypes);
      assert.ok(entry.answerTextOk);
      assert.ok(entry.kindOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('oszthatosag module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { oszthatosag: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="oszthatosag"]');
    await waitForIframeSrc(page, 'modules/oszthatosag.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/oszthatosag\.html/ });
    if (!frame) {
      throw new Error('Oszthatosag module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind && practicePayload.kind.startsWith('divisible-'));
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('oszthatosag visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { oszthatosag: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="oszthatosag"]');
    await waitForIframeSrc(page, 'modules/oszthatosag.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/oszthatosag\.html/ });
    if (!frame) {
      throw new Error('Oszthatosag module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('check-number'));
    await frame.evaluate(() => {
      const input = document.getElementById('check-number');
      if (!input) return;
      input.value = '121';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('digit-sum')?.textContent || '';
      return value.trim() === '4';
    });

    const snapshot = await frame.evaluate(() => ({
      digitSum: document.getElementById('digit-sum')?.textContent || '',
      lastTwo: document.getElementById('last-two')?.textContent || '',
      lastThree: document.getElementById('last-three')?.textContent || '',
      altSum: document.getElementById('alt-sum')?.textContent || '',
      rule11Ok: document.getElementById('rule-11-status')?.classList.contains('status-ok') ?? null,
      rule2Bad: document.getElementById('rule-2-status')?.classList.contains('status-bad') ?? null,
      rule3Bad: document.getElementById('rule-3-status')?.classList.contains('status-bad') ?? null,
    }));
    assert.equal(snapshot.digitSum.trim(), '4');
    assert.equal(snapshot.lastTwo.trim(), '21');
    assert.equal(snapshot.lastThree.trim(), '121');
    assert.equal(snapshot.altSum.trim(), '0');
    assert.equal(snapshot.rule11Ok, true);
    assert.equal(snapshot.rule2Bad, true);
    assert.equal(snapshot.rule3Bad, true);
  } finally {
    await app.close();
  }
});

e2eTest('lnko lkkt module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { lnko_lkkt: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="lnko_lkkt"]');
    await waitForIframeSrc(page, 'modules/lnko_lkkt.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await difficultyButtons.nth(1).click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/lnko_lkkt\.html/ });
    if (!frame) {
      throw new Error('LNKO LKKT module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);
    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'number');
      const payload = await frame.evaluate(() => ({
        answer: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answer));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 2);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="lnko_lkkt"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersFinite: questions.every(q => typeof q.answer === 'number' && Number.isFinite(q.answer)),
          kindsValid: questions.every(q => q.kind === 'lnko' || q.kind === 'lkkt')
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersFinite);
      assert.ok(entry.kindsValid);
    });
  } finally {
    await app.close();
  }
});

e2eTest('lnko lkkt module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { lnko_lkkt: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="lnko_lkkt"]');
    await waitForIframeSrc(page, 'modules/lnko_lkkt.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/lnko_lkkt\.html/ });
    if (!frame) {
      throw new Error('LNKO LKKT module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'number');
    const practicePayload = await frame.evaluate(() => ({
      answer: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind === 'lnko' || practicePayload.kind === 'lkkt');
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answer));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('lnko lkkt visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { lnko_lkkt: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="lnko_lkkt"]');
    await waitForIframeSrc(page, 'modules/lnko_lkkt.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/lnko_lkkt\.html/ });
    if (!frame) {
      throw new Error('LNKO LKKT module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('number-a'));
    await frame.evaluate(() => {
      const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = String(value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('number-a', 48);
      setValue('number-b', 18);
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('gcd-value')?.textContent || '';
      return value.trim() === '6';
    });

    const snapshot = await frame.evaluate(() => ({
      gcd: document.getElementById('gcd-value')?.textContent || '',
      lcm: document.getElementById('lcm-value')?.textContent || '',
      steps: document.querySelectorAll('#euclid-steps li').length,
      gcdSummary: document.getElementById('gcd-summary')?.textContent || '',
      lcmSummary: document.getElementById('lcm-summary')?.textContent || ''
    }));
    assert.equal(snapshot.gcd.trim(), '6');
    assert.equal(snapshot.lcm.trim(), '144');
    assert.ok(snapshot.steps > 0);
    assert.equal(snapshot.gcdSummary.trim(), '6');
    assert.equal(snapshot.lcmSummary.trim(), '144');
  } finally {
    await app.close();
  }
});

e2eTest('primtenyezok module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { primtenyezok: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="primtenyezok"]');
    await waitForIframeSrc(page, 'modules/primtenyezok.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await difficultyButtons.nth(1).click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/primtenyezok\.html/ });
    if (!frame) {
      throw new Error('Primtenyezok module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);
    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="primtenyezok"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(NUMBER_RANGES || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          numbersOk: questions.every(q => typeof q.number === 'number' && Number.isFinite(q.number)),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          factorsMatch: questions.every(q => {
            const data = factorizeNumber(q.number);
            const map = buildFactorMap(data.factors);
            return buildFactorString(map) === q.answerString;
          })
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.numbersOk);
      assert.ok(entry.answersOk);
      assert.ok(entry.factorsMatch);
    });
  } finally {
    await app.close();
  }
});

e2eTest('primtenyezok module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { primtenyezok: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="primtenyezok"]');
    await waitForIframeSrc(page, 'modules/primtenyezok.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/primtenyezok\.html/ });
    if (!frame) {
      throw new Error('Primtenyezok module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind === 'factorization');
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('primtenyezok visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { primtenyezok: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="primtenyezok"]');
    await waitForIframeSrc(page, 'modules/primtenyezok.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/primtenyezok\.html/ });
    if (!frame) {
      throw new Error('Primtenyezok module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('factor-number'));
    await frame.evaluate(() => {
      const input = document.getElementById('factor-number');
      if (!input) return;
      input.value = '360';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('factor-string')?.textContent || '';
      return value.trim() === '2^3 * 3^2 * 5';
    });

    const snapshot = await frame.evaluate(() => ({
      factorString: document.getElementById('factor-string')?.textContent || '',
      primeFlag: document.getElementById('prime-flag')?.textContent || '',
      chips: Array.from(document.querySelectorAll('#factor-list .factor-chip')).map(el => el.textContent || ''),
      steps: document.querySelectorAll('#factor-steps li').length
    }));
    assert.equal(snapshot.factorString.trim(), '2^3 * 3^2 * 5');
    assert.equal(snapshot.primeFlag.trim(), 'Nem');
    assert.deepEqual(snapshot.chips.map(text => text.trim()), ['2^3', '3^2', '5']);
    assert.ok(snapshot.steps > 0);
  } finally {
    await app.close();
  }
});

e2eTest('szamrendszerek module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szamrendszerek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szamrendszerek"]');
    await waitForIframeSrc(page, 'modules/szamrendszerek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/szamrendszerek\.html/ });
    if (!frame) {
      throw new Error('Szamrendszerek module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="szamrendszerek"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(NUMBER_RANGES || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          numbersOk: questions.every(q => typeof q.number === 'number' && Number.isFinite(q.number)),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          parsedOk: questions.every(q => {
            const parsed = parseBaseValue(q.answerString || '', q.answerBase);
            return parsed !== null && parsed === q.expectedValue;
          })
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.numbersOk);
      assert.ok(entry.answersOk);
      assert.ok(entry.parsedOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('szamrendszerek module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szamrendszerek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szamrendszerek"]');
    await waitForIframeSrc(page, 'modules/szamrendszerek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/szamrendszerek\.html/ });
    if (!frame) {
      throw new Error('Szamrendszerek module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('szamrendszerek visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szamrendszerek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="szamelmelet_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szamrendszerek"]');
    await waitForIframeSrc(page, 'modules/szamrendszerek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/szamrendszerek\.html/ });
    if (!frame) {
      throw new Error('Szamrendszerek module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('decimal-input'));
    await frame.evaluate(() => {
      const input = document.getElementById('decimal-input');
      if (!input) return;
      input.value = '42';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('binary-output')?.textContent || '';
      return value.trim() === '101010';
    });

    const snapshot = await frame.evaluate(() => ({
      binary: document.getElementById('binary-output')?.textContent || '',
      octal: document.getElementById('octal-output')?.textContent || '',
      hex: document.getElementById('hex-output')?.textContent || '',
      power: document.getElementById('power-sum')?.textContent || ''
    }));
    assert.equal(snapshot.binary.trim(), '101010');
    assert.equal(snapshot.octal.trim(), '52');
    assert.equal(snapshot.hex.trim(), '2A');
    assert.equal(snapshot.power.trim(), '101010 (2) = 32 + 8 + 2');

    await frame.evaluate(() => {
      const input = document.getElementById('base-input');
      if (!input) return;
      input.value = '2A';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const radio = document.querySelector('input[name="base-select"][value="16"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('base-decimal-output')?.textContent || '';
      return value.trim() === '42';
    });

    const baseSnapshot = await frame.evaluate(() => ({
      dec: document.getElementById('base-decimal-output')?.textContent || '',
      error: document.getElementById('base-error')?.textContent || ''
    }));
    assert.equal(baseSnapshot.dec.trim(), '42');
    assert.equal(baseSnapshot.error.trim(), '');
  } finally {
    await app.close();
  }
});

e2eTest('racionalis szamok temazaro module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { racionalis_szamok_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="racionalis_szamok_temazaro"]');
    await waitForIframeSrc(page, 'modules/racionalis_szamok_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#start-test-btn').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/racionalis_szamok_temazaro\.html/ });
    if (!frame) {
      throw new Error('Racionalis szamok temazaro frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="racionalis_szamok_temazaro"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('racionalis szamok temazaro module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { racionalis_szamok_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="racionalis_szamok_temazaro"]');
    await waitForIframeSrc(page, 'modules/racionalis_szamok_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/racionalis_szamok_temazaro\.html/ });
    if (!frame) {
      throw new Error('Racionalis szamok temazaro frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('racionalis szamok temazaro visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { racionalis_szamok_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="racionalis_szamok_temazaro"]');
    await waitForIframeSrc(page, 'modules/racionalis_szamok_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/racionalis_szamok_temazaro\.html/ });
    if (!frame) {
      throw new Error('Racionalis szamok temazaro frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('frac-num'));
    await frame.evaluate(() => {
      const num = document.getElementById('frac-num');
      const den = document.getElementById('frac-den');
      if (!num || !den) return;
      num.value = '3';
      den.value = '4';
      num.dispatchEvent(new Event('input', { bubbles: true }));
      den.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('frac-decimal-output')?.textContent || '';
      return value.trim() === '0.75';
    });

    const fractionSnapshot = await frame.evaluate(() => ({
      decimal: document.getElementById('frac-decimal-output')?.textContent || '',
      percent: document.getElementById('frac-percent-output')?.textContent || ''
    }));
    assert.equal(fractionSnapshot.decimal.trim(), '0.75');
    assert.equal(fractionSnapshot.percent.trim(), '75%');

    await frame.evaluate(() => {
      const input = document.getElementById('percent-input');
      if (!input) return;
      input.value = '12.5';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('percent-decimal-output')?.textContent || '';
      return value.trim() === '0.125';
    });

    const percentSnapshot = await frame.evaluate(() => ({
      decimal: document.getElementById('percent-decimal-output')?.textContent || '',
      fraction: document.getElementById('percent-fraction-output')?.textContent || ''
    }));
    assert.equal(percentSnapshot.decimal.trim(), '0.125');
    assert.equal(percentSnapshot.fraction.trim(), '1/8');
  } finally {
    await app.close();
  }
});

e2eTest('tortek module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { tortek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="tortek"]');
    await waitForIframeSrc(page, 'modules/tortek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/tortek\.html/ });
    if (!frame) {
      throw new Error('Tortek module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="tortek"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          parsedOk: questions.every(q => {
            const parsed = parseFractionInput(q.answerString || '');
            return parsed && q.answer && parsed.n === q.answer.n && parsed.d === q.answer.d;
          })
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.parsedOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('tortek module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { tortek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="tortek"]');
    await waitForIframeSrc(page, 'modules/tortek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/tortek\.html/ });
    if (!frame) {
      throw new Error('Tortek module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('tortek visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { tortek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="tortek"]');
    await waitForIframeSrc(page, 'modules/tortek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/tortek\.html/ });
    if (!frame) {
      throw new Error('Tortek module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('frac-a-num'));
    await frame.evaluate(() => {
      const aNum = document.getElementById('frac-a-num');
      const aDen = document.getElementById('frac-a-den');
      const bNum = document.getElementById('frac-b-num');
      const bDen = document.getElementById('frac-b-den');
      if (!aNum || !aDen || !bNum || !bDen) return;
      aNum.value = '1';
      aDen.value = '2';
      bNum.value = '1';
      bDen.value = '4';
      aNum.dispatchEvent(new Event('input', { bubbles: true }));
      aDen.dispatchEvent(new Event('input', { bubbles: true }));
      bNum.dispatchEvent(new Event('input', { bubbles: true }));
      bDen.dispatchEvent(new Event('input', { bubbles: true }));
      const addButton = document.querySelector('.operation-btn[data-op=\"add\"]');
      if (addButton) addButton.click();
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('fraction-result')?.textContent || '';
      return value.trim() === '3/4';
    });

    const operationSnapshot = await frame.evaluate(() => ({
      result: document.getElementById('fraction-result')?.textContent || '',
      decimal: document.getElementById('fraction-decimal-result')?.textContent || '',
      lcm: document.getElementById('lcm-result')?.textContent || '',
      aExpanded: document.getElementById('fraction-a-expanded')?.textContent || '',
      bExpanded: document.getElementById('fraction-b-expanded')?.textContent || ''
    }));
    assert.equal(operationSnapshot.result.trim(), '3/4');
    assert.equal(operationSnapshot.decimal.trim(), '0.75');
    assert.equal(operationSnapshot.lcm.trim(), '4');
    assert.equal(operationSnapshot.aExpanded.trim(), '2/4');
    assert.equal(operationSnapshot.bExpanded.trim(), '1/4');

    await frame.evaluate(() => {
      const num = document.getElementById('simp-num');
      const den = document.getElementById('simp-den');
      const mult = document.getElementById('expand-mult');
      if (!num || !den || !mult) return;
      num.value = '6';
      den.value = '8';
      mult.value = '3';
      num.dispatchEvent(new Event('input', { bubbles: true }));
      den.dispatchEvent(new Event('input', { bubbles: true }));
      mult.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('simplified-output')?.textContent || '';
      return value.trim() === '3/4';
    });

    const simplifySnapshot = await frame.evaluate(() => ({
      simplified: document.getElementById('simplified-output')?.textContent || '',
      expanded: document.getElementById('expanded-output')?.textContent || ''
    }));
    assert.equal(simplifySnapshot.simplified.trim(), '3/4');
    assert.equal(simplifySnapshot.expanded.trim(), '9/12');
  } finally {
    await app.close();
  }
});

e2eTest('tizedes tortek module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { tizedes_tortek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="tizedes_tortek"]');
    await waitForIframeSrc(page, 'modules/tizedes_tortek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/tizedes_tortek\.html/ });
    if (!frame) {
      throw new Error('Tizedes tortek module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="tizedes_tortek"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('tizedes tortek module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { tizedes_tortek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="tizedes_tortek"]');
    await waitForIframeSrc(page, 'modules/tizedes_tortek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/tizedes_tortek\.html/ });
    if (!frame) {
      throw new Error('Tizedes tortek module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('tizedes tortek visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { tizedes_tortek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="tizedes_tortek"]');
    await waitForIframeSrc(page, 'modules/tizedes_tortek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/tizedes_tortek\.html/ });
    if (!frame) {
      throw new Error('Tizedes tortek module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('decimal-input'));
    await frame.evaluate(() => {
      const input = document.getElementById('decimal-input');
      const digits = document.getElementById('round-digits');
      if (!input || !digits) return;
      input.value = '0.375';
      digits.value = '2';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      digits.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('decimal-fraction-output')?.textContent || '';
      return value.trim() === '3/8';
    });

    const decimalSnapshot = await frame.evaluate(() => ({
      fraction: document.getElementById('decimal-fraction-output')?.textContent || '',
      percent: document.getElementById('decimal-percent-output')?.textContent || '',
      rounded: document.getElementById('decimal-rounded-output')?.textContent || ''
    }));
    assert.equal(decimalSnapshot.fraction.trim(), '3/8');
    assert.equal(decimalSnapshot.percent.trim(), '37.5%');
    assert.equal(decimalSnapshot.rounded.trim(), '0.38');

    await frame.evaluate(() => {
      const num = document.getElementById('frac-num');
      const den = document.getElementById('frac-den');
      if (!num || !den) return;
      num.value = '3';
      den.value = '4';
      num.dispatchEvent(new Event('input', { bubbles: true }));
      den.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('fraction-decimal-output')?.textContent || '';
      return value.trim() === '0.75';
    });

    const fractionSnapshot = await frame.evaluate(() => ({
      decimal: document.getElementById('fraction-decimal-output')?.textContent || ''
    }));
    assert.equal(fractionSnapshot.decimal.trim(), '0.75');

    await frame.evaluate(() => {
      const input = document.getElementById('percent-input');
      if (!input) return;
      input.value = '12.5';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('percent-decimal-output')?.textContent || '';
      return value.trim() === '0.125';
    });

    const percentSnapshot = await frame.evaluate(() => ({
      decimal: document.getElementById('percent-decimal-output')?.textContent || ''
    }));
    assert.equal(percentSnapshot.decimal.trim(), '0.125');
  } finally {
    await app.close();
  }
});

e2eTest('szazalekszamitas module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szazalekszamitas: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szazalekszamitas"]');
    await waitForIframeSrc(page, 'modules/szazalekszamitas.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/szazalekszamitas\.html/ });
    if (!frame) {
      throw new Error('Szazalekszamitas module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="szazalekszamitas"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('szazalekszamitas module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szazalekszamitas: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szazalekszamitas"]');
    await waitForIframeSrc(page, 'modules/szazalekszamitas.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/szazalekszamitas\.html/ });
    if (!frame) {
      throw new Error('Szazalekszamitas module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('szazalekszamitas visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szazalekszamitas: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="racionalis_szamok_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szazalekszamitas"]');
    await waitForIframeSrc(page, 'modules/szazalekszamitas.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/szazalekszamitas\.html/ });
    if (!frame) {
      throw new Error('Szazalekszamitas module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('whole-input'));
    await frame.evaluate(() => {
      const whole = document.getElementById('whole-input');
      const percent = document.getElementById('percent-input');
      if (!whole || !percent) return;
      whole.value = '80';
      percent.value = '15';
      whole.dispatchEvent(new Event('input', { bubbles: true }));
      percent.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('part-output')?.textContent || '';
      return value.trim() === '12';
    });

    const partSnapshot = await frame.evaluate(() => ({
      part: document.getElementById('part-output')?.textContent || '',
      formula: document.getElementById('part-formula')?.textContent || ''
    }));
    assert.equal(partSnapshot.part.trim(), '12');
    assert.ok(partSnapshot.formula.includes('80'));

    await frame.evaluate(() => {
      const part = document.getElementById('part-input');
      const total = document.getElementById('total-input');
      if (!part || !total) return;
      part.value = '12';
      total.value = '48';
      part.dispatchEvent(new Event('input', { bubbles: true }));
      total.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('percent-output')?.textContent || '';
      return value.trim() === '25%';
    });

    const ratioSnapshot = await frame.evaluate(() => ({
      percent: document.getElementById('percent-output')?.textContent || '',
      ratio: document.getElementById('ratio-output')?.textContent || ''
    }));
    assert.equal(ratioSnapshot.percent.trim(), '25%');
    assert.ok(ratioSnapshot.ratio.includes('12'));
  } finally {
    await app.close();
  }
});

e2eTest('hatvany temazaro module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { hatvany_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="hatvany_temazaro"]');
    await waitForIframeSrc(page, 'modules/hatvany_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#start-test-btn').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/hatvany_temazaro\.html/ });
    if (!frame) {
      throw new Error('Hatvany temazaro module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="hatvany_temazaro"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('hatvany temazaro module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { hatvany_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="hatvany_temazaro"]');
    await waitForIframeSrc(page, 'modules/hatvany_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/hatvany_temazaro\.html/ });
    if (!frame) {
      throw new Error('Hatvany temazaro module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('hatvany temazaro visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { hatvany_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="hatvany_temazaro"]');
    await waitForIframeSrc(page, 'modules/hatvany_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/hatvany_temazaro\.html/ });
    if (!frame) {
      throw new Error('Hatvany temazaro module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('pow-base'));
    await frame.evaluate(() => {
      const powBase = document.getElementById('pow-base');
      const powExp = document.getElementById('pow-exp');
      const rootValue = document.getElementById('root-value');
      const rootIndex = document.getElementById('root-index');
      const logBase = document.getElementById('log-base');
      const logValue = document.getElementById('log-value');
      if (!powBase || !powExp || !rootValue || !rootIndex || !logBase || !logValue) return;
      powBase.value = '2';
      powExp.value = '5';
      rootValue.value = '81';
      rootIndex.value = '4';
      logBase.value = '2';
      logValue.value = '32';
      powBase.dispatchEvent(new Event('input', { bubbles: true }));
      powExp.dispatchEvent(new Event('input', { bubbles: true }));
      rootValue.dispatchEvent(new Event('input', { bubbles: true }));
      rootIndex.dispatchEvent(new Event('input', { bubbles: true }));
      logBase.dispatchEvent(new Event('input', { bubbles: true }));
      logValue.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('pow-output')?.textContent || '';
      return value.trim() === '32';
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('root-output')?.textContent || '';
      return value.trim() === '3';
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('log-output')?.textContent || '';
      return value.trim() === '5';
    });

    const snapshot = await frame.evaluate(() => ({
      pow: document.getElementById('pow-output')?.textContent || '',
      root: document.getElementById('root-output')?.textContent || '',
      log: document.getElementById('log-output')?.textContent || ''
    }));
    assert.equal(snapshot.pow.trim(), '32');
    assert.equal(snapshot.root.trim(), '3');
    assert.equal(snapshot.log.trim(), '5');
  } finally {
    await app.close();
  }
});

e2eTest('algebrai kifejezesek temazaro module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { algebrai_kif_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="algebrai_kif_temazaro"]');
    await waitForIframeSrc(page, 'modules/algebrai_kif_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#start-test-btn').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/algebrai_kif_temazaro\.html/ });
    if (!frame) {
      throw new Error('Algebrai kifejezesek temazaro module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="algebrai_kif_temazaro"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('algebrai kifejezesek temazaro module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { algebrai_kif_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="algebrai_kif_temazaro"]');
    await waitForIframeSrc(page, 'modules/algebrai_kif_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/algebrai_kif_temazaro\.html/ });
    if (!frame) {
      throw new Error('Algebrai kifejezesek temazaro module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('algebrai kifejezesek temazaro visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { algebrai_kif_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="algebrai_kif_temazaro"]');
    await waitForIframeSrc(page, 'modules/algebrai_kif_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/algebrai_kif_temazaro\.html/ });
    if (!frame) {
      throw new Error('Algebrai kifejezesek temazaro module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('poly-a'));
    await frame.evaluate(() => {
      const polyA = document.getElementById('poly-a');
      const polyB = document.getElementById('poly-b');
      const polyC = document.getElementById('poly-c');
      const polyX = document.getElementById('poly-x');
      const idA = document.getElementById('id-a');
      const idB = document.getElementById('id-b');
      const op = document.querySelector('.operation-btn[data-op="square-plus"]');
      if (!polyA || !polyB || !polyC || !polyX || !idA || !idB) return;
      polyA.value = '2';
      polyB.value = '-3';
      polyC.value = '4';
      polyX.value = '2';
      idA.value = '3';
      idB.value = '2';
      polyA.dispatchEvent(new Event('input', { bubbles: true }));
      polyB.dispatchEvent(new Event('input', { bubbles: true }));
      polyC.dispatchEvent(new Event('input', { bubbles: true }));
      polyX.dispatchEvent(new Event('input', { bubbles: true }));
      idA.dispatchEvent(new Event('input', { bubbles: true }));
      idB.dispatchEvent(new Event('input', { bubbles: true }));
      if (op) op.click();
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('poly-output')?.textContent || '';
      return value.trim() === '6';
    });
    await frame.waitForFunction(() => {
      const value = document.getElementById('id-output')?.textContent || '';
      return value.trim() === '25';
    });
  } finally {
    await app.close();
  }
});

e2eTest('polinomok module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { polinomok: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="polinomok"]');
    await waitForIframeSrc(page, 'modules/polinomok.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/polinomok\.html/ });
    if (!frame) {
      throw new Error('Polinomok module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="polinomok"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('polinomok module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { polinomok: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="polinomok"]');
    await waitForIframeSrc(page, 'modules/polinomok.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/polinomok\.html/ });
    if (!frame) {
      throw new Error('Polinomok module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

  e2eTest('polinomok visual model updates outputs', async () => {
    const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { polinomok: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="polinomok"]');
    await waitForIframeSrc(page, 'modules/polinomok.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/polinomok\.html/ });
    if (!frame) {
      throw new Error('Polinomok module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('poly-a'));
    await frame.evaluate(() => {
      const polyA = document.getElementById('poly-a');
      const polyB = document.getElementById('poly-b');
      const polyC = document.getElementById('poly-c');
      const polyX = document.getElementById('poly-x');
      const opA = document.getElementById('op-a');
      const opB = document.getElementById('op-b');
      const opC = document.getElementById('op-c');
      const opD = document.getElementById('op-d');
      const opE = document.getElementById('op-e');
      const opF = document.getElementById('op-f');
      const opX = document.getElementById('op-x');
      const opAdd = document.querySelector('.operation-btn[data-op=\"add\"]');
      if (!polyA || !polyB || !polyC || !polyX) return;
      polyA.value = '2';
      polyB.value = '-3';
      polyC.value = '1';
      polyX.value = '2';
      if (opA && opB && opC && opD && opE && opF && opX) {
        opA.value = '1';
        opB.value = '2';
        opC.value = '-1';
        opD.value = '-2';
        opE.value = '1';
        opF.value = '3';
        opX.value = '2';
      }
      polyA.dispatchEvent(new Event('input', { bubbles: true }));
      polyB.dispatchEvent(new Event('input', { bubbles: true }));
      polyC.dispatchEvent(new Event('input', { bubbles: true }));
      polyX.dispatchEvent(new Event('input', { bubbles: true }));
      if (opA) opA.dispatchEvent(new Event('input', { bubbles: true }));
      if (opB) opB.dispatchEvent(new Event('input', { bubbles: true }));
      if (opC) opC.dispatchEvent(new Event('input', { bubbles: true }));
      if (opD) opD.dispatchEvent(new Event('input', { bubbles: true }));
      if (opE) opE.dispatchEvent(new Event('input', { bubbles: true }));
      if (opF) opF.dispatchEvent(new Event('input', { bubbles: true }));
      if (opX) opX.dispatchEvent(new Event('input', { bubbles: true }));
      if (opAdd) opAdd.click();
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('poly-output')?.textContent || '';
      return value.trim() === '3';
    });
    await frame.waitForFunction(() => {
      const value = document.getElementById('op-result')?.textContent || '';
      return value.trim() === '4';
    });
    } finally {
      await app.close();
    }
  });

  e2eTest('nevezetes azonossagok module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);
  
      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { nevezetes_azonossagok: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });
  
      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });
  
      await page.click('[data-topic-id="nevezetes_azonossagok"]');
      await waitForIframeSrc(page, 'modules/nevezetes_azonossagok.html');
  
      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });
  
      const frame = page.frame({ url: /modules\/nevezetes_azonossagok\.html/ });
      if (!frame) {
        throw new Error('Nevezetes azonossagok module frame not found');
      }
  
      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);
  
      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);
  
      await frameLocator.locator('#finish-test-btn').click();
  
      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });
  
      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="nevezetes_azonossagok"]');
        return circle && circle.classList.contains('grade-5');
      });
  
      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });
  
  e2eTest('nevezetes azonossagok module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);
  
      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { nevezetes_azonossagok: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });
  
      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });
  
      await page.click('[data-topic-id="nevezetes_azonossagok"]');
      await waitForIframeSrc(page, 'modules/nevezetes_azonossagok.html');
  
      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();
  
      const frame = page.frame({ url: /modules\/nevezetes_azonossagok\.html/ });
      if (!frame) {
        throw new Error('Nevezetes azonossagok module frame not found');
      }
  
      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');
  
      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });
  
      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });
  
  e2eTest('nevezetes azonossagok visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);
  
      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { nevezetes_azonossagok: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });
  
      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });
  
      await page.click('[data-topic-id="nevezetes_azonossagok"]');
      await waitForIframeSrc(page, 'modules/nevezetes_azonossagok.html');
  
      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();
  
      const frame = page.frame({ url: /modules\/nevezetes_azonossagok\.html/ });
      if (!frame) {
        throw new Error('Nevezetes azonossagok module frame not found');
      }
  
      await frame.waitForFunction(() => document.getElementById('id-a'));
      await frame.evaluate(() => {
        const idA = document.getElementById('id-a');
        const idB = document.getElementById('id-b');
        const axA = document.getElementById('ax-a');
        const axB = document.getElementById('ax-b');
        const axX = document.getElementById('ax-x');
        const op = document.querySelector('.operation-btn[data-op=\"square-plus\"]');
        if (!idA || !idB || !axA || !axB || !axX) return;
        idA.value = '3';
        idB.value = '2';
        axA.value = '2';
        axB.value = '1';
        axX.value = '3';
        idA.dispatchEvent(new Event('input', { bubbles: true }));
        idB.dispatchEvent(new Event('input', { bubbles: true }));
        axA.dispatchEvent(new Event('input', { bubbles: true }));
        axB.dispatchEvent(new Event('input', { bubbles: true }));
        axX.dispatchEvent(new Event('input', { bubbles: true }));
        if (op) op.click();
      });
  
      await frame.waitForFunction(() => {
        const value = document.getElementById('id-output')?.textContent || '';
        return value.trim() === '25';
      });
      await frame.waitForFunction(() => {
        const value = document.getElementById('ax-output')?.textContent || '';
        return value.trim() === '49';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('algebrai tortek module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { algebrai_tortek: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="algebrai_tortek"]');
      await waitForIframeSrc(page, 'modules/algebrai_tortek.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/algebrai_tortek\.html/ });
      if (!frame) {
        throw new Error('Algebrai tortek module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="algebrai_tortek"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('algebrai tortek module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { algebrai_tortek: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="algebrai_tortek"]');
      await waitForIframeSrc(page, 'modules/algebrai_tortek.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/algebrai_tortek\.html/ });
      if (!frame) {
        throw new Error('Algebrai tortek module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('algebrai tortek visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { algebrai_tortek: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="algebrai_kif_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="algebrai_tortek"]');
      await waitForIframeSrc(page, 'modules/algebrai_tortek.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/algebrai_tortek\.html/ });
      if (!frame) {
        throw new Error('Algebrai tortek module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('frac-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('frac-a');
        const b = document.getElementById('frac-b');
        const c = document.getElementById('frac-c');
        const d = document.getElementById('frac-d');
        const x = document.getElementById('frac-x');
        if (!a || !b || !c || !d || !x) return;
        a.value = '2';
        b.value = '1';
        c.value = '1';
        d.value = '1';
        x.value = '1';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('input', { bubbles: true }));
        d.dispatchEvent(new Event('input', { bubbles: true }));
        x.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const simplified = document.getElementById('fraction-simplified')?.textContent || '';
        const value = document.getElementById('fraction-value')?.textContent || '';
        const numerator = document.getElementById('numerator-value')?.textContent || '';
        const denominator = document.getElementById('denominator-value')?.textContent || '';
        const excluded = document.getElementById('excluded-x')?.textContent || '';
        return simplified.trim() === '3/2'
          && value.trim() === '1.5'
          && numerator.trim() === '3'
          && denominator.trim() === '2'
          && excluded.trim() === 'x != -1';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('linearis egyenletek module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { linearis_egyenletek: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="linearis_egyenletek"]');
      await waitForIframeSrc(page, 'modules/linearis_egyenletek.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/linearis_egyenletek\.html/ });
      if (!frame) {
        throw new Error('Linearis egyenletek module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="linearis_egyenletek"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('linearis egyenletek module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { linearis_egyenletek: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="linearis_egyenletek"]');
      await waitForIframeSrc(page, 'modules/linearis_egyenletek.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/linearis_egyenletek\.html/ });
      if (!frame) {
        throw new Error('Linearis egyenletek module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('linearis egyenletek visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { linearis_egyenletek: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="linearis_egyenletek"]');
      await waitForIframeSrc(page, 'modules/linearis_egyenletek.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/linearis_egyenletek\.html/ });
      if (!frame) {
        throw new Error('Linearis egyenletek module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('eq-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('eq-a');
        const b = document.getElementById('eq-b');
        const c = document.getElementById('eq-c');
        if (!a || !b || !c) return;
        a.value = '2';
        b.value = '4';
        c.value = '10';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const formula = document.getElementById('equation-formula')?.textContent || '';
        const solution = document.getElementById('solution-value')?.textContent || '';
        const left = document.getElementById('left-value')?.textContent || '';
        const right = document.getElementById('right-value')?.textContent || '';
        return formula.trim() === '2x + 4 = 10'
          && solution.trim() === '3'
          && left.trim() === '10'
          && right.trim() === '10';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('egyenletek temazaro module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, subtopics: { egyenletek_temazaro: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="egyenletek_temazaro"]');
      await waitForIframeSrc(page, 'modules/egyenletek_temazaro.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#start-test-btn').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/egyenletek_temazaro\.html/ });
      if (!frame) {
        throw new Error('Egyenletek temazaro module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="egyenletek_temazaro"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('egyenletek temazaro module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, subtopics: { egyenletek_temazaro: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="egyenletek_temazaro"]');
      await waitForIframeSrc(page, 'modules/egyenletek_temazaro.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/egyenletek_temazaro\.html/ });
      if (!frame) {
        throw new Error('Egyenletek temazaro module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('egyenletek temazaro visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, subtopics: { egyenletek_temazaro: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="egyenletek_temazaro"]');
      await waitForIframeSrc(page, 'modules/egyenletek_temazaro.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/egyenletek_temazaro\.html/ });
      if (!frame) {
        throw new Error('Egyenletek temazaro module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('eq-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('eq-a');
        const b = document.getElementById('eq-b');
        const c = document.getElementById('eq-c');
        if (!a || !b || !c) return;
        a.value = '2';
        b.value = '4';
        c.value = '10';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const formula = document.getElementById('equation-formula')?.textContent || '';
        const solution = document.getElementById('solution-value')?.textContent || '';
        const left = document.getElementById('left-value')?.textContent || '';
        const right = document.getElementById('right-value')?.textContent || '';
        return formula.trim() === '2x + 4 = 10'
          && solution.trim() === '3'
          && left.trim() === '10'
          && right.trim() === '10';
      });

      await frame.evaluate(() => {
        const a = document.getElementById('quad-a');
        const b = document.getElementById('quad-b');
        const c = document.getElementById('quad-c');
        if (!a || !b || !c) return;
        a.value = '1';
        b.value = '-5';
        c.value = '6';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const disc = document.getElementById('discriminant-value')?.textContent || '';
        const root1 = document.getElementById('root-1')?.textContent || '';
        const root2 = document.getElementById('root-2')?.textContent || '';
        const roots = [root1.trim(), root2.trim()].sort().join(',');
        return disc.trim() === '1' && roots === '2,3';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggvenyek alt temazaro module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, subtopics: { fuggvenyek_alt_temazaro: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggvenyek_alt_temazaro"]');
      await waitForIframeSrc(page, 'modules/fuggvenyek_alt_temazaro.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#start-test-btn').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/fuggvenyek_alt_temazaro\.html/ });
      if (!frame) {
        throw new Error('Fuggvenyek alt temazaro module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="fuggvenyek_alt_temazaro"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggvenyek alt temazaro module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, subtopics: { fuggvenyek_alt_temazaro: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggvenyek_alt_temazaro"]');
      await waitForIframeSrc(page, 'modules/fuggvenyek_alt_temazaro.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/fuggvenyek_alt_temazaro\.html/ });
      if (!frame) {
        throw new Error('Fuggvenyek alt temazaro module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggvenyek alt temazaro visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, subtopics: { fuggvenyek_alt_temazaro: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggvenyek_alt_temazaro"]');
      await waitForIframeSrc(page, 'modules/fuggvenyek_alt_temazaro.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/fuggvenyek_alt_temazaro\.html/ });
      if (!frame) {
        throw new Error('Fuggvenyek alt temazaro module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('lin-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('lin-a');
        const b = document.getElementById('lin-b');
        if (!a || !b) return;
        a.value = '2';
        b.value = '-4';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('lin-equation')?.textContent || '';
        const domain = document.getElementById('lin-domain')?.textContent || '';
        const range = document.getElementById('lin-range')?.textContent || '';
        const monotone = document.getElementById('lin-monotone')?.textContent || '';
        return equation.trim() === 'f(x) = 2x - 4'
          && domain.trim() === 'R'
          && range.trim() === 'R'
          && monotone.trim() === 'N\u00f6vekv\u0151';
      });

      await frame.evaluate(() => {
        const a = document.getElementById('para-a');
        const h = document.getElementById('para-h');
        const k = document.getElementById('para-k');
        if (!a || !h || !k) return;
        a.value = '-1';
        h.value = '3';
        k.value = '2';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        h.dispatchEvent(new Event('input', { bubbles: true }));
        k.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('para-equation')?.textContent || '';
        const vertex = document.getElementById('para-vertex')?.textContent || '';
        const axis = document.getElementById('para-axis')?.textContent || '';
        const parity = document.getElementById('para-parity')?.textContent || '';
        const opening = document.getElementById('para-opening')?.textContent || '';
        return equation.trim() === 'f(x) = -(x - 3)^2 + 2'
          && vertex.trim() === '(3, 2)'
          && axis.trim() === 'x = 3'
          && parity.trim() === 'Nem p\u00e1ros'
          && opening.trim() === 'Lefel\u00e9 ny\u00edlik';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('nevezetes fuggvenyek temazaro module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, subtopics: { nevezetes_fuggvenyek_temazaro: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="nevezetes_fuggvenyek_temazaro"]');
      await waitForIframeSrc(page, 'modules/nevezetes_fuggvenyek_temazaro.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#start-test-btn').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/nevezetes_fuggvenyek_temazaro\.html/ });
      if (!frame) {
        throw new Error('Nevezetes fuggvenyek temazaro module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 2);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="nevezetes_fuggvenyek_temazaro"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('nevezetes fuggvenyek temazaro module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, subtopics: { nevezetes_fuggvenyek_temazaro: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="nevezetes_fuggvenyek_temazaro"]');
      await waitForIframeSrc(page, 'modules/nevezetes_fuggvenyek_temazaro.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/nevezetes_fuggvenyek_temazaro\.html/ });
      if (!frame) {
        throw new Error('Nevezetes fuggvenyek temazaro module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('nevezetes fuggvenyek temazaro visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, subtopics: { nevezetes_fuggvenyek_temazaro: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="nevezetes_fuggvenyek_temazaro"]');
      await waitForIframeSrc(page, 'modules/nevezetes_fuggvenyek_temazaro.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/nevezetes_fuggvenyek_temazaro\.html/ });
      if (!frame) {
        throw new Error('Nevezetes fuggvenyek temazaro module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('lin-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('lin-a');
        const b = document.getElementById('lin-b');
        const x = document.getElementById('lin-x');
        if (!a || !b || !x) return;
        a.value = '2';
        b.value = '-4';
        x.value = '3';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        x.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('lin-equation')?.textContent || '';
        const value = document.getElementById('lin-value')?.textContent || '';
        const zero = document.getElementById('lin-zero')?.textContent || '';
        return equation.trim() === 'f(x) = 2x - 4'
          && value.trim() === '2'
          && zero.trim() === '2';
      });

      await frame.evaluate(() => {
        const a = document.getElementById('quad-a');
        const b = document.getElementById('quad-b');
        const c = document.getElementById('quad-c');
        if (!a || !b || !c) return;
        a.value = '1';
        b.value = '-4';
        c.value = '3';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('quad-equation')?.textContent || '';
        const vertex = document.getElementById('quad-vertex')?.textContent || '';
        const axis = document.getElementById('quad-axis')?.textContent || '';
        const disc = document.getElementById('quad-discriminant')?.textContent || '';
        const roots = document.getElementById('quad-roots')?.textContent || '';
        return equation.trim() === 'f(x) = 1x^2 - 4x + 3'
          && vertex.trim() === '(2, -1)'
          && axis.trim() === 'x = 2'
          && disc.trim() === '4'
          && roots.trim() === '2 valos gyok';
      });

      await frame.evaluate(() => {
        const base = document.getElementById('exp-base');
        const exp = document.getElementById('exp-exp');
        if (!base || !exp) return;
        base.value = '2';
        exp.value = '5';
        base.dispatchEvent(new Event('input', { bubbles: true }));
        exp.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const value = document.getElementById('exp-value')?.textContent || '';
        const logLine = document.getElementById('exp-log')?.textContent || '';
        const growth = document.getElementById('exp-growth')?.textContent || '';
        return value.trim() === '32'
          && logLine.trim() === 'log_2(32) = 5'
          && growth.trim() === 'N\u00f6vekv\u0151';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggveny alapok module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { fuggveny_alapok: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggveny_alapok"]');
      await waitForIframeSrc(page, 'modules/fuggveny_alapok.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/fuggveny_alapok\.html/ });
      if (!frame) {
        throw new Error('Fuggveny alapok module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="fuggveny_alapok"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggveny alapok module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { fuggveny_alapok: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggveny_alapok"]');
      await waitForIframeSrc(page, 'modules/fuggveny_alapok.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/fuggveny_alapok\.html/ });
      if (!frame) {
        throw new Error('Fuggveny alapok module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggveny alapok visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { fuggveny_alapok: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggveny_alapok"]');
      await waitForIframeSrc(page, 'modules/fuggveny_alapok.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/fuggveny_alapok\.html/ });
      if (!frame) {
        throw new Error('Fuggveny alapok module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('root-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('root-a');
        const b = document.getElementById('root-b');
        if (!a || !b) return;
        a.value = '2';
        b.value = '3';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('root-equation')?.textContent || '';
        const domain = document.getElementById('root-domain')?.textContent || '';
        const range = document.getElementById('root-range')?.textContent || '';
        const boundary = document.getElementById('root-boundary')?.textContent || '';
        return equation.trim() === 'f(x) = sqrt(x + 2) + 3'
          && domain.trim() === 'x >= -2'
          && range.trim() === 'y >= 3'
          && boundary.trim() === '(-2, 3)';
      });

      await frame.evaluate(() => {
        const a = document.getElementById('rat-a');
        const b = document.getElementById('rat-b');
        if (!a || !b) return;
        a.value = '4';
        b.value = '-1';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('rat-equation')?.textContent || '';
        const domain = document.getElementById('rat-domain')?.textContent || '';
        const range = document.getElementById('rat-range')?.textContent || '';
        const asymptotes = document.getElementById('rat-asymptotes')?.textContent || '';
        return equation.trim() === 'f(x) = 1/(x - 4) - 1'
          && domain.trim() === 'x != 4'
          && range.trim() === 'y != -1'
          && asymptotes.trim() === 'x = 4, y = -1';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggveny jellemzes module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { fuggveny_jellemzes: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggveny_jellemzes"]');
      await waitForIframeSrc(page, 'modules/fuggveny_jellemzes.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/fuggveny_jellemzes\.html/ });
      if (!frame) {
        throw new Error('Fuggveny jellemzes module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="fuggveny_jellemzes"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggveny jellemzes module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { fuggveny_jellemzes: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggveny_jellemzes"]');
      await waitForIframeSrc(page, 'modules/fuggveny_jellemzes.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/fuggveny_jellemzes\.html/ });
      if (!frame) {
        throw new Error('Fuggveny jellemzes module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggveny jellemzes visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { fuggveny_jellemzes: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggveny_jellemzes"]');
      await waitForIframeSrc(page, 'modules/fuggveny_jellemzes.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/fuggveny_jellemzes\.html/ });
      if (!frame) {
        throw new Error('Fuggveny jellemzes module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('para-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('para-a');
        const h = document.getElementById('para-h');
        const k = document.getElementById('para-k');
        if (!a || !h || !k) return;
        a.value = '-1';
        h.value = '2';
        k.value = '1';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        h.dispatchEvent(new Event('input', { bubbles: true }));
        k.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('para-equation')?.textContent || '';
        const vertex = document.getElementById('para-vertex')?.textContent || '';
        const extremum = document.getElementById('para-extremum')?.textContent || '';
        const left = document.getElementById('para-left')?.textContent || '';
        const right = document.getElementById('para-right')?.textContent || '';
        return equation.trim() === 'f(x) = -(x - 2)^2 + 1'
          && vertex.trim() === '(2, 1)'
          && extremum.trim() === 'Maximum: 1'
          && left.trim() === '(-inf, 2): N\u00f6vekv\u0151'
          && right.trim() === '(2, inf): Cs\u00f6kken\u0151';
      });

      await frame.evaluate(() => {
        const a = document.getElementById('abs-a');
        const h = document.getElementById('abs-h');
        const k = document.getElementById('abs-k');
        if (!a || !h || !k) return;
        a.value = '3';
        h.value = '-2';
        k.value = '1';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        h.dispatchEvent(new Event('input', { bubbles: true }));
        k.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('abs-equation')?.textContent || '';
        const extremum = document.getElementById('abs-extremum')?.textContent || '';
        const left = document.getElementById('abs-left')?.textContent || '';
        const right = document.getElementById('abs-right')?.textContent || '';
        return equation.trim() === 'f(x) = 3|x + 2| + 1'
          && extremum.trim() === 'Minimum: 1'
          && left.trim() === '(-inf, -2): Cs\u00f6kken\u0151'
          && right.trim() === '(-2, inf): N\u00f6vekv\u0151';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggveny transzformaciok module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { fuggveny_transzformaciok: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggveny_transzformaciok"]');
      await waitForIframeSrc(page, 'modules/fuggveny_transzformaciok.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/fuggveny_transzformaciok\.html/ });
      if (!frame) {
        throw new Error('Fuggveny transzformaciok module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="fuggveny_transzformaciok"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggveny transzformaciok module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { fuggveny_transzformaciok: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggveny_transzformaciok"]');
      await waitForIframeSrc(page, 'modules/fuggveny_transzformaciok.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/fuggveny_transzformaciok\.html/ });
      if (!frame) {
        throw new Error('Fuggveny transzformaciok module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('fuggveny transzformaciok visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { fuggveny_transzformaciok: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="fuggveny_transzformaciok"]');
      await waitForIframeSrc(page, 'modules/fuggveny_transzformaciok.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/fuggveny_transzformaciok\.html/ });
      if (!frame) {
        throw new Error('Fuggveny transzformaciok module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('trans-base'));
      await frame.evaluate(() => {
        const base = document.getElementById('trans-base');
        const a = document.getElementById('trans-a');
        const b = document.getElementById('trans-b');
        const h = document.getElementById('trans-h');
        const k = document.getElementById('trans-k');
        if (!base || !a || !b || !h || !k) return;
        base.value = 'sqrt';
        a.value = '2';
        b.value = '-1';
        h.value = '3';
        k.value = '1';
        base.dispatchEvent(new Event('change', { bubbles: true }));
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        h.dispatchEvent(new Event('input', { bubbles: true }));
        k.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('trans-equation')?.textContent || '';
        const domain = document.getElementById('trans-domain')?.textContent || '';
        const range = document.getElementById('trans-range')?.textContent || '';
        const p1 = document.getElementById('trans-point-1')?.textContent || '';
        const p2 = document.getElementById('trans-point-2')?.textContent || '';
        const p3 = document.getElementById('trans-point-3')?.textContent || '';
        return equation.trim() === 'g(x) = 2sqrt(-(x - 3)) + 1'
          && domain.trim() === 'x <= 3'
          && range.trim() === 'y >= 1'
          && p1.trim() === '(0, 0) -> (3, 1)'
          && p2.trim() === '(1, 1) -> (2, 3)'
          && p3.trim() === '(4, 2) -> (-1, 5)';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('paritas module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { paritas: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="paritas"]');
      await waitForIframeSrc(page, 'modules/paritas.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/paritas\.html/ });
      if (!frame) {
        throw new Error('Paritas module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="paritas"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('paritas module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { paritas: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="paritas"]');
      await waitForIframeSrc(page, 'modules/paritas.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/paritas\.html/ });
      if (!frame) {
        throw new Error('Paritas module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('paritas visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { paritas: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="fuggvenyek_alt_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="paritas"]');
      await waitForIframeSrc(page, 'modules/paritas.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/paritas\.html/ });
      if (!frame) {
        throw new Error('Paritas module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('poly-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('poly-a');
        const b = document.getElementById('poly-b');
        const c = document.getElementById('poly-c');
        if (!a || !b || !c) return;
        a.value = '2';
        b.value = '0';
        c.value = '-3';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('poly-equation')?.textContent || '';
        const neg = document.getElementById('poly-neg')?.textContent || '';
        const parity = document.getElementById('poly-parity')?.textContent || '';
        const symmetry = document.getElementById('poly-symmetry')?.textContent || '';
        return equation.trim() === 'f(x) = 2x^2 - 3'
          && neg.trim() === 'f(-x) = 2x^2 - 3'
          && parity.trim() === 'P\u00e1ros'
          && symmetry.trim() === 'y-tengely';
      });

      await frame.evaluate(() => {
        const a = document.getElementById('abs-a');
        const b = document.getElementById('abs-b');
        if (!a || !b) return;
        a.value = '1';
        b.value = '2';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const equation = document.getElementById('abs-equation')?.textContent || '';
        const neg = document.getElementById('abs-neg')?.textContent || '';
        const parity = document.getElementById('abs-parity')?.textContent || '';
        const symmetry = document.getElementById('abs-symmetry')?.textContent || '';
        return equation.trim() === 'f(x) = |x| + 2x'
          && neg.trim() === 'f(-x) = |x| - 2x'
          && parity.trim() === 'Egyik sem'
          && symmetry.trim() === 'Egyik sem';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('masodfoku egyenlet module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { masodfoku_egyenlet: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="masodfoku_egyenlet"]');
      await waitForIframeSrc(page, 'modules/masodfoku_egyenlet.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/masodfoku_egyenlet\.html/ });
      if (!frame) {
        throw new Error('Masodfoku egyenlet module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="masodfoku_egyenlet"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('masodfoku egyenlet module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { masodfoku_egyenlet: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="masodfoku_egyenlet"]');
      await waitForIframeSrc(page, 'modules/masodfoku_egyenlet.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/masodfoku_egyenlet\.html/ });
      if (!frame) {
        throw new Error('Masodfoku egyenlet module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('masodfoku egyenlet visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { masodfoku_egyenlet: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="masodfoku_egyenlet"]');
      await waitForIframeSrc(page, 'modules/masodfoku_egyenlet.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/masodfoku_egyenlet\.html/ });
      if (!frame) {
        throw new Error('Masodfoku egyenlet module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('quad-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('quad-a');
        const b = document.getElementById('quad-b');
        const c = document.getElementById('quad-c');
        if (!a || !b || !c) return;
        a.value = '1';
        b.value = '-5';
        c.value = '6';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const disc = document.getElementById('discriminant-value')?.textContent || '';
        const root1 = document.getElementById('root-1')?.textContent || '';
        const root2 = document.getElementById('root-2')?.textContent || '';
        const sum = document.getElementById('root-sum')?.textContent || '';
        const product = document.getElementById('root-product')?.textContent || '';
        const roots = [root1.trim(), root2.trim()].sort().join(',');
        return disc.trim() === '1'
          && roots === '2,3'
          && sum.trim() === '5'
          && product.trim() === '6';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('viete formulak module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { viete_formulak: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="viete_formulak"]');
      await waitForIframeSrc(page, 'modules/viete_formulak.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/viete_formulak\.html/ });
      if (!frame) {
        throw new Error('Viete formulak module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="viete_formulak"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('viete formulak module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { viete_formulak: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="viete_formulak"]');
      await waitForIframeSrc(page, 'modules/viete_formulak.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/viete_formulak\.html/ });
      if (!frame) {
        throw new Error('Viete formulak module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('viete formulak visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { viete_formulak: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="viete_formulak"]');
      await waitForIframeSrc(page, 'modules/viete_formulak.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/viete_formulak\.html/ });
      if (!frame) {
        throw new Error('Viete formulak module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('root-1-input'));
      await frame.evaluate(() => {
        const r1 = document.getElementById('root-1-input');
        const r2 = document.getElementById('root-2-input');
        const a = document.getElementById('lead-a-input');
        if (!r1 || !r2 || !a) return;
        r1.value = '2';
        r2.value = '3';
        a.value = '1';
        r1.dispatchEvent(new Event('input', { bubbles: true }));
        r2.dispatchEvent(new Event('input', { bubbles: true }));
        a.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const sum = document.getElementById('root-sum-output')?.textContent || '';
        const product = document.getElementById('root-product-output')?.textContent || '';
        const b = document.getElementById('coeff-b-output')?.textContent || '';
        const c = document.getElementById('coeff-c-output')?.textContent || '';
        const equation = document.getElementById('equation-output')?.textContent || '';
        return sum.trim() === '5'
          && product.trim() === '6'
          && b.trim() === '-5'
          && c.trim() === '6'
          && equation.trim() === 'x^2 - 5x + 6 = 0';
      });

      await frame.evaluate(() => {
        const a = document.getElementById('coef-a-input');
        const b = document.getElementById('coef-b-input');
        const c = document.getElementById('coef-c-input');
        if (!a || !b || !c) return;
        a.value = '1';
        b.value = '-5';
        c.value = '6';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const sum = document.getElementById('vieta-sum-output')?.textContent || '';
        const product = document.getElementById('vieta-product-output')?.textContent || '';
        return sum.trim() === '5' && product.trim() === '6';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('parameteres masodfoku module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { parameteres_masodfoku: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="parameteres_masodfoku"]');
      await waitForIframeSrc(page, 'modules/parameteres_masodfoku.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/parameteres_masodfoku\.html/ });
      if (!frame) {
        throw new Error('Parameteres masodfoku module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="parameteres_masodfoku"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('parameteres masodfoku module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { parameteres_masodfoku: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="parameteres_masodfoku"]');
      await waitForIframeSrc(page, 'modules/parameteres_masodfoku.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/parameteres_masodfoku\.html/ });
      if (!frame) {
        throw new Error('Parameteres masodfoku module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('parameteres masodfoku visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { parameteres_masodfoku: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="parameteres_masodfoku"]');
      await waitForIframeSrc(page, 'modules/parameteres_masodfoku.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/parameteres_masodfoku\.html/ });
      if (!frame) {
        throw new Error('Parameteres masodfoku module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('param-m-input'));
      await frame.evaluate(() => {
        const m = document.getElementById('param-m-input');
        if (!m) return;
        m.value = '4';
        m.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const disc = document.getElementById('param-discriminant')?.textContent || '';
        const r1 = document.getElementById('param-root-1')?.textContent || '';
        const r2 = document.getElementById('param-root-2')?.textContent || '';
        return disc.trim() === '0' && r1.trim() === '2' && r2.trim() === '2';
      });

      await frame.evaluate(() => {
        const root = document.getElementById('root-value-input');
        if (!root) return;
        root.value = '3';
        root.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const mValue = document.getElementById('root-m-output')?.textContent || '';
        return mValue.trim() === '3';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('specialis egyenletek module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { specialis_egyenletek: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="specialis_egyenletek"]');
      await waitForIframeSrc(page, 'modules/specialis_egyenletek.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
      await frameLocator.locator('[data-role="test-help"]').waitFor();
      const difficultyButtons = frameLocator.locator('.difficulty-btn');
      assert.equal(await difficultyButtons.count(), 3);
      await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
      await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

      const frame = page.frame({ url: /modules\/specialis_egyenletek\.html/ });
      if (!frame) {
        throw new Error('Specialis egyenletek module frame not found');
      }

      const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
      assert.equal(totalQuestions, 10);
      const dots = frameLocator.locator('#pagination-dots .dot');
      await frameLocator.locator('#pagination-dots').waitFor();
      assert.equal(await dots.count(), totalQuestions);
      const navLayout = await frame.evaluate(() => {
        const nav = document.querySelector('.test-navigation');
        if (!nav) return null;
        return {
          display: getComputedStyle(nav).display,
          ids: Array.from(nav.children).map(child => child.id || ''),
          prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
          nextDisabled: document.getElementById('next-q')?.disabled ?? null,
        };
      });
      assert.ok(navLayout);
      assert.equal(navLayout.display, 'flex');
      assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
      assert.equal(navLayout.prevDisabled, true);

      const seenKinds = new Set();
      for (let i = 0; i < totalQuestions; i += 1) {
        await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
        const payload = await frame.evaluate(() => ({
          answerText: window.currentTestAnswer,
          kind: window.currentTestKind,
        }));
        if (payload.kind) {
          seenKinds.add(payload.kind);
        }
        await frameLocator.locator('#test-answer').fill(String(payload.answerText));
        if (i < totalQuestions - 1) {
          await frameLocator.locator('#next-q').click();
          if (i === 0) {
            await frame.waitForFunction(() => {
              const prev = document.getElementById('prev-q');
              return prev && !prev.disabled;
            });
          }
        }
      }
      assert.ok(seenKinds.size >= 1);

      await frameLocator.locator('#finish-test-btn').click();

      await frame.waitForFunction(() => {
        const popup = document.getElementById('resultPopup');
        return popup && popup.classList.contains('show');
      });

      await page.waitForFunction(() => {
        const circle = document.querySelector('.status[data-grade-for="specialis_egyenletek"]');
        return circle && circle.classList.contains('grade-5');
      });

      const generatorCheck = await frame.evaluate(() => {
        const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
        return difficulties.map((difficulty) => {
          const questions = buildTestQuestions(difficulty);
          return {
            difficulty,
            total: questions.length,
            hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
            answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
            checkOk: questions.every(q => checkAnswer(q.answerString, q))
          };
        });
      });
      generatorCheck.forEach((entry) => {
        assert.equal(entry.total, 10);
        assert.ok(entry.hasText);
        assert.ok(entry.answersOk);
        assert.ok(entry.checkOk);
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('specialis egyenletek module practice grants xp', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { specialis_egyenletek: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="specialis_egyenletek"]');
      await waitForIframeSrc(page, 'modules/specialis_egyenletek.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
      await frameLocator.locator('[data-role="practice-help"]').waitFor();
      const practiceDifficulties = frameLocator.locator('.practice-difficulty');
      assert.equal(await practiceDifficulties.count(), 3);
      await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
      await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
      await frameLocator.locator('#start-practice-btn').click();

      const frame = page.frame({ url: /modules\/specialis_egyenletek\.html/ });
      if (!frame) {
        throw new Error('Specialis egyenletek module frame not found');
      }

      await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
      const practicePayload = await frame.evaluate(() => ({
        answerText: window.currentPracticeAnswer,
        kind: window.currentPracticeKind,
      }));
      assert.ok(practicePayload.kind);
      await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
      await frameLocator.locator('#practice-input').press('Enter');

      await frame.waitForFunction(() => {
        const feedback = document.getElementById('practice-feedback');
        return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
      });

      await page.waitForFunction(() => {
        const label = document.getElementById('xp-total-label');
        if (!label) return false;
        const match = label.textContent.match(/(\d+)/);
        return match && Number(match[1]) > 0;
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('specialis egyenletek visual model updates outputs', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

      await page.evaluate(() => {
        try {
          questState = { version: 1, topics: { specialis_egyenletek: 'ACTIVE' } };
          localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
          if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
            window.electronAPI.saveQuestState(questState);
          }
          if (typeof saveQuestState === 'function') {
            saveQuestState();
          }
          if (typeof ensureQuestDefaults === 'function') {
            ensureQuestDefaults();
          }
        } catch (error) {
          // Ignore localStorage failures in test setup.
        }
      });

      await page.evaluate(() => {
        const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
        if (outer) outer.open = true;
        const inner = document.querySelector('[data-topic-id="egyenletek_temazaro"]')?.closest('details');
        if (inner) inner.open = true;
      });

      await page.click('[data-topic-id="specialis_egyenletek"]');
      await waitForIframeSrc(page, 'modules/specialis_egyenletek.html');

      const frameLocator = page.frameLocator('#content-frame');
      await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

      const frame = page.frame({ url: /modules\/specialis_egyenletek\.html/ });
      if (!frame) {
        throw new Error('Specialis egyenletek module frame not found');
      }

      await frame.waitForFunction(() => document.getElementById('abs-a'));
      await frame.evaluate(() => {
        const a = document.getElementById('abs-a');
        const b = document.getElementById('abs-b');
        if (!a || !b) return;
        a.value = '2';
        b.value = '3';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const root1 = document.getElementById('abs-root-1')?.textContent || '';
        const root2 = document.getElementById('abs-root-2')?.textContent || '';
        return root1.trim() === '-1' && root2.trim() === '5';
      });

      await frame.evaluate(() => {
        const a = document.getElementById('sqrt-a');
        const b = document.getElementById('sqrt-b');
        if (!a || !b) return;
        a.value = '1';
        b.value = '4';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        b.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await frame.waitForFunction(() => {
        const solution = document.getElementById('sqrt-solution')?.textContent || '';
        const status = document.getElementById('sqrt-status')?.textContent || '';
        return solution.trim() === '15' && status.trim() === 'OK';
      });
    } finally {
      await app.close();
    }
  });

  e2eTest('hatvanyozas module runs a test flow', async () => {
    const { app, page } = await launchApp();
    try {
      await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { hatvanyozas: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="hatvanyozas"]');
    await waitForIframeSrc(page, 'modules/hatvanyozas.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/hatvanyozas\.html/ });
    if (!frame) {
      throw new Error('Hatvanyozas module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="hatvanyozas"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('hatvanyozas module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { hatvanyozas: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="hatvanyozas"]');
    await waitForIframeSrc(page, 'modules/hatvanyozas.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/hatvanyozas\.html/ });
    if (!frame) {
      throw new Error('Hatvanyozas module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeExpected?.answerString || window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
      difficulty: window.currentPracticeDifficulty,
    }));
    assert.ok(practicePayload.kind);
    assert.equal(practicePayload.difficulty, 'nehéz');
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#check-practice-btn').click();
    await frame.evaluate(() => {
      if (typeof checkPracticeAnswer === 'function') {
        checkPracticeAnswer();
      }
    });

    await frame.waitForTimeout(200);
    const debugState = await frame.evaluate(() => ({
      feedbackExists: Boolean(document.getElementById('practice-feedback')),
      feedbackText: document.getElementById('practice-feedback')?.textContent || '',
      checkPracticeType: typeof checkPracticeAnswer,
      practiceActiveType: typeof practiceActive,
      practiceActiveValue: typeof practiceActive !== 'undefined' ? practiceActive : null
    }));
    assert.ok(debugState.feedbackExists, `Feedback element missing: ${JSON.stringify(debugState)}`);
    assert.ok(debugState.feedbackText.trim().length > 0, `No feedback: ${JSON.stringify(debugState)}`);
    const feedbackText = debugState.feedbackText;
    assert.ok(feedbackText.includes('Helyes'), `Unexpected feedback: ${feedbackText}`);
    assert.ok(feedbackText.includes('+3 XP'), `Unexpected feedback: ${feedbackText}`);

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.xp > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('hatvanyozas visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { hatvanyozas: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="hatvanyozas"]');
    await waitForIframeSrc(page, 'modules/hatvanyozas.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/hatvanyozas\.html/ });
    if (!frame) {
      throw new Error('Hatvanyozas module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('pow-base'));
    await frame.evaluate(() => {
      const powBase = document.getElementById('pow-base');
      const powExp = document.getElementById('pow-exp');
      const ruleBase = document.getElementById('rule-base');
      const ruleExpA = document.getElementById('rule-exp-a');
      const ruleExpB = document.getElementById('rule-exp-b');
      const ruleMul = document.querySelector('.operation-btn[data-op=\"mul\"]');
      if (!powBase || !powExp || !ruleBase || !ruleExpA || !ruleExpB) return;
      powBase.value = '3';
      powExp.value = '4';
      ruleBase.value = '2';
      ruleExpA.value = '3';
      ruleExpB.value = '4';
      powBase.dispatchEvent(new Event('input', { bubbles: true }));
      powExp.dispatchEvent(new Event('input', { bubbles: true }));
      ruleBase.dispatchEvent(new Event('input', { bubbles: true }));
      ruleExpA.dispatchEvent(new Event('input', { bubbles: true }));
      ruleExpB.dispatchEvent(new Event('input', { bubbles: true }));
      if (ruleMul) ruleMul.click();
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('pow-output')?.textContent || '';
      return value.trim() === '81';
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('rule-output')?.textContent || '';
      return value.trim() === '128';
    });

    const snapshot = await frame.evaluate(() => ({
      pow: document.getElementById('pow-output')?.textContent || '',
      rule: document.getElementById('rule-output')?.textContent || '',
      exponent: document.getElementById('rule-exponent')?.textContent || ''
    }));
    assert.equal(snapshot.pow.trim(), '81');
    assert.equal(snapshot.rule.trim(), '128');
    assert.equal(snapshot.exponent.trim(), '2^7');
  } finally {
    await app.close();
  }
});

e2eTest('gyokvonas module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { gyokvonas: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="gyokvonas"]');
    await waitForIframeSrc(page, 'modules/gyokvonas.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/gyokvonas\.html/ });
    if (!frame) {
      throw new Error('Gyokvonas module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="gyokvonas"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('gyokvonas module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { gyokvonas: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="gyokvonas"]');
    await waitForIframeSrc(page, 'modules/gyokvonas.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/gyokvonas\.html/ });
    if (!frame) {
      throw new Error('Gyokvonas module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeExpected?.answerString || window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
      difficulty: window.currentPracticeDifficulty,
    }));
    assert.ok(practicePayload.kind);
    assert.equal(practicePayload.difficulty, 'neh\u00e9z');
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#check-practice-btn').click();
    await frame.evaluate(() => {
      if (typeof checkPracticeAnswer === 'function') {
        checkPracticeAnswer();
      }
    });

    await frame.waitForTimeout(200);
    const debugState = await frame.evaluate(() => ({
      feedbackExists: Boolean(document.getElementById('practice-feedback')),
      feedbackText: document.getElementById('practice-feedback')?.textContent || '',
      checkPracticeType: typeof checkPracticeAnswer,
      practiceActiveType: typeof practiceActive,
      practiceActiveValue: typeof practiceActive !== 'undefined' ? practiceActive : null
    }));
    assert.ok(debugState.feedbackExists, `Feedback element missing: ${JSON.stringify(debugState)}`);
    assert.ok(debugState.feedbackText.trim().length > 0, `No feedback: ${JSON.stringify(debugState)}`);
    const feedbackText = debugState.feedbackText;
    assert.ok(feedbackText.includes('Helyes'), `Unexpected feedback: ${feedbackText}`);
    assert.ok(feedbackText.includes('+3 XP'), `Unexpected feedback: ${feedbackText}`);

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.xp > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('gyokvonas visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { gyokvonas: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="gyokvonas"]');
    await waitForIframeSrc(page, 'modules/gyokvonas.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/gyokvonas\.html/ });
    if (!frame) {
      throw new Error('Gyokvonas module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('root-value'));
    await frame.evaluate(() => {
      const rootValue = document.getElementById('root-value');
      const rootIndex = document.getElementById('root-index');
      const linkBase = document.getElementById('link-base');
      const linkIndex = document.getElementById('link-index');
      const linkMult = document.getElementById('link-mult');
      if (!rootValue || !rootIndex || !linkBase || !linkIndex || !linkMult) return;
      rootValue.value = '81';
      rootIndex.value = '4';
      linkBase.value = '3';
      linkIndex.value = '2';
      linkMult.value = '3';
      rootValue.dispatchEvent(new Event('input', { bubbles: true }));
      rootIndex.dispatchEvent(new Event('input', { bubbles: true }));
      linkBase.dispatchEvent(new Event('input', { bubbles: true }));
      linkIndex.dispatchEvent(new Event('input', { bubbles: true }));
      linkMult.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('root-output')?.textContent || '';
      return value.trim() === '3';
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('link-radicand')?.textContent || '';
      return value.trim() === '729';
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('link-result')?.textContent || '';
      return value.trim() === '27';
    });

    const snapshot = await frame.evaluate(() => ({
      root: document.getElementById('root-output')?.textContent || '',
      radicand: document.getElementById('link-radicand')?.textContent || '',
      result: document.getElementById('link-result')?.textContent || ''
    }));
    assert.equal(snapshot.root.trim(), '3');
    assert.equal(snapshot.radicand.trim(), '729');
    assert.equal(snapshot.result.trim(), '27');
  } finally {
    await app.close();
  }
});

e2eTest('logaritmus module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { logaritmus: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="logaritmus"]');
    await waitForIframeSrc(page, 'modules/logaritmus.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/logaritmus\.html/ });
    if (!frame) {
      throw new Error('Logaritmus module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="logaritmus"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('logaritmus module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { logaritmus: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="logaritmus"]');
    await waitForIframeSrc(page, 'modules/logaritmus.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/logaritmus\.html/ });
    if (!frame) {
      throw new Error('Logaritmus module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeExpected?.answerString || window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
      difficulty: window.currentPracticeDifficulty,
    }));
    assert.ok(practicePayload.kind);
    assert.equal(practicePayload.difficulty, 'neh\u00e9z');
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#check-practice-btn').click();
    await frame.evaluate(() => {
      if (typeof checkPracticeAnswer === 'function') {
        checkPracticeAnswer();
      }
    });

    await frame.waitForTimeout(200);
    const debugState = await frame.evaluate(() => ({
      feedbackExists: Boolean(document.getElementById('practice-feedback')),
      feedbackText: document.getElementById('practice-feedback')?.textContent || '',
      checkPracticeType: typeof checkPracticeAnswer,
      practiceActiveType: typeof practiceActive,
      practiceActiveValue: typeof practiceActive !== 'undefined' ? practiceActive : null
    }));
    assert.ok(debugState.feedbackExists, `Feedback element missing: ${JSON.stringify(debugState)}`);
    assert.ok(debugState.feedbackText.trim().length > 0, `No feedback: ${JSON.stringify(debugState)}`);
    const feedbackText = debugState.feedbackText;
    assert.ok(feedbackText.includes('Helyes'), `Unexpected feedback: ${feedbackText}`);
    assert.ok(feedbackText.includes('+3 XP'), `Unexpected feedback: ${feedbackText}`);

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.xp > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('logaritmus visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { logaritmus: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="hatvany_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="logaritmus"]');
    await waitForIframeSrc(page, 'modules/logaritmus.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/logaritmus\.html/ });
    if (!frame) {
      throw new Error('Logaritmus module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('log-base'));
    await frame.evaluate(() => {
      const logBase = document.getElementById('log-base');
      const logValue = document.getElementById('log-value');
      const linkBase = document.getElementById('link-base');
      const linkExp = document.getElementById('link-exp');
      if (!logBase || !logValue || !linkBase || !linkExp) return;
      logBase.value = '2';
      logValue.value = '32';
      linkBase.value = '3';
      linkExp.value = '4';
      logBase.dispatchEvent(new Event('input', { bubbles: true }));
      logValue.dispatchEvent(new Event('input', { bubbles: true }));
      linkBase.dispatchEvent(new Event('input', { bubbles: true }));
      linkExp.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('log-output')?.textContent || '';
      return value.trim() === '5';
    });

    await frame.waitForFunction(() => {
      const value = document.getElementById('link-value')?.textContent || '';
      return value.trim() === '81';
    });

    const snapshot = await frame.evaluate(() => ({
      logValue: document.getElementById('log-output')?.textContent || '',
      linkValue: document.getElementById('link-value')?.textContent || ''
    }));
    assert.equal(snapshot.logValue.trim(), '5');
    assert.equal(snapshot.linkValue.trim(), '81');
  } finally {
    await app.close();
  }
});

e2eTest('exp log fuggveny module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { exp_log_fuggveny: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="exp_log_fuggveny"]');
    await waitForIframeSrc(page, 'modules/exp_log_fuggveny.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/exp_log_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Exp log fuggveny module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="exp_log_fuggveny"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('exp log fuggveny module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { exp_log_fuggveny: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="exp_log_fuggveny"]');
    await waitForIframeSrc(page, 'modules/exp_log_fuggveny.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/exp_log_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Exp log fuggveny module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeExpected?.answerString || window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
      difficulty: window.currentPracticeDifficulty,
    }));
    assert.ok(practicePayload.kind);
    assert.equal(practicePayload.difficulty, 'neh\u00e9z');
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#check-practice-btn').click();
    await frame.evaluate(() => {
      if (typeof checkPracticeAnswer === 'function') {
        checkPracticeAnswer();
      }
    });

    await frame.waitForTimeout(200);
    const debugState = await frame.evaluate(() => ({
      feedbackExists: Boolean(document.getElementById('practice-feedback')),
      feedbackText: document.getElementById('practice-feedback')?.textContent || '',
      checkPracticeType: typeof checkPracticeAnswer,
      practiceActiveType: typeof practiceActive,
      practiceActiveValue: typeof practiceActive !== 'undefined' ? practiceActive : null
    }));
    assert.ok(debugState.feedbackExists, `Feedback element missing: ${JSON.stringify(debugState)}`);
    assert.ok(debugState.feedbackText.trim().length > 0, `No feedback: ${JSON.stringify(debugState)}`);
    const feedbackText = debugState.feedbackText;
    assert.ok(feedbackText.includes('Helyes'), `Unexpected feedback: ${feedbackText}`);
    assert.ok(feedbackText.includes('+3 XP'), `Unexpected feedback: ${feedbackText}`);

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.xp > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('exp log fuggveny visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { exp_log_fuggveny: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="exp_log_fuggveny"]');
    await waitForIframeSrc(page, 'modules/exp_log_fuggveny.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/exp_log_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Exp log fuggveny module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('exp-base'));
    await frame.evaluate(() => {
      const expBase = document.getElementById('exp-base');
      const expX = document.getElementById('exp-x');
      const logBase = document.getElementById('log-base');
      const logX = document.getElementById('log-x');
      if (!expBase || !expX || !logBase || !logX) return;
      expBase.value = '2';
      expX.value = '3';
      logBase.value = '2';
      logX.value = '32';
      expBase.dispatchEvent(new Event('input', { bubbles: true }));
      expX.dispatchEvent(new Event('input', { bubbles: true }));
      logBase.dispatchEvent(new Event('input', { bubbles: true }));
      logX.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const expValue = document.getElementById('exp-value')?.textContent || '';
      const logValue = document.getElementById('log-value')?.textContent || '';
      return expValue.trim() === '8' && logValue.trim() === '5';
    });

    const snapshot = await frame.evaluate(() => ({
      expEquation: document.getElementById('exp-equation')?.textContent || '',
      expValue: document.getElementById('exp-value')?.textContent || '',
      logValue: document.getElementById('log-value')?.textContent || '',
      logAsymptote: document.getElementById('log-asymptote')?.textContent || ''
    }));
    assert.equal(snapshot.expEquation.trim(), 'f(x) = 2^x');
    assert.equal(snapshot.expValue.trim(), '8');
    assert.equal(snapshot.logValue.trim(), '5');
    assert.equal(snapshot.logAsymptote.trim(), 'x = 0');
  } finally {
    await app.close();
  }
});

e2eTest('trigonometrikus fuggvenyek module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { trigonometrikus_fuggvenyek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="trigonometrikus_fuggvenyek"]');
    await waitForIframeSrc(page, 'modules/trigonometrikus_fuggvenyek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="neh\u00e9z"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/trigonometrikus_fuggvenyek\.html/ });
    if (!frame) {
      throw new Error('Trigonometrikus fuggvenyek module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for=\"trigonometrikus_fuggvenyek\"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('trigonometrikus fuggvenyek module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { trigonometrikus_fuggvenyek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id=\"algebra_modulzaro\"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id=\"nevezetes_fuggvenyek_temazaro\"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id=\"trigonometrikus_fuggvenyek\"]');
    await waitForIframeSrc(page, 'modules/trigonometrikus_fuggvenyek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role=\"practice-help\"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value=\"k\u00f6nny\u0171\"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value=\"norm\u00e1l\"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value=\"neh\u00e9z\"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/trigonometrikus_fuggvenyek\.html/ });
    if (!frame) {
      throw new Error('Trigonometrikus fuggvenyek module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeExpected?.answerString || window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
      difficulty: window.currentPracticeDifficulty,
    }));
    assert.ok(practicePayload.kind);
    assert.equal(practicePayload.difficulty, 'neh\u00e9z');
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#check-practice-btn').click();
    await frame.evaluate(() => {
      if (typeof checkPracticeAnswer === 'function') {
        checkPracticeAnswer();
      }
    });

    await frame.waitForTimeout(200);
    const debugState = await frame.evaluate(() => ({
      feedbackExists: Boolean(document.getElementById('practice-feedback')),
      feedbackText: document.getElementById('practice-feedback')?.textContent || '',
      checkPracticeType: typeof checkPracticeAnswer,
      practiceActiveType: typeof practiceActive,
      practiceActiveValue: typeof practiceActive !== 'undefined' ? practiceActive : null
    }));
    assert.ok(debugState.feedbackExists, `Feedback element missing: ${JSON.stringify(debugState)}`);
    assert.ok(debugState.feedbackText.trim().length > 0, `No feedback: ${JSON.stringify(debugState)}`);
    const feedbackText = debugState.feedbackText;
    assert.ok(feedbackText.includes('Helyes'), `Unexpected feedback: ${feedbackText}`);
    assert.ok(feedbackText.includes('+3 XP'), `Unexpected feedback: ${feedbackText}`);

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.xp > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('trigonometrikus fuggvenyek visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { trigonometrikus_fuggvenyek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id=\"algebra_modulzaro\"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id=\"nevezetes_fuggvenyek_temazaro\"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id=\"trigonometrikus_fuggvenyek\"]');
    await waitForIframeSrc(page, 'modules/trigonometrikus_fuggvenyek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/trigonometrikus_fuggvenyek\.html/ });
    if (!frame) {
      throw new Error('Trigonometrikus fuggvenyek module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('sc-function'));
    await frame.evaluate(() => {
      const scFunc = document.getElementById('sc-function');
      const scAmp = document.getElementById('sc-amplitude');
      const scAngle = document.getElementById('sc-angle');
      const tanAmp = document.getElementById('tan-amplitude');
      const tanAngle = document.getElementById('tan-angle');
      if (!scFunc || !scAmp || !scAngle || !tanAmp || !tanAngle) return;
      scFunc.value = 'sin';
      scAmp.value = '2';
      scAngle.value = '30';
      tanAmp.value = '1';
      tanAngle.value = '45';
      scFunc.dispatchEvent(new Event('change', { bubbles: true }));
      scAmp.dispatchEvent(new Event('input', { bubbles: true }));
      scAngle.dispatchEvent(new Event('input', { bubbles: true }));
      tanAmp.dispatchEvent(new Event('input', { bubbles: true }));
      tanAngle.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const scValue = document.getElementById('sc-value')?.textContent || '';
      const tanValue = document.getElementById('tan-value')?.textContent || '';
      return scValue.trim() === '1' && tanValue.trim() === '1';
    });

    const snapshot = await frame.evaluate(() => ({
      scEquation: document.getElementById('sc-equation')?.textContent || '',
      scRange: document.getElementById('sc-range')?.textContent || '',
      scPeriod: document.getElementById('sc-period')?.textContent || '',
      scParity: document.getElementById('sc-parity')?.textContent || '',
      tanAsymptote: document.getElementById('tan-asymptote')?.textContent || ''
    }));
    assert.equal(snapshot.scEquation.trim(), 'f(x) = 2 sin x');
    assert.equal(snapshot.scRange.trim(), '[-2, 2]');
    assert.equal(snapshot.scPeriod.trim(), '360\u00b0');
    assert.equal(snapshot.scParity.trim(), 'P\u00e1ratlan');
    assert.equal(snapshot.tanAsymptote.trim(), 'x = 90\u00b0 + k*180\u00b0');
  } finally {
    await app.close();
  }
});

e2eTest('specialis fuggvenyek module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { specialis_fuggvenyek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="specialis_fuggvenyek"]');
    await waitForIframeSrc(page, 'modules/specialis_fuggvenyek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/specialis_fuggvenyek\.html/ });
    if (!frame) {
      throw new Error('Specialis fuggvenyek module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="specialis_fuggvenyek"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerType, q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('specialis fuggvenyek module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { specialis_fuggvenyek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="specialis_fuggvenyek"]');
    await waitForIframeSrc(page, 'modules/specialis_fuggvenyek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/specialis_fuggvenyek\.html/ });
    if (!frame) {
      throw new Error('Specialis fuggvenyek module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeExpected?.answerString || window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
      difficulty: window.currentPracticeDifficulty,
    }));
    assert.ok(practicePayload.kind);
    assert.equal(practicePayload.difficulty, 'neh\u00e9z');
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#check-practice-btn').click();
    await frame.evaluate(() => {
      if (typeof checkPracticeAnswer === 'function') {
        checkPracticeAnswer();
      }
    });

    await frame.waitForTimeout(200);
    const debugState = await frame.evaluate(() => ({
      feedbackExists: Boolean(document.getElementById('practice-feedback')),
      feedbackText: document.getElementById('practice-feedback')?.textContent || '',
      checkPracticeType: typeof checkPracticeAnswer,
      practiceActiveType: typeof practiceActive,
      practiceActiveValue: typeof practiceActive !== 'undefined' ? practiceActive : null
    }));
    assert.ok(debugState.feedbackExists, `Feedback element missing: ${JSON.stringify(debugState)}`);
    assert.ok(debugState.feedbackText.trim().length > 0, `No feedback: ${JSON.stringify(debugState)}`);
    const feedbackText = debugState.feedbackText;
    assert.ok(feedbackText.includes('Helyes'), `Unexpected feedback: ${feedbackText}`);
    assert.ok(feedbackText.includes('+3 XP'), `Unexpected feedback: ${feedbackText}`);

    await page.waitForFunction(async () => {
      const summary = await window.electronAPI.getProgressSummary();
      return summary && summary.xp > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('specialis fuggvenyek visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { specialis_fuggvenyek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="algebra_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="nevezetes_fuggvenyek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="specialis_fuggvenyek"]');
    await waitForIframeSrc(page, 'modules/specialis_fuggvenyek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/specialis_fuggvenyek\.html/ });
    if (!frame) {
      throw new Error('Specialis fuggvenyek module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('abs-a'));
    await frame.evaluate(() => {
      const absA = document.getElementById('abs-a');
      const absH = document.getElementById('abs-h');
      const absK = document.getElementById('abs-k');
      const absX = document.getElementById('abs-x');
      const rootA = document.getElementById('root-a');
      const rootH = document.getElementById('root-h');
      const rootK = document.getElementById('root-k');
      const rootX = document.getElementById('root-x');
      if (!absA || !absH || !absK || !absX || !rootA || !rootH || !rootK || !rootX) return;
      absA.value = '2';
      absH.value = '-1';
      absK.value = '3';
      absX.value = '-4';
      rootA.value = '-2';
      rootH.value = '1';
      rootK.value = '4';
      rootX.value = '10';
      absA.dispatchEvent(new Event('input', { bubbles: true }));
      absH.dispatchEvent(new Event('input', { bubbles: true }));
      absK.dispatchEvent(new Event('input', { bubbles: true }));
      absX.dispatchEvent(new Event('input', { bubbles: true }));
      rootA.dispatchEvent(new Event('input', { bubbles: true }));
      rootH.dispatchEvent(new Event('input', { bubbles: true }));
      rootK.dispatchEvent(new Event('input', { bubbles: true }));
      rootX.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await frame.waitForFunction(() => {
      const absValue = document.getElementById('abs-value')?.textContent || '';
      const rootValue = document.getElementById('root-value')?.textContent || '';
      return absValue.trim() === '9' && rootValue.trim() === '-2';
    });

    const snapshot = await frame.evaluate(() => ({
      absEquation: document.getElementById('abs-equation')?.textContent || '',
      absRange: document.getElementById('abs-range')?.textContent || '',
      absAxis: document.getElementById('abs-axis')?.textContent || '',
      absVertex: document.getElementById('abs-vertex')?.textContent || '',
      rootEquation: document.getElementById('root-equation')?.textContent || '',
      rootRange: document.getElementById('root-range')?.textContent || '',
      rootMonotonicity: document.getElementById('root-monotonicity')?.textContent || ''
    }));
    assert.equal(snapshot.absEquation.trim(), 'f(x) = 2|x + 1| + 3');
    assert.equal(snapshot.absRange.trim(), 'y >= 3');
    assert.equal(snapshot.absAxis.trim(), 'x = -1');
    assert.equal(snapshot.absVertex.trim(), '(-1, 3)');
    assert.equal(snapshot.rootEquation.trim(), 'f(x) = -2sqrt(x - 1) + 4');
    assert.equal(snapshot.rootRange.trim(), 'y <= 4');
    assert.equal(snapshot.rootMonotonicity.trim(), 'Cs\u00f6kken\u0151');
  } finally {
    await app.close();
  }
});

e2eTest('records test results and shows them in results view', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    const result = await postTestResult(page);

    const statusSelector = '.status[data-grade-for="halmazmuveletek"]';
    await page.waitForFunction((selector) => {
      const el = document.querySelector(selector);
      return el && el.classList.contains('grade-5');
    }, statusSelector);

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\d+)/);
      return match && Number(match[1]) > 0;
    });

    await page.click('#results-btn');
    await waitForIframeSrc(page, 'modules/results.html');

    const frame = page.frameLocator('#content-frame');
    const resultItem = frame.locator('.result-item', { hasText: result.topicName }).first();
    await resultItem.waitFor();

    const gradeText = await resultItem.locator('.grade-badge').innerText();
    assert.equal(gradeText.trim(), String(result.grade));

    const topicText = await resultItem.locator('.result-details h3').innerText();
    assert.equal(topicText.trim(), result.topicName);
  } finally {
    await app.close();
  }
});

e2eTest('haromszogek temazaro module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { haromszogek_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="haromszogek_temazaro"]');
    await waitForIframeSrc(page, 'modules/haromszogek_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#start-test-btn').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/haromszogek_temazaro\.html/ });
    if (!frame) {
      throw new Error('Haromszogek temazaro module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="haromszogek_temazaro"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('haromszogek temazaro module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { haromszogek_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="haromszogek_temazaro"]');
    await waitForIframeSrc(page, 'modules/haromszogek_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/haromszogek_temazaro\.html/ });
    if (!frame) {
      throw new Error('Haromszogek temazaro module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('haromszogek temazaro visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, subtopics: { haromszogek_temazaro: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="haromszogek_temazaro"]');
    await waitForIframeSrc(page, 'modules/haromszogek_temazaro.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/haromszogek_temazaro\.html/ });
    if (!frame) {
      throw new Error('Haromszogek temazaro module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('angle-a'));
    await frame.evaluate(() => {
      const angleA = document.getElementById('angle-a');
      const angleB = document.getElementById('angle-b');
      const sideA = document.getElementById('side-a');
      const sideB = document.getElementById('side-b');
      const sideC = document.getElementById('side-c');
      const heightA = document.getElementById('height-a');
      if (!angleA || !angleB || !sideA || !sideB || !sideC || !heightA) return;
      angleA.value = '50';
      angleB.value = '60';
      sideA.value = '8';
      sideB.value = '6';
      sideC.value = '7';
      heightA.value = '5';
      [angleA, angleB, sideA, sideB, sideC, heightA].forEach((input) => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    await frame.waitForFunction(() => {
      const angleC = document.getElementById('angle-c')?.textContent || '';
      const perim = document.getElementById('triangle-perimeter')?.textContent || '';
      const area = document.getElementById('triangle-area')?.textContent || '';
      const ineq = document.getElementById('triangle-ineq')?.textContent || '';
      return angleC.trim().startsWith('70') && perim.includes('21') && area.includes('20') && ineq.includes('Teljes');
    });
  } finally {
    await app.close();
  }
});

e2eTest('nevezetes vonalak module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { nevezetes_vonalak: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="nevezetes_vonalak"]');
    await waitForIframeSrc(page, 'modules/nevezetes_vonalak.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/nevezetes_vonalak\.html/ });
    if (!frame) {
      throw new Error('Nevezetes vonalak module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="nevezetes_vonalak"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('nevezetes vonalak module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { nevezetes_vonalak: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="nevezetes_vonalak"]');
    await waitForIframeSrc(page, 'modules/nevezetes_vonalak.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/nevezetes_vonalak\.html/ });
    if (!frame) {
      throw new Error('Nevezetes vonalak module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('nevezetes vonalak visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { nevezetes_vonalak: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="nevezetes_vonalak"]');
    await waitForIframeSrc(page, 'modules/nevezetes_vonalak.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/nevezetes_vonalak\.html/ });
    if (!frame) {
      throw new Error('Nevezetes vonalak module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('median-length'));
    await frame.evaluate(() => {
      const medianLength = document.getElementById('median-length');
      const bisectorB = document.getElementById('bisector-b');
      const bisectorC = document.getElementById('bisector-c');
      const bisectorA = document.getElementById('bisector-a');
      if (!medianLength || !bisectorB || !bisectorC || !bisectorA) return;
      medianLength.value = '12';
      bisectorB.value = '6';
      bisectorC.value = '9';
      bisectorA.value = '10';
      [medianLength, bisectorB, bisectorC, bisectorA].forEach((input) => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    await frame.waitForFunction(() => {
      const centroidVertex = document.getElementById('centroid-vertex')?.textContent || '';
      const centroidMid = document.getElementById('centroid-mid')?.textContent || '';
      const a1 = document.getElementById('bisector-a1')?.textContent || '';
      const a2 = document.getElementById('bisector-a2')?.textContent || '';
      return centroidVertex.includes('8') && centroidMid.includes('4') && a1.includes('4') && a2.includes('6');
    });
  } finally {
    await app.close();
  }
});

e2eTest('haromszog egyenlotlenseg module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { haromszog_egyenlotlenseg: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="haromszog_egyenlotlenseg"]');
    await waitForIframeSrc(page, 'modules/haromszog_egyenlotlenseg.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/haromszog_egyenlotlenseg\.html/ });
    if (!frame) {
      throw new Error('Haromszog egyenlotlenseg module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="haromszog_egyenlotlenseg"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('haromszog egyenlotlenseg module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { haromszog_egyenlotlenseg: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="haromszog_egyenlotlenseg"]');
    await waitForIframeSrc(page, 'modules/haromszog_egyenlotlenseg.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/haromszog_egyenlotlenseg\.html/ });
    if (!frame) {
      throw new Error('Haromszog egyenlotlenseg module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('haromszog egyenlotlenseg visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { haromszog_egyenlotlenseg: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="haromszog_egyenlotlenseg"]');
    await waitForIframeSrc(page, 'modules/haromszog_egyenlotlenseg.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/haromszog_egyenlotlenseg\.html/ });
    if (!frame) {
      throw new Error('Haromszog egyenlotlenseg module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('ineq-side-a'));
    await frame.evaluate(() => {
      const ineqA = document.getElementById('ineq-side-a');
      const ineqB = document.getElementById('ineq-side-b');
      const ineqC = document.getElementById('ineq-side-c');
      const rangeA = document.getElementById('range-side-a');
      const rangeB = document.getElementById('range-side-b');
      if (!ineqA || !ineqB || !ineqC || !rangeA || !rangeB) return;
      ineqA.value = '6';
      ineqB.value = '9';
      ineqC.value = '12';
      rangeA.value = '6';
      rangeB.value = '9';
      [ineqA, ineqB, ineqC, rangeA, rangeB].forEach((input) => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    await frame.waitForFunction(() => {
      const status = document.getElementById('ineq-status')?.textContent || '';
      const perim = document.getElementById('ineq-perimeter')?.textContent || '';
      const min = document.getElementById('range-min')?.textContent || '';
      const max = document.getElementById('range-max')?.textContent || '';
      const count = document.getElementById('range-count')?.textContent || '';
      return status.includes('Teljes') && perim.includes('27') && min.includes('4') && max.includes('14') && count.includes('11');
    });
  } finally {
    await app.close();
  }
});

e2eTest('szogtetelek module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szogtetelek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szogtetelek"]');
    await waitForIframeSrc(page, 'modules/szogtetelek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/szogtetelek\.html/ });
    if (!frame) {
      throw new Error('Szogtetelek module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="szogtetelek"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('szogtetelek module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szogtetelek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szogtetelek"]');
    await waitForIframeSrc(page, 'modules/szogtetelek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/szogtetelek\.html/ });
    if (!frame) {
      throw new Error('Szogtetelek module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('szogtetelek visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szogtetelek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szogtetelek"]');
    await waitForIframeSrc(page, 'modules/szogtetelek.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/szogtetelek\.html/ });
    if (!frame) {
      throw new Error('Szogtetelek module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('pyth-a'));
    await frame.evaluate(() => {
      const pythA = document.getElementById('pyth-a');
      const pythB = document.getElementById('pyth-b');
      const projC = document.getElementById('proj-c');
      const projP = document.getElementById('proj-p');
      const projQ = document.getElementById('proj-q');
      if (!pythA || !pythB || !projC || !projP || !projQ) return;
      pythA.value = '6';
      pythB.value = '8';
      projC.value = '10';
      projP.value = '3.6';
      projQ.value = '6.4';
      [pythA, pythB, projC, projP, projQ].forEach((input) => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    await frame.waitForFunction(() => {
      const cValue = document.getElementById('pyth-c')?.textContent || '';
      const aValue = document.getElementById('proj-a')?.textContent || '';
      const bValue = document.getElementById('proj-b')?.textContent || '';
      const mValue = document.getElementById('proj-m')?.textContent || '';
      return cValue.includes('10') && aValue.includes('6') && bValue.includes('8') && mValue.includes('4.8');
    });
  } finally {
    await app.close();
  }
});

e2eTest('szinusz koszinusz tetel module runs a test flow', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szinusz_koszinusz_tetel: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szinusz_koszinusz_tetel"]');
    await waitForIframeSrc(page, 'modules/szinusz_koszinusz_tetel.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Teszt' }).click();
    await frameLocator.locator('[data-role="test-help"]').waitFor();
    const difficultyButtons = frameLocator.locator('.difficulty-btn');
    assert.equal(await difficultyButtons.count(), 3);
    await frameLocator.locator('.difficulty-btn[data-difficulty="norm\u00e1l"]').click();
    await frameLocator.locator('#test-area').waitFor({ state: 'visible' });

    const frame = page.frame({ url: /modules\/szinusz_koszinusz_tetel\.html/ });
    if (!frame) {
      throw new Error('Szinusz koszinusz tetel module frame not found');
    }

    const totalQuestions = await frame.evaluate(() => window.currentTestQuestionCount || 0);
    assert.equal(totalQuestions, 10);
    const dots = frameLocator.locator('#pagination-dots .dot');
    await frameLocator.locator('#pagination-dots').waitFor();
    assert.equal(await dots.count(), totalQuestions);
    const navLayout = await frame.evaluate(() => {
      const nav = document.querySelector('.test-navigation');
      if (!nav) return null;
      return {
        display: getComputedStyle(nav).display,
        ids: Array.from(nav.children).map(child => child.id || ''),
        prevDisabled: document.getElementById('prev-q')?.disabled ?? null,
        nextDisabled: document.getElementById('next-q')?.disabled ?? null,
      };
    });
    assert.ok(navLayout);
    assert.equal(navLayout.display, 'flex');
    assert.deepEqual(navLayout.ids, ['prev-q', 'pagination-dots', 'next-q']);
    assert.equal(navLayout.prevDisabled, true);

    const seenKinds = new Set();
    for (let i = 0; i < totalQuestions; i += 1) {
      await frame.waitForFunction(() => typeof window.currentTestAnswer === 'string' && window.currentTestAnswer.length > 0);
      const payload = await frame.evaluate(() => ({
        answerText: window.currentTestAnswer,
        kind: window.currentTestKind,
      }));
      if (payload.kind) {
        seenKinds.add(payload.kind);
      }
      await frameLocator.locator('#test-answer').fill(String(payload.answerText));
      if (i < totalQuestions - 1) {
        await frameLocator.locator('#next-q').click();
        if (i === 0) {
          await frame.waitForFunction(() => {
            const prev = document.getElementById('prev-q');
            return prev && !prev.disabled;
          });
        }
      }
    }
    assert.ok(seenKinds.size >= 1);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="szinusz_koszinusz_tetel"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(QUESTION_TYPES_BY_DIFFICULTY || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersOk: questions.every(q => typeof q.answerString === 'string' && q.answerString.length > 0),
          checkOk: questions.every(q => checkAnswer(q.answerString, q))
        };
      });
    });
    generatorCheck.forEach((entry) => {
      assert.equal(entry.total, 10);
      assert.ok(entry.hasText);
      assert.ok(entry.answersOk);
      assert.ok(entry.checkOk);
    });
  } finally {
    await app.close();
  }
});

e2eTest('szinusz koszinusz tetel module practice grants xp', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szinusz_koszinusz_tetel: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szinusz_koszinusz_tetel"]');
    await waitForIframeSrc(page, 'modules/szinusz_koszinusz_tetel.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Gyakorl\u00e1s' }).click();
    await frameLocator.locator('[data-role="practice-help"]').waitFor();
    const practiceDifficulties = frameLocator.locator('.practice-difficulty');
    assert.equal(await practiceDifficulties.count(), 3);
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6nny\u0171"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="norm\u00e1l"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/szinusz_koszinusz_tetel\.html/ });
    if (!frame) {
      throw new Error('Szinusz koszinusz tetel module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'string' && window.currentPracticeAnswer.length > 0);
    const practicePayload = await frame.evaluate(() => ({
      answerText: window.currentPracticeAnswer,
      kind: window.currentPracticeKind,
    }));
    assert.ok(practicePayload.kind);
    await frameLocator.locator('#practice-input').fill(String(practicePayload.answerText));
    await frameLocator.locator('#practice-input').press('Enter');

    await frame.waitForFunction(() => {
      const feedback = document.getElementById('practice-feedback');
      return feedback && feedback.textContent.includes('Helyes') && feedback.textContent.includes('+3 XP');
    });

    await page.waitForFunction(() => {
      const label = document.getElementById('xp-total-label');
      if (!label) return false;
      const match = label.textContent.match(/(\\d+)/);
      return match && Number(match[1]) > 0;
    });
  } finally {
    await app.close();
  }
});

e2eTest('szinusz koszinusz tetel visual model updates outputs', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getProgressSummary);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { szinusz_koszinusz_tetel: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="geometria_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="haromszogek_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="szinusz_koszinusz_tetel"]');
    await waitForIframeSrc(page, 'modules/szinusz_koszinusz_tetel.html');

    const frameLocator = page.frameLocator('#content-frame');
    await frameLocator.locator('.tab-button', { hasText: 'Vizu\u00e1lis modell' }).click();

    const frame = page.frame({ url: /modules\/szinusz_koszinusz_tetel\.html/ });
    if (!frame) {
      throw new Error('Szinusz koszinusz tetel module frame not found');
    }

    await frame.waitForFunction(() => document.getElementById('sin-side-a'));
    await frame.evaluate(() => {
      const sinA = document.getElementById('sin-side-a');
      const angleA = document.getElementById('sin-angle-a');
      const angleB = document.getElementById('sin-angle-b');
      const cosA = document.getElementById('cos-side-a');
      const cosB = document.getElementById('cos-side-b');
      const angleC = document.getElementById('cos-angle-c');
      if (!sinA || !angleA || !angleB || !cosA || !cosB || !angleC) return;
      sinA.value = '8';
      angleA.value = '30';
      angleB.value = '90';
      cosA.value = '6';
      cosB.value = '8';
      angleC.value = '90';
      [sinA, angleA, angleB, cosA, cosB, angleC].forEach((input) => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    await frame.waitForFunction(() => {
      const sideB = document.getElementById('sin-side-b')?.textContent || '';
      const angleC = document.getElementById('sin-angle-c')?.textContent || '';
      const sideC = document.getElementById('cos-side-c')?.textContent || '';
      return sideB.includes('16') && angleC.includes('60') && sideC.includes('10');
    });
  } finally {
    await app.close();
  }
});

e2eTest('applies settings from the settings overlay', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getSettings);

    await page.click('#settings-fab');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('settings-overlay');
      return overlay && !overlay.classList.contains('is-hidden');
    });

    await page.click('.theme-card[data-theme="galaxis"]');
    await page.click('#settings-save');

    await page.waitForFunction(() => {
      const root = document.documentElement;
      return root.style.getPropertyValue('--sidebar-bg').trim() === '#141525';
    });
  } finally {
    await app.close();
  }
});

e2eTest('settings cancel discards preview changes', async () => {
  const { app, page, userDataDir } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getSettings);

    const initialSidebar = await page.evaluate(() => {
      const root = document.documentElement;
      return root.style.getPropertyValue('--sidebar-bg').trim();
    });

    await page.click('#settings-fab');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('settings-overlay');
      return overlay && !overlay.classList.contains('is-hidden');
    });

    await page.click('.theme-card[data-theme="galaxis"]');
    await page.waitForFunction(() => {
      const root = document.documentElement;
      return root.style.getPropertyValue('--sidebar-bg').trim() === '#141525';
    });

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('settings-overlay');
      return overlay && overlay.classList.contains('is-hidden');
    });

    const finalSidebar = await page.evaluate(() => {
      const root = document.documentElement;
      return root.style.getPropertyValue('--sidebar-bg').trim();
    });
    assert.equal(finalSidebar, initialSidebar);

    const settingsPath = path.join(userDataDir, 'settings.json');
    assert.equal(fs.existsSync(settingsPath), false);
  } finally {
    await app.close();
  }
});

e2eTest('settings save persists to disk', async () => {
  const { app, page, userDataDir } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getSettings);

    await page.click('#settings-fab');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('settings-overlay');
      return overlay && !overlay.classList.contains('is-hidden');
    });

    await page.click('.theme-card[data-theme="galaxis"]');
    await page.click('#settings-save');

    await page.waitForFunction(async () => {
      const settings = await window.electronAPI.getSettings();
      return settings && settings.sidebarBg === '#141525';
    });

    const settingsPath = path.join(userDataDir, 'settings.json');
    assert.ok(fs.existsSync(settingsPath));
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.equal(saved.themeId, 'galaxis');
    assert.equal(saved.sidebarBg, '#141525');
  } finally {
    await app.close();
  }
});

e2eTest('applies module opacity to iframe body', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getSettings);

    const bgPath = path.join(os.tmpdir(), `matek-bg-${Date.now()}.png`);
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12P4z8DwHwAFgwJ/lQw5WQAAAABJRU5ErkJggg==';
    fs.writeFileSync(bgPath, Buffer.from(pngBase64, 'base64'));

    await page.click('#settings-fab');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('settings-overlay');
      return overlay && !overlay.classList.contains('is-hidden');
    });

    const bgInput = page.locator('#setting-bg-file');
    await bgInput.setInputFiles(bgPath);
    await page.evaluate(() => {
      const slider = document.getElementById('setting-module-opacity');
      if (slider) {
        slider.value = '0.7';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const overlaySlider = document.getElementById('setting-content-overlay-alpha');
      if (overlaySlider) {
        overlaySlider.value = '0.6';
        overlaySlider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.click('#settings-save');

    await page.waitForFunction(() => {
      const content = document.querySelector('.content');
      if (!content) return false;
      const bg = getComputedStyle(content).backgroundImage || '';
      return bg.includes('data:image');
    });
    const overlayAlpha = await page.evaluate(() => {
      const rootInline = document.documentElement.style
        .getPropertyValue('--content-overlay')
        .trim();
      const rootComputed = getComputedStyle(document.documentElement)
        .getPropertyValue('--content-overlay')
        .trim();
      const content = document.querySelector('.content');
      const fallbackValue = content
        ? getComputedStyle(content, '::before').backgroundColor
        : '';
      const value = rootInline || rootComputed || fallbackValue || '';
      const match = value.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/);
      return match ? Number(match[1]) : null;
    });
    assert.ok(overlayAlpha !== null);
    assert.ok(Math.abs(overlayAlpha - 0.6) < 0.05);

    await page.evaluate(() => {
      try {
        questState = { version: 1, topics: { halmazmuveletek: 'ACTIVE' } };
        localStorage.setItem('matek-mester-quests-v1', JSON.stringify(questState));
        if (window.electronAPI && typeof window.electronAPI.saveQuestState === 'function') {
          window.electronAPI.saveQuestState(questState);
        }
        if (typeof saveQuestState === 'function') {
          saveQuestState();
        }
        if (typeof ensureQuestDefaults === 'function') {
          ensureQuestDefaults();
        }
      } catch (error) {
        // Ignore localStorage failures in test setup.
      }
    });

    await page.evaluate(() => {
      const outer = document.querySelector('[data-topic-id="alapozo_modulzaro"]')?.closest('details');
      if (outer) outer.open = true;
      const inner = document.querySelector('[data-topic-id="gondolkodas_temazaro"]')?.closest('details');
      if (inner) inner.open = true;
    });

    await page.click('[data-topic-id="halmazmuveletek"]');
    await waitForIframeSrc(page, 'modules/halmazmuveletek.html');

    const frame = page.frame({ url: /modules\/halmazmuveletek\.html/ });
    if (!frame) {
      throw new Error('Module frame not found');
    }
    await frame.waitForFunction(() => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue('--module-card-opacity')
        .trim();
      return value && value.length > 0;
    });

    const frameBackgrounds = await frame.evaluate(() => {
      const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      return { htmlBg, bodyBg };
    });
    const parseAlpha = (value) => {
      if (value === 'transparent') return 0;
      const match = value.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/);
      if (!match) return null;
      return Number(match[1]);
    };
    const htmlAlpha = parseAlpha(frameBackgrounds.htmlBg);
    const bodyAlpha = parseAlpha(frameBackgrounds.bodyBg);
    assert.ok(htmlAlpha !== null && htmlAlpha <= 0.01);
    assert.ok(bodyAlpha !== null && bodyAlpha <= 0.01);

    const opacityValue = await frame.evaluate(() => {
      const root = document.documentElement;
      const inlineValue = root.style.getPropertyValue('--module-card-opacity').trim();
      const computedValue = getComputedStyle(root).getPropertyValue('--module-card-opacity').trim();
      return inlineValue || computedValue;
    });
    assert.ok(opacityValue);
    const opacityNumber = Number(opacityValue);
    assert.ok(Number.isFinite(opacityNumber));
    assert.ok(Math.abs(opacityNumber - 0.7) < 0.05);

    await page.click('#results-btn');
    await waitForIframeSrc(page, 'modules/results.html');

    const resultsFrame = page.frame({ url: /modules\/results\.html/ });
    if (!resultsFrame) {
      throw new Error('Results frame not found');
    }

    const panelAlpha = await resultsFrame.evaluate(() => {
      const card = document.querySelector('.xp-summary');
      if (!card) return null;
      const bg = getComputedStyle(card).backgroundColor;
      const match = bg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/);
      if (match) return Number(match[1]);
      if (bg.startsWith('rgb(')) return 1;
      return null;
    });
    assert.ok(panelAlpha !== null);
    assert.ok(Math.abs(panelAlpha - 0.7) < 0.05);
  } finally {
    await app.close();
  }
});

e2eTest('saves avatar image from settings overlay', async () => {
  const { app, page } = await launchApp();
  try {
    await page.waitForFunction(() => window.electronAPI && window.electronAPI.getSettings);

    const avatarPath = path.join(os.tmpdir(), `matek-avatar-${Date.now()}.png`);
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12P4z8DwHwAFgwJ/lQw5WQAAAABJRU5ErkJggg==';
    fs.writeFileSync(avatarPath, Buffer.from(pngBase64, 'base64'));

    await page.click('#settings-fab');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('settings-overlay');
      return overlay && !overlay.classList.contains('is-hidden');
    });

    const input = page.locator('#setting-avatar-file');
    await input.setInputFiles(avatarPath);
    await page.click('#settings-save');

    await page.waitForFunction(() => {
      const root = document.documentElement;
      const value = root.style.getPropertyValue('--avatar-image');
      return value && value.includes('data:image');
    });
  } finally {
    await app.close();
  }
});
