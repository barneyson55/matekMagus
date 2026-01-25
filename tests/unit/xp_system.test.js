const test = require('node:test');
const assert = require('node:assert/strict');

const { loadMainContext } = require('./helpers/main_context');
const { TOPIC_CONFIG, LEVEL_TYPES, XP_CAP, MAX_LEVEL } = require('../../xp_config');
const { XP_SAMPLE_RESULTS, XP_PRACTICE_SAMPLE, XP_LEVEL_SAMPLE } = require('./fixtures/xp_fixtures');

function getXpForSample(context, sample) {
  return context.calculateTestXp({
    topicId: sample.topicId,
    grade: sample.grade,
    normalizedDifficulty: sample.normalizedDifficulty,
  });
}

test('calculateTestXp returns a finite XP value for configured topics', () => {
  const { context } = loadMainContext();
  assert.equal(typeof context.calculateTestXp, 'function');
  XP_SAMPLE_RESULTS.forEach((sample) => {
    const xp = getXpForSample(context, sample);
    assert.ok(Number.isFinite(xp), 'TODO: assert XP formula matches constitution xp_formula.md');
  });
});

test('calculateLevelStats exposes level name and XP progress', () => {
  const { context } = loadMainContext();
  const stats = context.calculateLevelStats(XP_LEVEL_SAMPLE.totalXp);
  assert.ok(stats && typeof stats === 'object');
  assert.ok(Number.isFinite(stats.level), 'TODO: assert exact level for given XP');
  assert.equal(typeof stats.levelName, 'string');
  assert.ok(Number.isFinite(stats.xpToNext), 'TODO: assert xpToNext from xp_roadmap.md');
});

test('recordPracticeXp aggregates practice stats and total XP', () => {
  const { context } = loadMainContext();
  const progress = { totalXp: 0, practice: { statsByTopic: {} } };
  context.recordPracticeXp(progress, XP_PRACTICE_SAMPLE);
  const entry = progress.practice.statsByTopic[XP_PRACTICE_SAMPLE.topicId];
  assert.ok(entry, 'TODO: assert practice stats entry is created');
  assert.equal(progress.totalXp, XP_PRACTICE_SAMPLE.xp);
  assert.ok(entry.xpEarned >= XP_PRACTICE_SAMPLE.xp, 'TODO: assert per-difficulty counters');
});

function computeScenarioXp(context, difficultyKey) {
  const aliasMap = context.TOPIC_ID_ALIASES || {};
  const seen = new Set();
  let total = 0;
  Object.entries(TOPIC_CONFIG).forEach(([topicId, config]) => {
    const canonical = aliasMap[topicId] || topicId;
    if (seen.has(canonical)) return;
    seen.add(canonical);
    const difficulty = config.levelType === LEVEL_TYPES.FOTEMA ? null : difficultyKey;
    total += context.calculateTestXp({
      topicId: canonical,
      grade: 5,
      normalizedDifficulty: difficulty,
    });
  });
  return total;
}

test('level curve segments grow monotonically and stay continuous', () => {
  const { context } = loadMainContext();
  const levelTable = typeof context.buildLevelTable === 'function'
    ? context.buildLevelTable()
    : context.LEVEL_TABLE;
  assert.ok(Array.isArray(levelTable), 'level table should be available');
  assert.equal(levelTable.length, MAX_LEVEL);
  let previousSegment = null;
  levelTable.forEach((entry, index) => {
    const segment = entry.xpEnd - entry.xpStart;
    assert.ok(segment > 0, 'segment size should be positive');
    if (index > 0) {
      const prev = levelTable[index - 1];
      assert.equal(entry.xpStart, prev.xpEnd);
      assert.ok(segment >= previousSegment);
    }
    if (index < levelTable.length - 1) {
      assert.equal(entry.xpToNext, segment);
    } else {
      assert.equal(entry.xpToNext, 0);
    }
    previousSegment = segment;
  });
});

test('XP clamping enforces 0..XP_CAP bounds', () => {
  const { context } = loadMainContext();
  assert.equal(context.clampTotalXp(-50), 0);
  assert.equal(context.clampTotalXp(XP_CAP + 5000), XP_CAP);
  const clampedStats = context.calculateLevelStats(XP_CAP + 5000);
  assert.equal(clampedStats.level, MAX_LEVEL);
  assert.equal(clampedStats.xpToNext, 0);
});

test('max level is reachable under hardest test-only scenario', () => {
  const { context } = loadMainContext();
  const totalXp = computeScenarioXp(context, 'nehez');
  assert.ok(totalXp >= XP_CAP);
  const stats = context.calculateLevelStats(totalXp);
  assert.equal(stats.level, MAX_LEVEL);
});
