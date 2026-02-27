const test = require('node:test');
const assert = require('node:assert/strict');

const { XP_CAP, LEVEL_TYPES } = require('../../xp_config');
const { loadMainContext, createFsStub } = require('./helpers/main_context');

function makeResult(overrides = {}) {
  return {
    topicId: 'tortek',
    grade: 4,
    difficulty: 'Könnyű',
    timestamp: '2026-01-01T00:00:00.000Z',
    percentage: 80,
    ...overrides,
  };
}

test('progress persistence reads defaults and writes JSON', () => {
  const fsStub = createFsStub();
  const { context } = loadMainContext({ fsStub });

  assert.deepEqual(context.readProgress(), {});

  context.saveProgress({ totalXp: 5 });
  assert.equal(fsStub.writes.length, 1);
  assert.equal(fsStub.renameCalls.length, 1);
  const persistedPath = fsStub.renameCalls[0].to;
  assert.equal(fsStub.renameCalls[0].from, `${persistedPath}.tmp`);
  assert.equal(JSON.parse(fsStub.store.get(persistedPath)).totalXp, 5);

  fsStub.store.set(persistedPath, JSON.stringify({ totalXp: 42 }));
  const loaded = context.readProgress();
  assert.equal(loaded.totalXp, 42);
});

test('normalizeDifficulty handles accented Hungarian labels', () => {
  const { context } = loadMainContext();
  assert.equal(context.normalizeDifficulty('Könnyű'), 'konnyu');
  assert.equal(context.normalizeDifficulty('könnyu'), 'konnyu');
  assert.equal(context.normalizeDifficulty('Közepes'), 'normal');
  assert.equal(context.normalizeDifficulty('Normál'), 'normal');
  assert.equal(context.normalizeDifficulty('NEHÉZ'), 'nehez');
  assert.equal(context.normalizeDifficulty('ismeretlen'), null);
});

test('applyTestResultToResults tracks attempts and best grades', () => {
  const { context } = loadMainContext();
  const progress = context.createEmptyProgress();

  const update = context.applyTestResultToResults(progress.results, makeResult());
  assert.equal(update.levelType, LEVEL_TYPES.TEMAKOR);
  assert.equal(update.difficulty, 'konnyu');

  const entry = progress.results.topics.tortek.difficulties.konnyu;
  assert.equal(entry.bestGrade, 4);
  assert.equal(entry.bestXp, update.newBestXp);
  assert.equal(entry.attempts.length, 1);
  assert.equal(entry.attempts[0].percentage, 80);
  assert.equal(entry.attempts[0].difficulty, 'konnyu');

  context.applyTestResultToResults(progress.results, makeResult({
    grade: 2,
    timestamp: '2026-01-02T00:00:00.000Z',
  }));
  assert.equal(entry.bestGrade, 4);
  assert.equal(entry.attempts.length, 2);

  context.applyTestResultToResults(progress.results, makeResult({
    grade: 3,
    difficulty: undefined,
    timestamp: '2026-01-04T00:00:00.000Z',
  }));
  const normalEntry = progress.results.topics.tortek.difficulties.normal;
  assert.equal(normalEntry.bestGrade, 3);

  const mainUpdate = context.applyTestResultToResults(progress.results, makeResult({
    topicId: 'algebra_modulzaro',
    grade: 5,
    difficulty: undefined,
    timestamp: '2026-01-03T00:00:00.000Z',
  }));
  assert.equal(mainUpdate.levelType, LEVEL_TYPES.FOTEMA);
  assert.equal(mainUpdate.difficulty, null);

  const mainEntry = progress.results.mainTopics.algebra_modulzaro;
  assert.equal(mainEntry.bestGrade, 5);
  assert.equal(mainEntry.attempts.length, 1);
  assert.equal(mainEntry.attempts[0].difficulty, undefined);
});

