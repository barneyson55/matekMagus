const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright-core');

const DEFAULT_TIMEOUT_MS = 15000;

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

  return { app, page, userDataDir };
}

async function waitForIframeSrc(page, fragment) {
  await page.waitForFunction((frag) => {
    const frame = document.getElementById('content-frame');
    return frame && frame.src.includes(frag);
  }, fragment);
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

test('launches and navigates between modules', async () => {
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

test('uses compact header height token', async () => {
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

test('quest log toggle collapses sidebar', async () => {
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

test('opens character sheet from avatar', async () => {
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

test('accepts legacy testResult payloads', async () => {
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

test('test results apply indicators and formula xp', async () => {
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

test('test XP awards only grade improvement delta', async () => {
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

test('low grade test does not award xp', async () => {
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

test('levels update at xp thresholds', async () => {
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

test('migrates legacy progress data into structured results', async () => {
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

test('practice xp updates structured stats', async () => {
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

test('awards achievements on first hard perfect test', async () => {
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

test('character sheet reflects quest counts and achievements', async () => {
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

test('accepts quests from the module banner', async () => {
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

test('aggregates quest status up the hierarchy', async () => {
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

test('practice accepts formatted set answers', async () => {
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

test('halmaz module runs a test flow', async () => {
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

test('linearis module runs a test flow', async () => {
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
    assert.ok(seenKinds.size >= 2);

    await frameLocator.locator('#finish-test-btn').click();

    await frame.waitForFunction(() => {
      const popup = document.getElementById('resultPopup');
      return popup && popup.classList.contains('show');
    });

    await page.waitForFunction(() => {
      const circle = document.querySelector('.status[data-grade-for="linearis_fuggveny"]');
      return circle && circle.classList.contains('grade-5');
    });

    const generatorCheck = await frame.evaluate(() => {
      const difficulties = Object.keys(DIFFICULTY_LABELS || {});
      return difficulties.map((difficulty) => {
        const questions = buildTestQuestions(difficulty);
        return {
          difficulty,
          total: questions.length,
          hasText: questions.every(q => typeof q.question === 'string' && q.question.length > 0),
          answersFinite: questions.every(q => typeof q.answer === 'number' && Number.isFinite(q.answer)),
          kindsValid: questions.every(q => QUESTION_TYPES.includes(q.kind))
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

test('linearis module practice grants xp', async () => {
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

test('linearis visual model updates equation', async () => {
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

test('logikai szita module runs a test flow', async () => {
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

test('logikai szita module practice grants xp', async () => {
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

test('logikai szita visual model updates counts', async () => {
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

test('skatulya elv module practice grants xp', async () => {
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

test('skatulya elv visual model updates outputs', async () => {
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

test('oszthatosag module runs a test flow', async () => {
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

test('oszthatosag module practice grants xp', async () => {
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

test('oszthatosag visual model updates outputs', async () => {
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

test('lnko lkkt module runs a test flow', async () => {
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

test('lnko lkkt module practice grants xp', async () => {
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

test('lnko lkkt visual model updates outputs', async () => {
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

test('primtenyezok module runs a test flow', async () => {
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

test('primtenyezok module practice grants xp', async () => {
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

test('primtenyezok visual model updates outputs', async () => {
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

test('szamrendszerek module runs a test flow', async () => {
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

test('szamrendszerek module practice grants xp', async () => {
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

test('szamrendszerek visual model updates outputs', async () => {
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

test('racionalis szamok temazaro module runs a test flow', async () => {
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

test('racionalis szamok temazaro module practice grants xp', async () => {
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

test('racionalis szamok temazaro visual model updates outputs', async () => {
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

test('tortek module runs a test flow', async () => {
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

test('tortek module practice grants xp', async () => {
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

test('tortek visual model updates outputs', async () => {
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

test('tizedes tortek module runs a test flow', async () => {
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

test('tizedes tortek module practice grants xp', async () => {
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

test('tizedes tortek visual model updates outputs', async () => {
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

test('szazalekszamitas module runs a test flow', async () => {
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

test('szazalekszamitas module practice grants xp', async () => {
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

test('szazalekszamitas visual model updates outputs', async () => {
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

test('hatvany temazaro module runs a test flow', async () => {
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

test('hatvany temazaro module practice grants xp', async () => {
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

test('hatvany temazaro visual model updates outputs', async () => {
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

test('hatvanyozas module runs a test flow', async () => {
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

test('hatvanyozas module practice grants xp', async () => {
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

test('hatvanyozas visual model updates outputs', async () => {
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

test('gyokvonas module runs a test flow', async () => {
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

test('gyokvonas module practice grants xp', async () => {
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

test('gyokvonas visual model updates outputs', async () => {
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

test('records test results and shows them in results view', async () => {
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

test('applies settings from the settings overlay', async () => {
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

test('settings cancel discards preview changes', async () => {
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

test('settings save persists to disk', async () => {
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

test('applies module opacity to iframe body', async () => {
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

test('saves avatar image from settings overlay', async () => {
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
