const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright-core');

const DEFAULT_TIMEOUT_MS = 15000;

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

test('test results apply indicators and bonus xp', async () => {
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
      difficulty: 'k\u00f6zepes',
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
    }, 690);

    const summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.xp, 690);
    assert.equal(summary.level.level, 3);
    assert.equal(summary.level.xpIntoLevel, 210);
    assert.equal(summary.level.xpForNext, 360);
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

    await addPracticeXp(199, 199);
    let summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.level.level, 1);
    assert.equal(summary.level.xpIntoLevel, 199);
    assert.equal(summary.level.xpForNext, 200);

    await addPracticeXp(1, 200);
    summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.level.level, 2);
    assert.equal(summary.level.xpIntoLevel, 0);
    assert.equal(summary.level.xpForNext, 280);

    await addPracticeXp(279, 479);
    summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.level.level, 2);
    assert.equal(summary.level.xpIntoLevel, 279);
    assert.equal(summary.level.xpForNext, 280);

    await addPracticeXp(1, 480);
    summary = await page.evaluate(() => window.electronAPI.getProgressSummary());
    assert.equal(summary.level.level, 3);
    assert.equal(summary.level.xpIntoLevel, 0);
    assert.equal(summary.level.xpForNext, 360);
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
    await frameLocator.locator('input.practice-difficulty[value="k\u00f6zepes"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="neh\u00e9z"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/linearis_fuggveny\.html/ });
    if (!frame) {
      throw new Error('Linearis module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'number');
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
    await frameLocator.locator('input.practice-difficulty[value="közepes"]').setChecked(false);
    await frameLocator.locator('input.practice-difficulty[value="nehéz"]').setChecked(true);
    await frameLocator.locator('#start-practice-btn').click();

    const frame = page.frame({ url: /modules\/logikai_szita\.html/ });
    if (!frame) {
      throw new Error('Logikai szita module frame not found');
    }

    await frame.waitForFunction(() => typeof window.currentPracticeAnswer === 'number');
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
