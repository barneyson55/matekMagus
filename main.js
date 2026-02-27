// main.js
// The main process for the Electron application. It manages windows, persists
// progress and settings, calculates XP and level stats, and responds to IPC
// messages from the renderer process. This version includes support for
// saving XP earned from practice sessions.

const { app, BrowserWindow, session, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  LEVEL_TYPES,
  DEFAULT_BASE_XP,
  TOPIC_CONFIG,
  LEVEL_BASE_XP,
  LEVEL_GROWTH,
  MAX_LEVEL,
  XP_CAP,
} = require('./xp_config');
const { BUFF_CATALOG } = require('./buffs_config');
const { LocalProgressRepository } = require('./progress_repository');
const BUFF_INDEX = Object.fromEntries(BUFF_CATALOG.map((buff, index) => [buff.id, index]));
const FOCUS_ACTIVE_MINUTES = 15;

const customUserDataDir = process.env.MATEK_MESTER_USER_DATA;
if (customUserDataDir) {
  app.setPath('userData', customUserDataDir);
}

const prodUI = app.isPackaged || process.env.MATEKMESTER_PROD_UI === '1';

// Paths for storing progress and settings in the user's data directory
const progressFilePath = path.join(app.getPath('userData'), 'progress.json');
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
const UPDATE_LOG_FILE = 'auto-update.log';
const UPDATE_INSTALL_DELAY_MS = 3500;
let mainWindow = null;
let lastUpdateStatus = null;
let cachedAutoUpdater = null;

function getAutoUpdater() {
  if (cachedAutoUpdater) return cachedAutoUpdater;
  try {
    ({ autoUpdater: cachedAutoUpdater } = require('electron-updater'));
  } catch (error) {
    writeUpdateLog('electron-updater nem tölthető be ebben a környezetben.', error);
    return null;
  }
  return cachedAutoUpdater;
}

const progressRepository = new LocalProgressRepository({
  filePath: progressFilePath,
  fs,
  logger: console,
  messages: {
    readError: 'Hiba a progress.json olvasása közben:',
    writeError: 'Hiba a progress.json írása közben:',
  },
});

const PROGRESS_VERSION = 2;
const QUEST_VERSION = 2;
const QUEST_STATUS_ORDER = { NOT_ACCEPTED: 0, ACTIVE: 1, COMPLETED: 2 };
const DEFAULT_DIFFICULTY = 'normal';

// XP rewards fallback (legacy behavior) for test completions by difficulty
const XP_REWARDS_FALLBACK = { konnyu: 120, normal: 200, nehez: 320 };
// Labels for human-readable difficulty names
const GRADE_MULTIPLIERS = { 1: 0, 2: 1.0, 3: 1.1, 4: 1.2, 5: 1.3 };
const DIFFICULTY_MULTIPLIERS = { konnyu: 0.7, normal: 1.0, nehez: 1.4 };
const TIER_MULTIPLIERS = {
  [LEVEL_TYPES.FOTEMA]: 1.5,
  [LEVEL_TYPES.ALTEMA]: 1.2,
  [LEVEL_TYPES.TEMAKOR]: 1.0,
};

// Legacy topicId aliases used when normalizing progress.json.
const TOPIC_ID_ALIASES = {
  abszolut_ertek_fuggveny: 'specialis_fuggvenyek',
};

function getUpdateLogPath() {
  const logDir = path.join(app.getPath('userData'), 'logs');
  return { logDir, logPath: path.join(logDir, UPDATE_LOG_FILE) };
}

function writeUpdateLog(message, error) {
  const time = new Date().toISOString();
  const details = error && error.message ? `${message} (${error.message})` : message;
  const line = `[${time}] ${details}`;
  console.log(line);
  try {
    const { logDir, logPath } = getUpdateLogPath();
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logPath, `${line}\n`);
  } catch (logError) {
    console.warn('Auto-update log nem írható:', logError);
  }
}

function sendUpdateStatus(status, data = {}) {
  const payload = { status, ...data };
  lastUpdateStatus = payload;
  const targetWindow = mainWindow || BrowserWindow.getAllWindows()[0];
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send('update-status', payload);
  }
}

function setupAutoUpdates() {
  if (!app.isPackaged) {
    writeUpdateLog('Auto-update letiltva fejlesztői módban.');
    sendUpdateStatus('disabled', { message: 'Frissítés csak telepített verzióban érhető el.' });
    return;
  }
  if (process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR) {
    writeUpdateLog('Auto-update letiltva portable buildben.');
    sendUpdateStatus('disabled', { message: 'Frissítés portable verzióban nem érhető el.' });
    return;
  }

  const autoUpdater = getAutoUpdater();
  if (!autoUpdater) {
    sendUpdateStatus('disabled', { message: 'Frissítő modul nem érhető el ebben a környezetben.' });
    return;
  }

  autoUpdater.autoDownload = true;

  autoUpdater.on('checking-for-update', () => {
    writeUpdateLog('Frissítések ellenőrzése...');
    sendUpdateStatus('checking', { message: 'Frissítések ellenőrzése folyamatban.' });
  });

  autoUpdater.on('update-available', (info) => {
    writeUpdateLog(`Új frissítés érhető el: ${info?.version || 'ismeretlen verzió'}.`);
    sendUpdateStatus('available', { message: 'Új frissítés érhető el. Letöltés indul.' });
  });

  autoUpdater.on('update-not-available', () => {
    writeUpdateLog('Nincs új frissítés.');
    sendUpdateStatus('not-available', { message: 'Nincs új frissítés.' });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.max(0, Math.min(100, Math.round(progress?.percent || 0)));
    sendUpdateStatus('downloading', {
      message: `Frissítés letöltése: ${percent}%.`,
      percent,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    writeUpdateLog('Frissítés letöltve; telepítés indítása.');
    sendUpdateStatus('downloaded', { message: 'Frissítés letöltve, telepítés indul...' });
    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall();
      } catch (error) {
        writeUpdateLog('Frissítés telepítése sikertelen.', error);
        sendUpdateStatus('error', { message: 'Frissítés közben hiba történt.' });
      }
    }, UPDATE_INSTALL_DELAY_MS);
  });

  autoUpdater.on('error', (error) => {
    writeUpdateLog('Frissítés közben hiba történt.', error);
    sendUpdateStatus('error', { message: 'Frissítés közben hiba történt.' });
  });

  autoUpdater.checkForUpdates().catch((error) => {
    writeUpdateLog('Frissítések ellenőrzése sikertelen.', error);
    sendUpdateStatus('error', { message: 'Frissítések ellenőrzése sikertelen.' });
  });
}

function buildLevelTable() {
  const table = [];
  let xpStart = 0;
  for (let level = 1; level <= MAX_LEVEL; level += 1) {
    const xpSegment = Math.round(LEVEL_BASE_XP * Math.pow(LEVEL_GROWTH, level - 1));
    const xpToNext = level < MAX_LEVEL ? xpSegment : 0;
    const xpEnd = xpStart + xpSegment;
    table.push({ level, xpStart, xpEnd, xpToNext });
    xpStart = xpEnd;
  }
  return table;
}

const LEVEL_TABLE = buildLevelTable();

function clampTotalXp(value) {
  const raw = Number(value);
  const xp = Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 0));
  if (!Number.isFinite(XP_CAP) || XP_CAP <= 0) return xp;
  return Math.min(xp, XP_CAP);
}

