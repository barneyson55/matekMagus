const QUEST_STATUS_ORDER = { NOT_ACCEPTED: 0, ACTIVE: 1, COMPLETED: 2 };

function coerceNumber(value, fallback = null) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function pickMaxNumber(first, second) {
  const a = coerceNumber(first, null);
  const b = coerceNumber(second, null);
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function parseTimestamp(value) {
  if (typeof value !== 'string') return NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function pickEarliestTimestamp(first, second) {
  if (!first && !second) return null;
  if (!first) return second;
  if (!second) return first;
  const firstMs = parseTimestamp(first);
  const secondMs = parseTimestamp(second);
  if (Number.isFinite(firstMs) && Number.isFinite(secondMs)) {
    return firstMs <= secondMs ? first : second;
  }
  if (Number.isFinite(firstMs) && !Number.isFinite(secondMs)) return first;
  if (!Number.isFinite(firstMs) && Number.isFinite(secondMs)) return second;
  return first || second;
}

function pickLatestTimestamp(first, second) {
  if (!first && !second) return null;
  if (!first) return second;
  if (!second) return first;
  const firstMs = parseTimestamp(first);
  const secondMs = parseTimestamp(second);
  if (Number.isFinite(firstMs) && Number.isFinite(secondMs)) {
    return firstMs >= secondMs ? first : second;
  }
  if (Number.isFinite(firstMs) && !Number.isFinite(secondMs)) return first;
  if (!Number.isFinite(firstMs) && Number.isFinite(secondMs)) return second;
  return second || first;
}

function createDifficultyEntry() {
  return {
    bestGrade: null,
    bestXp: 0,
    bestTimestamp: null,
    attempts: [],
  };
}

function createTopicResultsEntry() {
  return { difficulties: {} };
}

function createMainResultsEntry() {
  return {
    bestGrade: null,
    bestXp: 0,
    bestTimestamp: null,
    attempts: [],
  };
}

function createPracticeEntry() {
  return {
    xpEarned: 0,
    correctCount: 0,
    totalCount: 0,
    lastPracticedAt: null,
    difficulties: {
      konnyu: { correctCount: 0, totalCount: 0 },
      normal: { correctCount: 0, totalCount: 0 },
      nehez: { correctCount: 0, totalCount: 0 },
    },
  };
}

function mergeAttemptLists(primary, secondary) {
  const base = Array.isArray(primary) ? primary : [];
  const incoming = Array.isArray(secondary) ? secondary : [];
  if (!base.length) return incoming.slice();
  if (!incoming.length) return base.slice();
  return base.concat(incoming);
}

function shouldUpdateBestGrade(nextGrade, currentGrade) {
  if (typeof nextGrade !== 'number') return false;
  if (currentGrade === null || typeof currentGrade !== 'number') return true;
  return nextGrade > currentGrade;
}

function mergeDifficultyEntry(target, incoming) {
  const merged = createDifficultyEntry();
  if (target && typeof target === 'object') {
    if (typeof target.bestGrade === 'number') merged.bestGrade = target.bestGrade;
    if (typeof target.bestXp === 'number') merged.bestXp = target.bestXp;
    if (typeof target.bestTimestamp === 'string') merged.bestTimestamp = target.bestTimestamp;
    merged.attempts = mergeAttemptLists(target.attempts, []);
  }
  if (incoming && typeof incoming === 'object') {
    const shouldUpdate = shouldUpdateBestGrade(incoming.bestGrade, merged.bestGrade)
      || (typeof incoming.bestGrade === 'number'
        && incoming.bestGrade === merged.bestGrade
        && typeof incoming.bestXp === 'number'
        && incoming.bestXp > merged.bestXp);
    if (shouldUpdate) {
      if (typeof incoming.bestGrade === 'number') merged.bestGrade = incoming.bestGrade;
      if (typeof incoming.bestXp === 'number') merged.bestXp = incoming.bestXp;
      if (typeof incoming.bestTimestamp === 'string') merged.bestTimestamp = incoming.bestTimestamp;
    }
    merged.attempts = mergeAttemptLists(merged.attempts, incoming.attempts);
  }
  return merged;
}

function mergeTopicResultsEntry(target, incoming) {
  const merged = createTopicResultsEntry();
  const baseDiffs = target && target.difficulties ? target.difficulties : {};
  const incomingDiffs = incoming && incoming.difficulties ? incoming.difficulties : {};
  const diffKeys = new Set([...Object.keys(baseDiffs), ...Object.keys(incomingDiffs)]);
  diffKeys.forEach((key) => {
    merged.difficulties[key] = mergeDifficultyEntry(baseDiffs[key], incomingDiffs[key]);
  });
  return merged;
}

function mergeMainResultsEntry(target, incoming) {
  const merged = createMainResultsEntry();
  if (target && typeof target === 'object') {
    if (typeof target.bestGrade === 'number') merged.bestGrade = target.bestGrade;
    if (typeof target.bestXp === 'number') merged.bestXp = target.bestXp;
    if (typeof target.bestTimestamp === 'string') merged.bestTimestamp = target.bestTimestamp;
    merged.attempts = mergeAttemptLists(target.attempts, []);
  }
  if (incoming && typeof incoming === 'object') {
    const shouldUpdate = shouldUpdateBestGrade(incoming.bestGrade, merged.bestGrade)
      || (typeof incoming.bestGrade === 'number'
        && incoming.bestGrade === merged.bestGrade
        && typeof incoming.bestXp === 'number'
        && incoming.bestXp > merged.bestXp);
    if (shouldUpdate) {
      if (typeof incoming.bestGrade === 'number') merged.bestGrade = incoming.bestGrade;
      if (typeof incoming.bestXp === 'number') merged.bestXp = incoming.bestXp;
      if (typeof incoming.bestTimestamp === 'string') merged.bestTimestamp = incoming.bestTimestamp;
    }
    merged.attempts = mergeAttemptLists(merged.attempts, incoming.attempts);
  }
  return merged;
}

function mergeResultsBucket(baseBucket, incomingBucket, expectsDifficulty) {
  const merged = {};
  const base = baseBucket && typeof baseBucket === 'object' ? baseBucket : {};
  const incoming = incomingBucket && typeof incomingBucket === 'object' ? incomingBucket : {};
  const ids = new Set([...Object.keys(base), ...Object.keys(incoming)]);
  ids.forEach((id) => {
    merged[id] = expectsDifficulty
      ? mergeTopicResultsEntry(base[id], incoming[id])
      : mergeMainResultsEntry(base[id], incoming[id]);
  });
  return merged;
}

function mergeResults(localResults, remoteResults) {
  const base = localResults && typeof localResults === 'object' ? localResults : {};
  const incoming = remoteResults && typeof remoteResults === 'object' ? remoteResults : {};
  return {
    topics: mergeResultsBucket(base.topics, incoming.topics, true),
    subtopics: mergeResultsBucket(base.subtopics, incoming.subtopics, true),
    mainTopics: mergeResultsBucket(base.mainTopics, incoming.mainTopics, false),
  };
}

function mergePracticeEntry(target, incoming) {
  const merged = createPracticeEntry();
  const base = target && typeof target === 'object' ? target : {};
  const next = incoming && typeof incoming === 'object' ? incoming : {};
  merged.xpEarned = Number(base.xpEarned || 0) + Number(next.xpEarned || 0);
  merged.correctCount = Number(base.correctCount || 0) + Number(next.correctCount || 0);
  merged.totalCount = Number(base.totalCount || 0) + Number(next.totalCount || 0);
  merged.lastPracticedAt = pickLatestTimestamp(base.lastPracticedAt, next.lastPracticedAt);
  Object.keys(merged.difficulties).forEach((key) => {
    const baseDiff = base.difficulties && base.difficulties[key] ? base.difficulties[key] : {};
    const nextDiff = next.difficulties && next.difficulties[key] ? next.difficulties[key] : {};
    merged.difficulties[key].correctCount = Number(baseDiff.correctCount || 0)
      + Number(nextDiff.correctCount || 0);
    merged.difficulties[key].totalCount = Number(baseDiff.totalCount || 0)
      + Number(nextDiff.totalCount || 0);
  });
  return merged;
}

function mergePractice(localPractice, remotePractice) {
  const base = localPractice && typeof localPractice === 'object' ? localPractice : {};
  const incoming = remotePractice && typeof remotePractice === 'object' ? remotePractice : {};
  const baseStats = base.statsByTopic && typeof base.statsByTopic === 'object' ? base.statsByTopic : {};
  const incomingStats = incoming.statsByTopic && typeof incoming.statsByTopic === 'object'
    ? incoming.statsByTopic
    : {};
  const mergedStats = {};
  const ids = new Set([...Object.keys(baseStats), ...Object.keys(incomingStats)]);
  ids.forEach((topicId) => {
    mergedStats[topicId] = mergePracticeEntry(baseStats[topicId], incomingStats[topicId]);
  });
  return { statsByTopic: mergedStats };
}

function mergeQuestStatus(current, incoming) {
  const currentScore = QUEST_STATUS_ORDER[current] ?? -1;
  const incomingScore = QUEST_STATUS_ORDER[incoming] ?? -1;
  return incomingScore > currentScore ? incoming : current;
}

function normalizeQuestState(raw) {
  if (!raw || typeof raw !== 'object') {
    return { version: 1, mainTopics: {}, subtopics: {}, topics: {} };
  }
  return {
    version: coerceNumber(raw.version, 1),
    mainTopics: raw.mainTopics && typeof raw.mainTopics === 'object' ? raw.mainTopics : {},
    subtopics: raw.subtopics && typeof raw.subtopics === 'object' ? raw.subtopics : {},
    topics: raw.topics && typeof raw.topics === 'object' ? raw.topics : {},
  };
}

function mergeQuestBucket(baseBucket, incomingBucket) {
  const merged = { ...baseBucket };
  Object.entries(incomingBucket || {}).forEach(([topicId, status]) => {
    merged[topicId] = mergeQuestStatus(merged[topicId], status);
  });
  return merged;
}

function mergeQuestState(localState, remoteState) {
  const base = normalizeQuestState(localState);
  const incoming = normalizeQuestState(remoteState);
  return {
    version: pickMaxNumber(base.version, incoming.version) || 1,
    mainTopics: mergeQuestBucket(base.mainTopics, incoming.mainTopics),
    subtopics: mergeQuestBucket(base.subtopics, incoming.subtopics),
    topics: mergeQuestBucket(base.topics, incoming.topics),
  };
}

function normalizeBuffState(raw) {
  const unlocked = {};
  const active = [];
  if (!raw || typeof raw !== 'object') return { unlocked, active };

  if (raw.unlocked && typeof raw.unlocked === 'object') {
    Object.entries(raw.unlocked).forEach(([buffId, entry]) => {
      if (!buffId) return;
      if (entry && typeof entry === 'object') {
        if (entry.isUnlocked === false) return;
        const record = { isUnlocked: true };
        if (typeof entry.unlockedAt === 'string') record.unlockedAt = entry.unlockedAt;
        unlocked[buffId] = record;
      } else if (entry === true) {
        unlocked[buffId] = { isUnlocked: true };
      }
    });
  }

  if (Array.isArray(raw.active)) {
    raw.active.forEach((entry) => {
      if (!entry) return;
      if (typeof entry === 'string') {
        active.push({ id: entry });
        return;
      }
      if (entry && typeof entry === 'object' && entry.id) {
        const record = { id: entry.id };
        if (typeof entry.activatedAt === 'string') record.activatedAt = entry.activatedAt;
        if (typeof entry.expiresAt === 'string') record.expiresAt = entry.expiresAt;
        active.push(record);
      }
    });
  }

  return { unlocked, active };
}

function shouldReplaceActive(existing, incoming) {
  const incomingExpires = parseTimestamp(incoming && incoming.expiresAt);
  const existingExpires = parseTimestamp(existing && existing.expiresAt);
  if (Number.isFinite(incomingExpires) && Number.isFinite(existingExpires)) {
    return incomingExpires > existingExpires;
  }
  if (Number.isFinite(incomingExpires) && !Number.isFinite(existingExpires)) return true;
  if (!Number.isFinite(incomingExpires) && Number.isFinite(existingExpires)) return false;
  const incomingActivated = parseTimestamp(incoming && incoming.activatedAt);
  const existingActivated = parseTimestamp(existing && existing.activatedAt);
  if (Number.isFinite(incomingActivated) && Number.isFinite(existingActivated)) {
    return incomingActivated > existingActivated;
  }
  if (Number.isFinite(incomingActivated) && !Number.isFinite(existingActivated)) return true;
  return false;
}

function mergeBuffState(localState, remoteState) {
  const base = normalizeBuffState(localState);
  const incoming = normalizeBuffState(remoteState);
  const mergedUnlocked = {};
  const ids = new Set([
    ...Object.keys(base.unlocked),
    ...Object.keys(incoming.unlocked),
  ]);

  const considerUnlocked = (buffId, entry) => {
    if (!buffId || !entry) return;
    const existing = mergedUnlocked[buffId] || { isUnlocked: false };
    const unlockedAt = pickEarliestTimestamp(existing.unlockedAt, entry.unlockedAt);
    mergedUnlocked[buffId] = { isUnlocked: true };
    if (unlockedAt) mergedUnlocked[buffId].unlockedAt = unlockedAt;
  };

  Object.entries(base.unlocked).forEach(([buffId, entry]) => considerUnlocked(buffId, entry));
  Object.entries(incoming.unlocked).forEach(([buffId, entry]) => considerUnlocked(buffId, entry));

  const activeById = new Map();
  const addActive = (entry) => {
    if (!entry || !entry.id) return;
    const existing = activeById.get(entry.id);
    if (!existing || shouldReplaceActive(existing, entry)) {
      activeById.set(entry.id, { ...entry });
    }
  };
  base.active.forEach(addActive);
  incoming.active.forEach(addActive);

  const mergedActive = Array.from(activeById.values());
  mergedActive.forEach((entry) => {
    if (entry && entry.id && !mergedUnlocked[entry.id]) {
      mergedUnlocked[entry.id] = { isUnlocked: true };
    }
  });

  return { unlocked: mergedUnlocked, active: mergedActive };
}

function mergeAchievements(localAchievements, remoteAchievements) {
  const base = localAchievements && typeof localAchievements === 'object' ? localAchievements : {};
  const incoming = remoteAchievements && typeof remoteAchievements === 'object' ? remoteAchievements : {};
  const merged = {};
  const ids = new Set([...Object.keys(base), ...Object.keys(incoming)]);
  ids.forEach((id) => {
    const localEntry = base[id] && typeof base[id] === 'object' ? base[id] : {};
    const remoteEntry = incoming[id] && typeof incoming[id] === 'object' ? incoming[id] : {};
    const isUnlocked = Boolean(localEntry.isUnlocked || remoteEntry.isUnlocked);
    const unlockedAt = pickEarliestTimestamp(localEntry.unlockedAt, remoteEntry.unlockedAt);
    const grantedXp = pickMaxNumber(localEntry.grantedXp, remoteEntry.grantedXp);
    merged[id] = { isUnlocked };
    if (unlockedAt) merged[id].unlockedAt = unlockedAt;
    if (Number.isFinite(grantedXp)) merged[id].grantedXp = grantedXp;
  });
  return merged;
}

function getResultId(result) {
  if (!result || typeof result !== 'object') return null;
  if (typeof result.resultId === 'string' && result.resultId.trim()) return result.resultId;
  if (typeof result.id === 'string' && result.id.trim()) return result.id;
  if (typeof result.attemptId === 'string' && result.attemptId.trim()) return result.attemptId;
  return null;
}

function mergeResultHistory(localTests, remoteTests) {
  const merged = [];
  const seen = new Set();
  const addEntry = (entry) => {
    if (entry === null || entry === undefined) return;
    const id = getResultId(entry);
    if (id) {
      if (seen.has(id)) return;
      seen.add(id);
    }
    merged.push(entry);
  };
  if (Array.isArray(localTests)) localTests.forEach(addEntry);
  if (Array.isArray(remoteTests)) remoteTests.forEach(addEntry);
  return merged;
}

/**
 * mergeProgress(local, remote)
 *
 * Rules (see docs/sync_contract.md):
 * - totalXp never decreases (max of local/remote).
 * - results/tests are append-only; de-dup when ids match.
 * - achievements union: isUnlocked is monotonic, unlockedAt picks earliest, grantedXp picks max.
 * - quests are monotonic by status ordering (NOT_ACCEPTED < ACTIVE < COMPLETED).
 * - practice stats are additive; lastPracticedAt picks latest.
 * - buffs union by id; unlockedAt picks earliest; active keeps latest expiry/activation.
 */
function mergeProgress(local, remote) {
  const base = local && typeof local === 'object' ? local : {};
  const incoming = remote && typeof remote === 'object' ? remote : {};
  const merged = { ...base, ...incoming };

  const version = pickMaxNumber(base.version, incoming.version);
  if (Number.isFinite(version)) merged.version = version;

  const baseXp = coerceNumber(base.totalXp, 0) || 0;
  const incomingXp = coerceNumber(incoming.totalXp, 0) || 0;
  merged.totalXp = Math.max(baseXp, incomingXp);

  merged.tests = mergeResultHistory(base.tests, incoming.tests);
  merged.results = mergeResults(base.results, incoming.results);
  merged.practice = mergePractice(base.practice, incoming.practice);
  merged.quests = mergeQuestState(base.quests, incoming.quests);
  merged.achievements = mergeAchievements(base.achievements, incoming.achievements);
  merged.buffs = mergeBuffState(base.buffs, incoming.buffs);

  return merged;
}

module.exports = {
  mergeProgress,
};