test('normalizeProgress migrates legacy shapes and aliases', () => {
  const { context } = loadMainContext();
  const raw = {
    version: 1,
    xp: XP_CAP + 500,
    tests: [
      makeResult({
        topicId: 'abszolut_ertek_fuggveny',
        grade: 4,
        difficulty: 'Nehéz',
      }),
    ],
    results: {
      topics: {
        abszolut_ertek_fuggveny: {
          difficulties: {
            nehez: {
              bestGrade: 2,
              bestXp: 10,
              bestTimestamp: '2025-01-01T00:00:00.000Z',
              attempts: [],
            },
          },
        },
      },
      subtopics: {},
      mainTopics: {},
    },
    practice: {
      statsByTopic: {
        abszolut_ertek_fuggveny: {
          xpEarned: 10,
          correctCount: 1,
          totalCount: 1,
          lastPracticedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    },
    practiceXp: {
      abszolut_ertek_fuggveny: 25,
      tortek: 5,
    },
    buffs: {
      unlocked: ['focus'],
      active: ['focus'],
    },
    achievements: {
      hard_first: {
        isUnlocked: true,
        unlockedAt: '2026-01-01T00:00:00.000Z',
      },
    },
    quests: {
      version: 1,
      topics: { abszolut_ertek_fuggveny: 'ACTIVE' },
      subtopics: {},
      mainTopics: {},
    },
  };

  const { progress, migrated } = context.normalizeProgress(raw);
  assert.equal(migrated, true);
  const expectedVersion = typeof context.PROGRESS_VERSION === 'number' ? context.PROGRESS_VERSION : 2;
  assert.equal(progress.version, expectedVersion);
  assert.equal(progress.totalXp, XP_CAP);
  assert.equal(progress.tests[0].topicId, 'specialis_fuggvenyek');
  assert.equal(progress.results.topics.specialis_fuggvenyek.difficulties.nehez.bestGrade, 4);
  assert.equal(progress.practice.statsByTopic.specialis_fuggvenyek.xpEarned, 35);
  assert.equal(progress.practice.statsByTopic.tortek.xpEarned, 5);
  assert.ok(progress.buffs.unlocked.focus.isUnlocked);
  assert.equal(progress.buffs.active[0].id, 'focus');
  assert.equal(progress.quests.topics.specialis_fuggvenyek, 'ACTIVE');
  assert.ok(progress.achievements.hard_first.isUnlocked);
});

test('updateAchievements unlocks chained awards and grants XP', () => {
  const { context } = loadMainContext();
  const progress = context.createEmptyProgress();
  progress.totalXp = 990;
  progress.tests = [
    makeResult({ grade: 5, difficulty: 'Nehéz' }),
    makeResult({ grade: 4, difficulty: 'Nehéz', timestamp: '2026-01-01T00:01:00.000Z' }),
    makeResult({ grade: 4, difficulty: 'Nehéz', timestamp: '2026-01-01T00:02:00.000Z' }),
    makeResult({ grade: 4, difficulty: 'Nehéz', timestamp: '2026-01-01T00:03:00.000Z' }),
    makeResult({ grade: 4, difficulty: 'Nehéz', timestamp: '2026-01-01T00:04:00.000Z' }),
  ];

  const updated = context.updateAchievements(progress);
  assert.equal(updated, true);
  assert.ok(progress.achievements.first_test.isUnlocked);
  assert.ok(progress.achievements.hard_first.isUnlocked);
  assert.ok(progress.achievements.hard_perfect.isUnlocked);
  assert.ok(progress.achievements.streak_5.isUnlocked);
  assert.ok(progress.achievements.xp_collector_1000.isUnlocked);
  assert.ok(progress.achievements.level_up.isUnlocked);
  assert.equal(progress.achievements.hard_first.grantedXp, 50);
  assert.equal(progress.achievements.hard_perfect.grantedXp, 75);
  assert.equal(progress.achievements.xp_collector_1000.grantedXp, 100);
  assert.equal(progress.totalXp, 1265);

  const secondPass = context.updateAchievements(progress);
  assert.equal(secondPass, false);
});