// Level names from constitution/xp/xp_roadmap.md
const LEVEL_NAMES = [
  'Kezdő Diák',
  'Alapozó Tanonc',
  'Számtan Felfedező',
  'Logika Tanuló',
  'Szorgalmas Gyakorló',
  'Alapok Őre',
  'Számvarázsló Jelölt',
  'Fogalomkalandor',
  'Gondolkodó Tanuló',
  'Stabil Alapozó',
  'Képletkezdő',
  'Algebra Tanonc',
  'Egyenletoldó',
  'Függvénykutató',
  'Grafikonvadász',
  'Geometria Felfedező',
  'Háromszögmester',
  'Körvarázsló',
  'Térlátó Tanonc',
  'Koordináta Navigátor',
  'Kombinatorika Tanonc',
  'Valószínűségi Felfedező',
  'Statisztikai Elemző',
  'Adatvarázsló',
  'Sorozatkutató',
  'Analízis Tanonc',
  'Deriválás Harcosa',
  'Integrálvadász',
  'Függvénystratéga',
  'Matematikai Mesterjelölt',
  'Emelt Szintű Tanuló',
  'Absztrakt Gondolkodó',
  'Problémamegoldó Szakértő',
  'Tételkovács',
  'Bizonyításépítő',
  'Versenyfeladat-vadász',
  'Matematikai Alkimista',
  'Elméleti Matematikus',
  'Alkalmazott Matematikus',
  'Kombinált Stratéga',
  'Struktúraépítő',
  'Fogalomrendszerező',
  'Rendszerszintű Gondolkodó',
  'Tanítósegéd',
  'Mentoráló Diák',
  'Junior Tanár',
  'Oktató Mester',
  'Tudás Nagykövete',
  'Legendás Matematika Hős',
  'Matematikai Nagymester'
];

const ACHIEVEMENT_CATALOG = [
  {
    id: 'first_test',
    title: 'Első teszteredmény',
    description: 'Első sikeres teszt (jegy ≥ 2).',
    xpReward: 0,
    category: 'performance',
  },
  {
    id: 'hard_first',
    title: 'Nehéz harcos',
    description: 'Első nehéz teszt sikeresen teljesítve.',
    xpReward: 50,
    category: 'difficulty',
  },
  {
    id: 'hard_perfect',
    title: 'Tökéletes vizsga',
    description: '5-ös jegy nehéz teszten.',
    xpReward: 75,
    category: 'performance',
  },
  {
    id: 'streak_5',
    title: 'Sorozatgyőztes',
    description: '5 egymást követő jó eredmény.',
    xpReward: 50,
    category: 'performance',
  },
  {
    id: 'subtopic_master',
    title: 'Altéma záró',
    description: 'Egy altéma kimaxolása.',
    xpReward: 80,
    category: 'structure',
  },
  {
    id: 'main_topic_master',
    title: 'Főtéma mester',
    description: 'Egy főtéma kimaxolása.',
    xpReward: 120,
    category: 'structure',
  },
  {
    id: 'emelt_bajnok',
    title: 'Emelt bajnok',
    description: 'Emelt modulzáró sikeres teljesítése.',
    xpReward: 150,
    category: 'difficulty',
  },
  {
    id: 'xp_collector_1000',
    title: 'XP gyűjtő',
    description: 'Összegyűjtöttél 1000 XP-t.',
    xpReward: 100,
    category: 'special',
  },
  {
    id: 'level_up',
    title: 'Szintlépő',
    description: 'Elértél egy új szintet.',
    xpReward: 0,
    category: 'special',
  },
];

// Read the progress.json file if it exists, otherwise return an empty object
function readProgress() {
  return progressRepository.read();
}

// Save the progress object back to disk
function saveProgress(data) {
  progressRepository.write(data);
}

// Save settings to disk
function saveSettings(data) {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Hiba a settings.json írása közben:', error);
  }
}

function normalizeTopicId(topicId) {
  if (!topicId || typeof topicId !== 'string') return topicId;
  return TOPIC_ID_ALIASES[topicId] || topicId;
}

function normalizeResultTopicId(result) {
  if (!result || typeof result !== 'object') return result;
  const normalized = normalizeTopicId(result.topicId);
  if (!normalized || normalized === result.topicId) return result;
  return { ...result, topicId: normalized };
}

function normalizeBuffId(buffId) {
  if (!buffId || typeof buffId !== 'string') return null;
  const trimmed = buffId.trim();
  return trimmed ? trimmed : null;
}

function mergeQuestStatus(current, incoming) {
  const currentScore = QUEST_STATUS_ORDER[current] ?? -1;
  const incomingScore = QUEST_STATUS_ORDER[incoming] ?? -1;
  return incomingScore > currentScore ? incoming : current;
}

