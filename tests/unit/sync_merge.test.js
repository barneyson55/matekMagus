const test = require('node:test');
const assert = require('node:assert/strict');

const { mergeProgress } = require('../../sync_merge');

test('mergeProgress keeps totalXp monotonic (no decrease)', () => {
  const local = { totalXp: 120 };
  const remote = { totalXp: 80 };
  const merged = mergeProgress(local, remote);
  assert.equal(merged.totalXp, 120);

  const mergedRemote = mergeProgress({ totalXp: 50 }, { totalXp: 200 });
  assert.equal(mergedRemote.totalXp, 200);
});

test('mergeProgress unions achievements with earliest unlock and max XP', () => {
  const local = {
    achievements: {
      first_test: { isUnlocked: true, unlockedAt: '2026-01-02T00:00:00.000Z', grantedXp: 10 },
      hard_first: { isUnlocked: false },
    },
  };
  const remote = {
    achievements: {
      first_test: { isUnlocked: true, unlockedAt: '2026-01-01T00:00:00.000Z', grantedXp: 5 },
      hard_first: { isUnlocked: true, unlockedAt: '2026-01-03T00:00:00.000Z', grantedXp: 50 },
    },
  };

  const merged = mergeProgress(local, remote);
  assert.equal(merged.achievements.first_test.isUnlocked, true);
  assert.equal(merged.achievements.first_test.unlockedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(merged.achievements.first_test.grantedXp, 10);
  assert.equal(merged.achievements.hard_first.isUnlocked, true);
  assert.equal(merged.achievements.hard_first.unlockedAt, '2026-01-03T00:00:00.000Z');
  assert.equal(merged.achievements.hard_first.grantedXp, 50);
});

test('mergeProgress appends results and de-duplicates by id', () => {
  const local = {
    tests: [
      { resultId: 'r1', topicId: 'tortek', grade: 3 },
      { resultId: 'r2', topicId: 'tortek', grade: 4 },
    ],
  };
  const remote = {
    tests: [
      { resultId: 'r2', topicId: 'tortek', grade: 5 },
      { resultId: 'r3', topicId: 'tortek', grade: 2 },
    ],
  };

  const merged = mergeProgress(local, remote);
  assert.equal(merged.tests.length, 3);
  assert.equal(merged.tests[0].resultId, 'r1');
  assert.equal(merged.tests[1].resultId, 'r2');
  assert.equal(merged.tests[2].resultId, 'r3');
});