function coerceQuestState(raw) {
  const normalized = { version: QUEST_VERSION, mainTopics: {}, subtopics: {}, topics: {} };
  let changed = false;
  if (!raw || typeof raw !== 'object') {
    return { state: normalized, changed: true };
  }
  const versionNumber = Number(raw.version);
  if (Number.isFinite(versionNumber) && versionNumber > 0) {
    normalized.version = versionNumber;
  } else {
    changed = true;
  }
  if (raw.mainTopics && typeof raw.mainTopics === 'object') {
    Object.entries(raw.mainTopics).forEach(([topicId, status]) => {
      const normalizedId = normalizeTopicId(topicId);
      if (normalizedId !== topicId) changed = true;
      const current = normalized.mainTopics[normalizedId];
      normalized.mainTopics[normalizedId] = mergeQuestStatus(current, status);
    });
  }
  if (raw.subtopics && typeof raw.subtopics === 'object') {
    Object.entries(raw.subtopics).forEach(([topicId, status]) => {
      const normalizedId = normalizeTopicId(topicId);
      if (normalizedId !== topicId) changed = true;
      const current = normalized.subtopics[normalizedId];
      normalized.subtopics[normalizedId] = mergeQuestStatus(current, status);
    });
  }
  if (raw.topics && typeof raw.topics === 'object') {
    Object.entries(raw.topics).forEach(([topicId, status]) => {
      const normalizedId = normalizeTopicId(topicId);
      if (normalizedId !== topicId) changed = true;
      const current = normalized.topics[normalizedId];
      normalized.topics[normalizedId] = mergeQuestStatus(current, status);
    });
  }
  return { state: normalized, changed };
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

function createEmptyBuffState() {
  return {
    unlocked: {},
    active: [],
  };
}

function mergeAttemptLists(primary, secondary) {
  const base = Array.isArray(primary) ? primary : [];
  const incoming = Array.isArray(secondary) ? secondary : [];
  if (!base.length) return incoming;
  if (!incoming.length) return base;
  return base.concat(incoming);
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
    if (typeof incoming.bestGrade === 'number' && shouldUpdateBestGrade(incoming.bestGrade, merged.bestGrade)) {
      merged.bestGrade = incoming.bestGrade;
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
  Object.entries(baseDiffs).forEach(([key, entry]) => {
    merged.difficulties[key] = mergeDifficultyEntry(entry, null);
  });
  Object.entries(incomingDiffs).forEach(([key, entry]) => {
    const existing = merged.difficulties[key] || createDifficultyEntry();
    merged.difficulties[key] = mergeDifficultyEntry(existing, entry);
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
    if (typeof incoming.bestGrade === 'number' && shouldUpdateBestGrade(incoming.bestGrade, merged.bestGrade)) {
      merged.bestGrade = incoming.bestGrade;
      if (typeof incoming.bestXp === 'number') merged.bestXp = incoming.bestXp;
      if (typeof incoming.bestTimestamp === 'string') merged.bestTimestamp = incoming.bestTimestamp;
    }
    merged.attempts = mergeAttemptLists(merged.attempts, incoming.attempts);
  }
  return merged;
}

function pickLatestTimestamp(first, second) {
  if (!first && !second) return null;
  if (!first) return second;
  if (!second) return first;
  return new Date(first) >= new Date(second) ? first : second;
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
    merged.difficulties[key].correctCount = Number(baseDiff.correctCount || 0) + Number(nextDiff.correctCount || 0);
    merged.difficulties[key].totalCount = Number(baseDiff.totalCount || 0) + Number(nextDiff.totalCount || 0);
  });
  return merged;
}

function createEmptyProgress() {
  return {
    version: PROGRESS_VERSION,
    totalXp: 0,
    tests: [],
    results: {
      topics: {},
      subtopics: {},
      mainTopics: {},
    },
    practice: {
      statsByTopic: {},
    },
    buffs: createEmptyBuffState(),
    achievements: {},
    quests: coerceQuestState(null).state,
  };
}

function normalizeResultsBucket(bucket, expectsDifficulty) {
  const normalized = {};
  let changed = false;
  if (!bucket || typeof bucket !== 'object') {
    return { normalized, changed: true };
  }
  Object.entries(bucket).forEach(([topicId, entry]) => {
    if (!entry || typeof entry !== 'object') {
      changed = true;
      return;
    }
    const normalizedTopicId = normalizeTopicId(topicId);
    if (normalizedTopicId !== topicId) {
      changed = true;
    }
    if (expectsDifficulty) {
      const normalizedEntry = createTopicResultsEntry();
      const difficulties = entry.difficulties && typeof entry.difficulties === 'object'
        ? entry.difficulties
        : {};
      Object.entries(difficulties).forEach(([difficultyKey, difficultyEntry]) => {
        const normalizedDifficulty = createDifficultyEntry();
        if (difficultyEntry && typeof difficultyEntry === 'object') {
          if (typeof difficultyEntry.bestGrade === 'number') {
            normalizedDifficulty.bestGrade = difficultyEntry.bestGrade;
          }
          if (typeof difficultyEntry.bestXp === 'number') {
            normalizedDifficulty.bestXp = difficultyEntry.bestXp;
          }
          if (typeof difficultyEntry.bestTimestamp === 'string') {
            normalizedDifficulty.bestTimestamp = difficultyEntry.bestTimestamp;
          }
          if (Array.isArray(difficultyEntry.attempts)) {
            normalizedDifficulty.attempts = difficultyEntry.attempts;
          }
        } else {
          changed = true;
        }
        normalizedEntry.difficulties[difficultyKey] = normalizedDifficulty;
      });
      if (normalized[normalizedTopicId]) {
        normalized[normalizedTopicId] = mergeTopicResultsEntry(normalized[normalizedTopicId], normalizedEntry);
        changed = true;
      } else {
        normalized[normalizedTopicId] = normalizedEntry;
      }
      if (!entry.difficulties) {
        changed = true;
      }
    } else {
      const normalizedEntry = createMainResultsEntry();
      if (typeof entry.bestGrade === 'number') {
        normalizedEntry.bestGrade = entry.bestGrade;
      }
      if (typeof entry.bestXp === 'number') {
        normalizedEntry.bestXp = entry.bestXp;
      }
      if (typeof entry.bestTimestamp === 'string') {
        normalizedEntry.bestTimestamp = entry.bestTimestamp;
      }
      if (Array.isArray(entry.attempts)) {
        normalizedEntry.attempts = entry.attempts;
      }
      if (normalized[normalizedTopicId]) {
        normalized[normalizedTopicId] = mergeMainResultsEntry(normalized[normalizedTopicId], normalizedEntry);
        changed = true;
      } else {
        normalized[normalizedTopicId] = normalizedEntry;
      }
    }
  });
  return { normalized, changed };
}

function normalizeResults(rawResults) {
  const normalized = { topics: {}, subtopics: {}, mainTopics: {} };
  let changed = false;
  const topics = normalizeResultsBucket(rawResults && rawResults.topics, true);
  normalized.topics = topics.normalized;
  changed = changed || topics.changed;
  const subtopics = normalizeResultsBucket(rawResults && rawResults.subtopics, true);
  normalized.subtopics = subtopics.normalized;
  changed = changed || subtopics.changed;
  const mainTopics = normalizeResultsBucket(rawResults && rawResults.mainTopics, false);
  normalized.mainTopics = mainTopics.normalized;
  changed = changed || mainTopics.changed;
  return { normalized, changed };
}

function normalizePracticeEntry(rawEntry) {
  const entry = createPracticeEntry();
  if (!rawEntry || typeof rawEntry !== 'object') return entry;
  if (typeof rawEntry.xpEarned === 'number') entry.xpEarned = rawEntry.xpEarned;
  if (typeof rawEntry.correctCount === 'number') entry.correctCount = rawEntry.correctCount;
  if (typeof rawEntry.totalCount === 'number') entry.totalCount = rawEntry.totalCount;
  if (typeof rawEntry.lastPracticedAt === 'string') entry.lastPracticedAt = rawEntry.lastPracticedAt;
  if (rawEntry.difficulties && typeof rawEntry.difficulties === 'object') {
    Object.keys(entry.difficulties).forEach((key) => {
      const diff = rawEntry.difficulties[key];
      if (!diff || typeof diff !== 'object') return;
      if (typeof diff.correctCount === 'number') entry.difficulties[key].correctCount = diff.correctCount;
      if (typeof diff.totalCount === 'number') entry.difficulties[key].totalCount = diff.totalCount;
    });
  }
  return entry;
}

function normalizePractice(rawPractice, legacyPracticeXp) {
  const practice = { statsByTopic: {} };
  let changed = false;
  if (rawPractice && typeof rawPractice === 'object') {
    const stats = rawPractice.statsByTopic && typeof rawPractice.statsByTopic === 'object'
      ? rawPractice.statsByTopic
      : {};
    Object.entries(stats).forEach(([topicId, entry]) => {
      const normalizedId = normalizeTopicId(topicId);
      if (normalizedId !== topicId) changed = true;
      const normalizedEntry = normalizePracticeEntry(entry);
      if (practice.statsByTopic[normalizedId]) {
        practice.statsByTopic[normalizedId] = mergePracticeEntry(practice.statsByTopic[normalizedId], normalizedEntry);
        changed = true;
      } else {
        practice.statsByTopic[normalizedId] = normalizedEntry;
      }
    });
  }
  if (legacyPracticeXp && typeof legacyPracticeXp === 'object') {
    Object.entries(legacyPracticeXp).forEach(([topicId, xpValue]) => {
      const normalizedId = normalizeTopicId(topicId);
      if (normalizedId !== topicId) changed = true;
      const amount = Number(xpValue || 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (!practice.statsByTopic[normalizedId]) {
        practice.statsByTopic[normalizedId] = createPracticeEntry();
      }
      practice.statsByTopic[normalizedId].xpEarned += amount;
    });
    changed = true;
  }
  return { practice, changed };
}

function normalizeBuffState(raw) {
  const buffs = createEmptyBuffState();
  let changed = false;
  if (!raw || typeof raw !== 'object') {
    return { buffs, changed: true };
  }

  const hasUnlocked = Object.prototype.hasOwnProperty.call(raw, 'unlocked');
  if (!hasUnlocked) {
    changed = true;
  } else if (Array.isArray(raw.unlocked)) {
    raw.unlocked.forEach((entry) => {
      const id = normalizeBuffId(
        entry && typeof entry === 'object' ? entry.id : entry
      );
      if (!id) {
        changed = true;
        return;
      }
      if (!buffs.unlocked[id]) {
        buffs.unlocked[id] = { isUnlocked: true };
      }
      if (entry && typeof entry === 'object' && typeof entry.unlockedAt === 'string') {
        buffs.unlocked[id].unlockedAt = entry.unlockedAt;
      }
    });
    changed = true;
  } else if (raw.unlocked && typeof raw.unlocked === 'object') {
    Object.entries(raw.unlocked).forEach(([buffId, entry]) => {
      const id = normalizeBuffId(buffId);
      if (!id) {
        changed = true;
        return;
      }
      if (entry && typeof entry === 'object') {
        if (entry.isUnlocked === false) {
          changed = true;
          return;
        }
        const record = { isUnlocked: true };
        if (typeof entry.unlockedAt === 'string') {
          record.unlockedAt = entry.unlockedAt;
        }
        buffs.unlocked[id] = record;
        if (entry.isUnlocked !== undefined && entry.isUnlocked !== true) {
          changed = true;
        }
      } else if (entry === true) {
        buffs.unlocked[id] = { isUnlocked: true };
        changed = true;
      } else if (typeof entry === 'string') {
        buffs.unlocked[id] = { isUnlocked: true, unlockedAt: entry };
        changed = true;
      } else {
        changed = true;
      }
    });
  } else if (raw.unlocked !== undefined) {
    changed = true;
  }

  const hasActive = Object.prototype.hasOwnProperty.call(raw, 'active');
  if (!hasActive) {
    changed = true;
  } else if (Array.isArray(raw.active)) {
    const seen = new Set();
    raw.active.forEach((entry) => {
      let id = null;
      let activatedAt = null;
      let expiresAt = null;
      if (typeof entry === 'string') {
        id = normalizeBuffId(entry);
        if (id !== entry) changed = true;
      } else if (entry && typeof entry === 'object') {
        id = normalizeBuffId(entry.id);
        if (typeof entry.activatedAt === 'string') activatedAt = entry.activatedAt;
        if (typeof entry.expiresAt === 'string') expiresAt = entry.expiresAt;
        if (id !== entry.id) changed = true;
      } else {
        changed = true;
        return;
      }
      if (!id || seen.has(id)) {
        changed = true;
        return;
      }
      const record = { id };
      if (activatedAt) record.activatedAt = activatedAt;
      if (expiresAt) record.expiresAt = expiresAt;
      buffs.active.push(record);
      seen.add(id);
    });
  } else if (raw.active !== undefined) {
    changed = true;
  }

  buffs.active.forEach((entry) => {
    if (!entry || !entry.id) return;
    if (!buffs.unlocked[entry.id]) {
      buffs.unlocked[entry.id] = { isUnlocked: true };
      changed = true;
    }
  });

  return { buffs, changed };
}

function shouldUpdateBestGrade(nextGrade, currentGrade) {
  if (typeof nextGrade !== 'number') return false;
  if (currentGrade === null || typeof currentGrade !== 'number') return true;
  return nextGrade > currentGrade;
}

function buildAttempt(result, difficultyKey, xpAwarded) {
  const timestamp = typeof result.timestamp === 'string'
    ? result.timestamp
    : new Date().toISOString();
  const attempt = {
    timestamp,
    grade: typeof result.grade === 'number' ? result.grade : null,
  };
  if (typeof result.percentage === 'number') {
    attempt.percentage = result.percentage;
  }
  if (difficultyKey) {
    attempt.difficulty = difficultyKey;
  }
  if (typeof xpAwarded === 'number') {
    attempt.xpAwarded = xpAwarded;
  }
  return attempt;
}

function applyTestResultToResults(results, result) {
  const rawTopicId = result && result.topicId ? result.topicId : null;
  const topicId = normalizeTopicId(rawTopicId);
  if (!topicId) return null;
  const config = getTopicConfig(topicId);
  const levelType = config ? config.levelType : LEVEL_TYPES.TEMAKOR;
  const bucket = levelType === LEVEL_TYPES.FOTEMA
    ? results.mainTopics
    : (levelType === LEVEL_TYPES.ALTEMA ? results.subtopics : results.topics);
  if (!bucket[topicId]) {
    bucket[topicId] = (levelType === LEVEL_TYPES.FOTEMA)
      ? createMainResultsEntry()
      : createTopicResultsEntry();
  }
  if (levelType === LEVEL_TYPES.FOTEMA) {
    const entry = bucket[topicId];
    const previousBestGrade = entry.bestGrade;
    const previousBestXp = entry.bestXp || 0;
    const newXp = calculateTestXp({
      topicId,
      grade: result.grade,
      normalizedDifficulty: null,
    });
    if (!Array.isArray(entry.attempts)) entry.attempts = [];
    const attempt = buildAttempt(result, null, newXp);
    entry.attempts.unshift(attempt);
    if (shouldUpdateBestGrade(result.grade, entry.bestGrade)) {
      entry.bestGrade = result.grade;
      entry.bestXp = newXp;
      entry.bestTimestamp = attempt.timestamp;
    }
    return { levelType, previousBestGrade, previousBestXp, newBestXp: newXp, difficulty: null };
  }
  const difficultyKey = normalizeDifficulty(result.difficulty) || DEFAULT_DIFFICULTY;
  const entry = bucket[topicId];
  if (!entry.difficulties || typeof entry.difficulties !== 'object') {
    entry.difficulties = {};
  }
  if (!entry.difficulties[difficultyKey]) {
    entry.difficulties[difficultyKey] = createDifficultyEntry();
  }
  const diffEntry = entry.difficulties[difficultyKey];
  const previousBestGrade = diffEntry.bestGrade;
  const previousBestXp = diffEntry.bestXp || 0;
  const newXp = calculateTestXp({
    topicId,
    grade: result.grade,
    normalizedDifficulty: difficultyKey,
  });
  if (!Array.isArray(diffEntry.attempts)) diffEntry.attempts = [];
  const attempt = buildAttempt(result, difficultyKey, newXp);
  diffEntry.attempts.unshift(attempt);
  if (shouldUpdateBestGrade(result.grade, diffEntry.bestGrade)) {
    diffEntry.bestGrade = result.grade;
    diffEntry.bestXp = newXp;
    diffEntry.bestTimestamp = attempt.timestamp;
  }
  return { levelType, previousBestGrade, previousBestXp, newBestXp: newXp, difficulty: difficultyKey };
}

function mergeCompletionEntry(results, topicId, difficultyKey, entry) {
  const normalizedTopicId = normalizeTopicId(topicId);
  if (!normalizedTopicId) return;
  const config = getTopicConfig(normalizedTopicId);
  const levelType = config ? config.levelType : LEVEL_TYPES.TEMAKOR;
  const bucket = levelType === LEVEL_TYPES.FOTEMA
    ? results.mainTopics
    : (levelType === LEVEL_TYPES.ALTEMA ? results.subtopics : results.topics);
  if (!bucket[normalizedTopicId]) {
    bucket[normalizedTopicId] = (levelType === LEVEL_TYPES.FOTEMA)
      ? createMainResultsEntry()
      : createTopicResultsEntry();
  }
  const gradeValue = typeof entry === 'number'
    ? entry
    : (entry && typeof entry.grade === 'number' ? entry.grade : null);
  if (gradeValue === null) return;
  const timestamp = entry && typeof entry.timestamp === 'string' ? entry.timestamp : null;
  const xpValue = entry && typeof entry.xp === 'number'
    ? entry.xp
    : calculateTestXp({
      topicId: normalizedTopicId,
      grade: gradeValue,
      normalizedDifficulty: levelType === LEVEL_TYPES.FOTEMA ? null : difficultyKey,
    });
  if (levelType === LEVEL_TYPES.FOTEMA) {
    const existing = bucket[normalizedTopicId];
    if (shouldUpdateBestGrade(gradeValue, existing.bestGrade)) {
      existing.bestGrade = gradeValue;
      existing.bestXp = xpValue;
      existing.bestTimestamp = timestamp;
    }
    return;
  }
  const entryBucket = bucket[normalizedTopicId];
  if (!entryBucket.difficulties || typeof entryBucket.difficulties !== 'object') {
    entryBucket.difficulties = {};
  }
  const key = difficultyKey || DEFAULT_DIFFICULTY;
  if (!entryBucket.difficulties[key]) {
    entryBucket.difficulties[key] = createDifficultyEntry();
  }
  const diffEntry = entryBucket.difficulties[key];
  if (shouldUpdateBestGrade(gradeValue, diffEntry.bestGrade)) {
    diffEntry.bestGrade = gradeValue;
    diffEntry.bestXp = xpValue;
    diffEntry.bestTimestamp = timestamp;
  }
}

function mergeCompletionsIntoResults(results, completions) {
  if (!completions || typeof completions !== 'object') return;
  Object.entries(completions).forEach(([topicId, difficulties]) => {
    if (!difficulties || typeof difficulties !== 'object') return;
    Object.entries(difficulties).forEach(([difficultyKey, entry]) => {
      const normalizedKey = normalizeDifficulty(difficultyKey) || (difficultyKey === 'osszesito' ? null : difficultyKey);
      mergeCompletionEntry(results, topicId, normalizedKey, entry);
    });
  });
}

function buildResultsFromSource(source) {
  const results = { topics: {}, subtopics: {}, mainTopics: {} };
  let migrated = false;
  const sourceVersion = Number(source && source.version);
  const hasCanonicalResults = source && source.results
    && typeof source.results === 'object'
    && Number.isFinite(sourceVersion)
    && sourceVersion >= PROGRESS_VERSION;

  if (hasCanonicalResults) {
    const normalized = normalizeResults(source.results);
    results.topics = normalized.normalized.topics;
    results.subtopics = normalized.normalized.subtopics;
    results.mainTopics = normalized.normalized.mainTopics;
    migrated = normalized.changed;
    return { results, migrated };
  }

  if (!source || !source.results || typeof source.results !== 'object') {
    migrated = true;
  }

  if (source && source.results && typeof source.results === 'object') {
    const normalized = normalizeResults(source.results);
    results.topics = normalized.normalized.topics;
    results.subtopics = normalized.normalized.subtopics;
    results.mainTopics = normalized.normalized.mainTopics;
    migrated = true;
  }

  if (source && Array.isArray(source.tests)) {
    source.tests.forEach((result) => {
      if (!result || !result.topicId) return;
      applyTestResultToResults(results, result);
    });
    migrated = true;
  }

  if (source && source.completions && typeof source.completions === 'object') {
    mergeCompletionsIntoResults(results, source.completions);
    migrated = true;
  }

  return { results, migrated };
}

function normalizeAchievements(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const normalized = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    normalized[key] = {
      isUnlocked: Boolean(value.isUnlocked),
      unlockedAt: typeof value.unlockedAt === 'string' ? value.unlockedAt : null,
    };
    if (typeof value.grantedXp === 'number') {
      normalized[key].grantedXp = value.grantedXp;
    }
  });
  return normalized;
}

function normalizeTestHistory(rawTests) {
  if (!Array.isArray(rawTests)) return { tests: [], changed: true };
  let changed = false;
  const tests = rawTests.map((result) => {
    const normalized = normalizeResultTopicId(result);
    if (normalized !== result) changed = true;
    return normalized;
  });
  return { tests, changed };
}

function getTestHistory(progress) {
  return Array.isArray(progress && progress.tests) ? progress.tests : [];
}

function getQuestStatusBucket(progress, bucketName) {
  const quests = progress && progress.quests ? progress.quests : null;
  const bucket = quests && quests[bucketName] ? quests[bucketName] : {};
  return bucket && typeof bucket === 'object' ? bucket : {};
}

function hasCompletedQuest(progress, bucketName) {
  const bucket = getQuestStatusBucket(progress, bucketName);
  return Object.values(bucket).some(status => status === 'COMPLETED');
}

function hasSuccessfulTest(progress, minGrade = 2) {
  return getTestHistory(progress).some((result) => {
    const grade = Number(result && result.grade);
    return Number.isFinite(grade) && grade >= minGrade;
  });
}

function hasHardTest(progress, minGrade = 2) {
  return getTestHistory(progress).some((result) => {
    const grade = Number(result && result.grade);
    if (!Number.isFinite(grade) || grade < minGrade) return false;
    const diffKey = normalizeDifficulty(result.difficulty);
    return diffKey === 'nehez';
  });
}

function hasPerfectHardTest(progress) {
  return getTestHistory(progress).some((result) => {
    const grade = Number(result && result.grade);
    if (grade !== 5) return false;
    const diffKey = normalizeDifficulty(result.difficulty);
    return diffKey === 'nehez';
  });
}

function hasStreak(progress, minGrade, length) {
  let streak = 0;
  for (const result of getTestHistory(progress)) {
    const grade = Number(result && result.grade);
    if (Number.isFinite(grade) && grade >= minGrade) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak >= length;
}

function hasMainTopicSuccess(progress, topicId, minGrade = 2) {
  if (!progress || !progress.results || !progress.results.mainTopics) return false;
  const entry = progress.results.mainTopics[topicId];
  const bestGrade = entry && typeof entry.bestGrade === 'number' ? entry.bestGrade : null;
  if (bestGrade !== null && bestGrade >= minGrade) return true;
  return getTestHistory(progress).some((result) => {
    if (!result || result.topicId !== topicId) return false;
    const grade = Number(result.grade);
    return Number.isFinite(grade) && grade >= minGrade;
  });
}

function unlockAchievement(progress, achievement, timestamp) {
  if (!progress.achievements || typeof progress.achievements !== 'object') {
    progress.achievements = {};
  }
  const existing = progress.achievements[achievement.id];
  if (existing && existing.isUnlocked) {
    return false;
  }
  const unlockedAt = typeof timestamp === 'string' ? timestamp : new Date().toISOString();
  const entry = { isUnlocked: true, unlockedAt };
  const reward = Number(achievement.xpReward);
  if (Number.isFinite(reward) && reward > 0) {
    entry.grantedXp = reward;
    progress.totalXp = clampTotalXp(Number(progress.totalXp || 0) + reward);
  }
  progress.achievements[achievement.id] = entry;
  return true;
}

function updateAchievements(progress) {
  let updated = false;
  let changed = true;
  while (changed) {
    changed = false;
    ACHIEVEMENT_CATALOG.forEach((achievement) => {
      if (progress.achievements && progress.achievements[achievement.id]?.isUnlocked) {
        return;
      }
      let shouldUnlock = false;
      switch (achievement.id) {
        case 'first_test':
          shouldUnlock = hasSuccessfulTest(progress, 2);
          break;
        case 'hard_first':
          shouldUnlock = hasHardTest(progress, 2);
          break;
        case 'hard_perfect':
          shouldUnlock = hasPerfectHardTest(progress);
          break;
        case 'streak_5':
          shouldUnlock = hasStreak(progress, 4, 5);
          break;
        case 'subtopic_master':
          shouldUnlock = hasCompletedQuest(progress, 'subtopics');
          break;
        case 'main_topic_master':
          shouldUnlock = hasCompletedQuest(progress, 'mainTopics');
          break;
        case 'emelt_bajnok':
          shouldUnlock = hasMainTopicSuccess(progress, 'emelt_modulzaro', 2);
          break;
        case 'xp_collector_1000':
          shouldUnlock = Number(progress.totalXp || 0) >= 1000;
          break;
        case 'level_up':
          shouldUnlock = calculateLevelStats(progress.totalXp).level >= 2;
          break;
        default:
          break;
      }
      if (!shouldUnlock) return;
      if (unlockAchievement(progress, achievement)) {
        updated = true;
        changed = true;
      }
    });
  }
  return updated;
}

function getTotalPracticeCorrect(progress) {
  const stats = progress && progress.practice && progress.practice.statsByTopic
    ? progress.practice.statsByTopic
    : {};
  return Object.values(stats).reduce((sum, entry) => {
    return sum + Number(entry && entry.correctCount ? entry.correctCount : 0);
  }, 0);
}

function getDistinctPracticeTopics(progress) {
  const stats = progress && progress.practice && progress.practice.statsByTopic
    ? progress.practice.statsByTopic
    : {};
  return Object.values(stats).filter((entry) => Number(entry && entry.correctCount) > 0).length;
}

function getLatestPracticeTimestamp(progress) {
  const stats = progress && progress.practice && progress.practice.statsByTopic
    ? progress.practice.statsByTopic
    : {};
  let latest = null;
  Object.values(stats).forEach((entry) => {
    if (!entry || typeof entry.lastPracticedAt !== 'string') return;
    if (!latest || new Date(entry.lastPracticedAt) > new Date(latest)) {
      latest = entry.lastPracticedAt;
    }
  });
  return latest;
}

function countTestsWithGrade(progress, minGrade) {
  return getTestHistory(progress).filter((result) => {
    const grade = Number(result && result.grade);
    return Number.isFinite(grade) && grade >= minGrade;
  }).length;
}

function hasAnyCompletedQuest(progress) {
  return hasCompletedQuest(progress, 'topics')
    || hasCompletedQuest(progress, 'subtopics')
    || hasCompletedQuest(progress, 'mainTopics');
}

function isRecentTimestamp(timestamp, minutes) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) return false;
  const diffMs = Date.now() - date.getTime();
  return diffMs <= minutes * 60 * 1000;
}

function addMinutesToTimestamp(timestamp, minutes) {
  const date = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(date.valueOf())) {
    return new Date().toISOString();
  }
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function getBuffSortIndex(id) {
  if (!id) return Number.MAX_SAFE_INTEGER;
  const index = BUFF_INDEX[id];
  return typeof index === 'number' ? index : Number.MAX_SAFE_INTEGER;
}

function buildActiveBuffRecord(id, activatedAt, expiresAt) {
  const record = { id };
  if (activatedAt) record.activatedAt = activatedAt;
  if (expiresAt) record.expiresAt = expiresAt;
  return record;
}

function isSameActiveList(prev, next) {
  const normalize = (list) => (Array.isArray(list) ? list : [])
    .map((entry) => `${entry && entry.id ? entry.id : ''}:${entry && entry.expiresAt ? entry.expiresAt : ''}`)
    .filter(Boolean)
    .sort();
  const prevKey = normalize(prev);
  const nextKey = normalize(next);
  if (prevKey.length !== nextKey.length) return false;
  return prevKey.every((value, index) => value === nextKey[index]);
}

function updateBuffs(progress) {
  if (!progress || typeof progress !== 'object') {
    return { unlockedChanged: false, activeChanged: false };
  }
  if (!progress.buffs || typeof progress.buffs !== 'object') {
    progress.buffs = createEmptyBuffState();
  }

  const unlocked = progress.buffs.unlocked && typeof progress.buffs.unlocked === 'object'
    ? progress.buffs.unlocked
    : {};
  const existingActive = Array.isArray(progress.buffs.active) ? progress.buffs.active : [];
  let unlockedChanged = false;

  const nowIso = new Date().toISOString();
  const ensureUnlocked = (id) => {
    if (!id) return null;
    const existing = unlocked[id];
    if (existing && existing.isUnlocked) {
      if (!existing.unlockedAt) {
        existing.unlockedAt = nowIso;
        unlockedChanged = true;
      }
      return existing;
    }
    unlocked[id] = { isUnlocked: true, unlockedAt: nowIso };
    unlockedChanged = true;
    return unlocked[id];
  };

  const totalPracticeCorrect = getTotalPracticeCorrect(progress);
  const distinctPracticeTopics = getDistinctPracticeTopics(progress);
  const lastPracticeAt = getLatestPracticeTimestamp(progress);
  const strongTestCount = countTestsWithGrade(progress, 4);
  const hardTestSuccess = hasHardTest(progress, 3);
  const completedQuest = hasAnyCompletedQuest(progress);

  const shouldUnlockFocus = totalPracticeCorrect >= 5;
  const shouldUnlockKitartas = totalPracticeCorrect >= 30;
  const shouldUnlockPrecizitas = strongTestCount >= 3;
  const shouldUnlockKihivas = hardTestSuccess;
  const shouldUnlockFelfedezo = distinctPracticeTopics >= 4;
  const shouldUnlockBajnok = completedQuest;

  const knownBuffIds = new Set([
    'focus',
    'kitartas',
    'precizitas',
    'kihivas',
    'felfedezo',
    'bajnok',
  ]);

  const nextActive = [];

  if (shouldUnlockFocus) {
    const record = ensureUnlocked('focus');
    if (isRecentTimestamp(lastPracticeAt, FOCUS_ACTIVE_MINUTES)) {
      const activatedAt = lastPracticeAt || (record && record.unlockedAt) || nowIso;
      const expiresAt = addMinutesToTimestamp(activatedAt, FOCUS_ACTIVE_MINUTES);
      nextActive.push(buildActiveBuffRecord('focus', activatedAt, expiresAt));
    }
  }

  if (shouldUnlockKitartas) {
    const record = ensureUnlocked('kitartas');
    nextActive.push(buildActiveBuffRecord('kitartas', record && record.unlockedAt ? record.unlockedAt : nowIso));
  }

  if (shouldUnlockPrecizitas) {
    const record = ensureUnlocked('precizitas');
    nextActive.push(buildActiveBuffRecord('precizitas', record && record.unlockedAt ? record.unlockedAt : nowIso));
  }

  if (shouldUnlockKihivas) {
    const record = ensureUnlocked('kihivas');
    nextActive.push(buildActiveBuffRecord('kihivas', record && record.unlockedAt ? record.unlockedAt : nowIso));
  }

  if (shouldUnlockFelfedezo) {
    const record = ensureUnlocked('felfedezo');
    nextActive.push(buildActiveBuffRecord('felfedezo', record && record.unlockedAt ? record.unlockedAt : nowIso));
  }

  if (shouldUnlockBajnok) {
    const record = ensureUnlocked('bajnok');
    nextActive.push(buildActiveBuffRecord('bajnok', record && record.unlockedAt ? record.unlockedAt : nowIso));
  }

  existingActive.forEach((entry) => {
    const id = entry && entry.id;
    if (!id || knownBuffIds.has(id)) return;
    nextActive.push(entry);
  });

  nextActive.sort((first, second) => getBuffSortIndex(first.id) - getBuffSortIndex(second.id));

  const activeChanged = !isSameActiveList(existingActive, nextActive);
  progress.buffs.unlocked = unlocked;
  progress.buffs.active = nextActive;

  return { unlockedChanged, activeChanged };
}

function normalizeProgress(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const progress = createEmptyProgress();
  let migrated = false;

  const version = Number(source.version);
  if (Number.isFinite(version) && version >= PROGRESS_VERSION) {
    progress.version = version;
  } else {
    migrated = true;
  }

  if (typeof source.totalXp === 'number') {
    progress.totalXp = source.totalXp;
  } else if (typeof source.xp === 'number') {
    progress.totalXp = source.xp;
    migrated = true;
  }
  const clampedTotalXp = clampTotalXp(progress.totalXp);
  if (clampedTotalXp !== progress.totalXp) {
    progress.totalXp = clampedTotalXp;
    migrated = true;
  }

  if (Array.isArray(source.tests)) {
    const normalizedTests = normalizeTestHistory(source.tests);
    progress.tests = normalizedTests.tests;
    migrated = migrated || normalizedTests.changed;
  }

  const resultsPayload = buildResultsFromSource(source);
  progress.results = resultsPayload.results;
  migrated = migrated || resultsPayload.migrated;

  const practicePayload = normalizePractice(source.practice, source.practiceXp);
  progress.practice = practicePayload.practice;
  migrated = migrated || practicePayload.changed;

  const buffPayload = normalizeBuffState(source.buffs);
  progress.buffs = buffPayload.buffs;
  migrated = migrated || buffPayload.changed;

  if (source.achievements && typeof source.achievements === 'object') {
    progress.achievements = normalizeAchievements(source.achievements);
  }

  const questPayload = coerceQuestState(source.quests);
  progress.quests = questPayload.state;
  migrated = migrated || questPayload.changed;
  if (!source.quests || typeof source.quests !== 'object') {
    migrated = true;
  } else if (!source.quests.mainTopics || !source.quests.subtopics || !source.quests.topics) {
    migrated = true;
  }

  return { progress, migrated };
}

// Normalize accented Hungarian difficulty names to XP keys
function normalizeDifficulty(label = '') {
  const base = label
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
  if (base.includes('konny')) return 'konnyu';
  if (base.includes('kozep')) return 'normal';
  if (base.includes('normal')) return 'normal';
  if (base.includes('nehez')) return 'nehez';
  return null;
}

// XP calculation helpers (constitution/xp/xp_formula.md)
function getTopicConfig(topicId) {
  const normalized = normalizeTopicId(topicId);
  if (!normalized) return null;
  return TOPIC_CONFIG[normalized] || null;
}

function calculateTestXp({ topicId, grade, normalizedDifficulty }) {
  const gradeMultiplier = GRADE_MULTIPLIERS[grade] ?? 0;
  if (!gradeMultiplier) return 0;
  const config = getTopicConfig(topicId);
  if (!config) {
    const base = XP_REWARDS_FALLBACK[normalizedDifficulty] || 100;
    return Math.round(base * gradeMultiplier);
  }
  const baseXp = (typeof config.baseXP === "number")
    ? config.baseXP
    : DEFAULT_BASE_XP[config.levelType];
  if (!baseXp) {
    const base = XP_REWARDS_FALLBACK[normalizedDifficulty] || 100;
    return Math.round(base * gradeMultiplier);
  }
  const tierMult = TIER_MULTIPLIERS[config.levelType] || 1.0;
  let diffMult = 1.0;
  if (config.levelType !== LEVEL_TYPES.FOTEMA) {
    const diffKey = normalizedDifficulty || "normal";
    diffMult = DIFFICULTY_MULTIPLIERS[diffKey] || 1.0;
  }
  return Math.round(baseXp * config.topicWeight * tierMult * gradeMultiplier * diffMult);
}

// Grant XP for a completed test result based on best grade delta
function grantXpForResult(progress, result) {
  if (!progress || !progress.results || !result) return 0;
  const update = applyTestResultToResults(progress.results, result);
  if (!update) return 0;
  const gradeValue = typeof result.grade === 'number' ? result.grade : null;
  if (gradeValue === null || gradeValue < 2) return 0;
  if (update.previousBestGrade !== null && gradeValue <= update.previousBestGrade) {
    return 0;
  }
  const xpGain = Math.max(0, (update.newBestXp || 0) - (update.previousBestXp || 0));
  if (xpGain > 0) {
    progress.totalXp = clampTotalXp(Number(progress.totalXp || 0) + xpGain);
  }
  return xpGain;
}

// Calculate the current level and XP needed to reach the next level
function calculateLevelStats(totalXp = 0) {
  const xpTotal = clampTotalXp(totalXp);
  let current = LEVEL_TABLE[0];
  for (let i = 0; i < LEVEL_TABLE.length; i += 1) {
    const entry = LEVEL_TABLE[i];
    if (xpTotal < entry.xpEnd || i === LEVEL_TABLE.length - 1) {
      current = entry;
      break;
    }
  }
  const levelName = LEVEL_NAMES[current.level - 1] || `Szint ${current.level}`;
  const xpIntoLevel = xpTotal - current.xpStart;
  const xpForNext = current.xpToNext;
  const xpToNext = Math.max(0, current.xpEnd - xpTotal);
  return {
    level: current.level,
    levelName,
    xpIntoLevel,
    xpForNext,
    xpToNext,
  };
}

function buildCompletionSummary(progress) {
  const completions = {};
  if (!progress || !progress.results) return completions;

  const addCompletion = (topicId, key, entry) => {
    if (!entry || typeof entry.bestGrade !== 'number') return;
    if (!completions[topicId]) completions[topicId] = {};
    completions[topicId][key] = {
      grade: entry.bestGrade,
      timestamp: entry.bestTimestamp || null,
      xp: entry.bestXp || 0,
    };
  };

  const addDifficultyEntries = (bucket) => {
    Object.entries(bucket || {}).forEach(([topicId, topicEntry]) => {
      const difficulties = topicEntry && topicEntry.difficulties ? topicEntry.difficulties : {};
      Object.entries(difficulties).forEach(([difficultyKey, diffEntry]) => {
        addCompletion(topicId, difficultyKey, diffEntry);
      });
    });
  };

  addDifficultyEntries(progress.results.topics);
  addDifficultyEntries(progress.results.subtopics);
  Object.entries(progress.results.mainTopics || {}).forEach(([topicId, entry]) => {
    addCompletion(topicId, 'osszesito', entry);
  });

  return completions;
}

function buildPracticeXpSummary(progress) {
  const practiceXp = {};
  const stats = progress && progress.practice && progress.practice.statsByTopic
    ? progress.practice.statsByTopic
    : {};
  Object.entries(stats || {}).forEach(([topicId, entry]) => {
    const xpEarned = Number(entry && entry.xpEarned ? entry.xpEarned : 0);
    if (!Number.isFinite(xpEarned) || xpEarned <= 0) return;
    practiceXp[topicId] = xpEarned;
  });
  return practiceXp;
}

function mergeQuestState(existing, incoming) {
  const base = coerceQuestState(existing).state;
  const next = coerceQuestState(incoming).state;
  const mergedVersion = Math.max(base.version || QUEST_VERSION, next.version || QUEST_VERSION);
  return {
    version: mergedVersion,
    mainTopics: { ...base.mainTopics, ...next.mainTopics },
    subtopics: { ...base.subtopics, ...next.subtopics },
    topics: { ...base.topics, ...next.topics },
  };
}

function mergeBuffState(existing, incoming) {
  const base = normalizeBuffState(existing).buffs;
  if (!incoming || typeof incoming !== 'object') return base;
  const hasUnlocked = Object.prototype.hasOwnProperty.call(incoming, 'unlocked');
  const hasActive = Object.prototype.hasOwnProperty.call(incoming, 'active');
  if (!hasUnlocked && !hasActive) return base;
  const normalizedIncoming = normalizeBuffState(incoming).buffs;
  const merged = createEmptyBuffState();
  merged.unlocked = hasUnlocked
    ? { ...base.unlocked, ...normalizedIncoming.unlocked }
    : base.unlocked;
  merged.active = hasActive ? normalizedIncoming.active : base.active;
  merged.active.forEach((entry) => {
    if (entry && entry.id && !merged.unlocked[entry.id]) {
      merged.unlocked[entry.id] = { isUnlocked: true };
    }
  });
  return merged;
}

function inferDifficultyFromXp(xpValue) {
  const xp = Number(xpValue);
  if (!Number.isFinite(xp)) return null;
  if (xp >= 3) return 'nehez';
  if (xp >= 2) return 'normal';
  if (xp >= 1) return 'konnyu';
  return null;
}

function recordPracticeXp(progress, payload) {
  if (!progress || !payload) return;
  const topicId = normalizeTopicId(payload.topicId);
  const amount = Number(payload.xp);
  if (!topicId || !Number.isFinite(amount) || amount <= 0) return;
  if (!progress.practice || typeof progress.practice !== 'object') {
    progress.practice = { statsByTopic: {} };
  }
  if (!progress.practice.statsByTopic || typeof progress.practice.statsByTopic !== 'object') {
    progress.practice.statsByTopic = {};
  }
  if (!progress.practice.statsByTopic[topicId]) {
    progress.practice.statsByTopic[topicId] = createPracticeEntry();
  }
  const entry = progress.practice.statsByTopic[topicId];
  entry.xpEarned += amount;
  entry.correctCount += 1;
  entry.totalCount += 1;
  entry.lastPracticedAt = new Date().toISOString();

  const difficultyKey = inferDifficultyFromXp(amount);
  if (difficultyKey && entry.difficulties && entry.difficulties[difficultyKey]) {
    entry.difficulties[difficultyKey].correctCount += 1;
    entry.difficulties[difficultyKey].totalCount += 1;
  }

  progress.totalXp = clampTotalXp(Number(progress.totalXp || 0) + amount);
}

// Create the main application window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    autoHideMenuBar: prodUI,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !prodUI,
    },
  });
  if (prodUI && process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    mainWindow.removeMenu();
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(true);
  }
  mainWindow.loadFile('index.html');
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!prodUI || input.type !== 'keyDown') return;
    const key = input.key ? input.key.toLowerCase() : '';
    const isReload = input.key === 'F5' || (input.control && key === 'r');
    const isDevTools = input.control && input.shift && key === 'i';
    if (isReload || isDevTools) {
      event.preventDefault();
    }
  });
  mainWindow.webContents.on('did-finish-load', () => {
    if (lastUpdateStatus) {
      mainWindow.webContents.send('update-status', lastUpdateStatus);
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// App ready handler
app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:",
        ],
      },
    });
  });
  createWindow();
  setupAutoUpdates();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: save test result and award XP accordingly
ipcMain.on('save-test-result', (event, result) => {
  const { progress } = normalizeProgress(readProgress());
  if (!Array.isArray(progress.tests)) progress.tests = [];
  const normalizedResult = normalizeResultTopicId(result);
  progress.tests.unshift(normalizedResult);
  grantXpForResult(progress, normalizedResult);
  updateAchievements(progress);
  updateBuffs(progress);
  saveProgress(progress);
});

// IPC: return all test results
ipcMain.handle('get-all-results', async () => {
  const { progress, migrated } = normalizeProgress(readProgress());
  if (migrated) saveProgress(progress);
  return progress.tests || [];
});

// IPC: return a summary of progress, completions and level stats
ipcMain.handle('get-progress-summary', async () => {
  const { progress, migrated } = normalizeProgress(readProgress());
  const achievementsUpdated = updateAchievements(progress);
  const buffsUpdated = updateBuffs(progress);
  if (migrated || achievementsUpdated || buffsUpdated.unlockedChanged) saveProgress(progress);
  return {
    xp: progress.totalXp,
    completions: buildCompletionSummary(progress),
    practiceXp: buildPracticeXpSummary(progress),
    quests: progress.quests,
    level: calculateLevelStats(progress.totalXp),
    results: progress.results,
    practice: progress.practice,
    buffs: progress.buffs,
    buffCatalog: BUFF_CATALOG,
    achievements: progress.achievements,
    achievementCatalog: ACHIEVEMENT_CATALOG,
  };
});

// IPC: return saved settings
ipcMain.handle('get-settings', async () => {
  try {
    if (fs.existsSync(settingsFilePath)) {
      return JSON.parse(fs.readFileSync(settingsFilePath));
    }
  } catch (error) {
    console.error('Hiba a settings.json olvasása közben:', error);
  }
  return {};
});

// IPC: save settings
ipcMain.on('save-settings', (event, settings) => {
  saveSettings(settings);
});

// IPC: save XP earned from practice sessions
ipcMain.handle('save-practice-xp', async (event, { topicId, xp }) => {
  try {
    const { progress } = normalizeProgress(readProgress());
    recordPracticeXp(progress, { topicId, xp });
    updateAchievements(progress);
    updateBuffs(progress);
    saveProgress(progress);
    return { ok: true };
  } catch (error) {
    console.error('Hiba a practice XP mentese kozben:', error);
    return { ok: false };
  }
});

// IPC: save quest state
ipcMain.on('save-quest-state', (event, questState) => {
  try {
    const { progress } = normalizeProgress(readProgress());
    progress.quests = mergeQuestState(progress.quests, questState);
    updateBuffs(progress);
    saveProgress(progress);
  } catch (error) {
    console.error('Hiba a quest allapot mentese kozben:', error);
  }
});

// IPC: save buff state
ipcMain.on('save-buff-state', (event, buffState) => {
  try {
    const { progress } = normalizeProgress(readProgress());
    progress.buffs = mergeBuffState(progress.buffs, buffState);
    saveProgress(progress);
  } catch (error) {
    console.error('Hiba a buff allapot mentese kozben:', error);
  }
});
