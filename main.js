// main.js
// The main process for the Electron application. It manages windows, persists
// progress and settings, calculates XP and level stats, and responds to IPC
// messages from the renderer process. This version includes support for
// saving XP earned from practice sessions.

const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Paths for storing progress and settings in the user's data directory
const progressFilePath = path.join(app.getPath('userData'), 'progress.json');
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

// XP rewards for test completions by difficulty
const XP_REWARDS = { konnyu: 120, kozepes: 200, nehez: 320 };
// Labels for human‑readable difficulty names
const DIFFICULTY_LABELS = { konnyu: 'könnyű', kozepes: 'közepes', nehez: 'nehéz' };
// Bonus XP for certain types of topics
const TOPIC_BONUSES = [
  { match: /modulzaro/i, bonus: 150, label: 'Modulzáró' },
  { match: /temazaro/i, bonus: 220, label: 'Témazáró' },
  { match: /emelt_/i, bonus: 250, label: 'Emelt modul' }
];

// Read the progress.json file if it exists, otherwise return an empty object
function readProgress() {
  try {
    if (fs.existsSync(progressFilePath)) {
      return JSON.parse(fs.readFileSync(progressFilePath));
    }
  } catch (error) {
    console.error('Hiba a progress.json olvasása közben:', error);
  }
  return {};
}

// Save the progress object back to disk
function saveProgress(data) {
  try {
    fs.writeFileSync(progressFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Hiba a progress.json írása közben:', error);
  }
}

// Save settings to disk
function saveSettings(data) {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Hiba a settings.json írása közben:', error);
  }
}

// Ensure the progress object has the expected shape
function ensureProgressShape(progress) {
  if (!progress.tests) progress.tests = [];
  if (typeof progress.xp !== 'number') progress.xp = 0;
  if (!progress.completions) progress.completions = {};
  // Track practice XP separately per topic
  if (!progress.practiceXp) progress.practiceXp = {};
  return progress;
}

// Normalize accented Hungarian difficulty names to keys used in XP_REWARDS
function normalizeDifficulty(label = '') {
  const base = label
    .toString()
    .toLowerCase()
    .replace(/ő|ö/g, 'o')
    .replace(/ű|ü/g, 'u')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o');
  if (base.includes('konny')) return 'konnyu';
  if (base.includes('kozep')) return 'kozepes';
  if (base.includes('nehez')) return 'nehez';
  return null;
}

// Calculate base XP plus any bonus depending on topic type
function calculateXpReward(topicId, normalizedDifficulty) {
  const base = XP_REWARDS[normalizedDifficulty] || 100;
  let bonus = 0;
  TOPIC_BONUSES.forEach((rule) => {
    if (rule.match.test(topicId || '')) {
      bonus = Math.max(bonus, rule.bonus);
    }
  });
  return base + bonus;
}

// Grant XP for a completed test result if it hasn't been awarded already
function grantXpForResult(progress, result) {
  const normalizedDifficulty = normalizeDifficulty(result.difficulty);
  const difficultyLabel = normalizedDifficulty ? DIFFICULTY_LABELS[normalizedDifficulty] : result.difficulty;
  if (!normalizedDifficulty || !difficultyLabel) return 0;
  if (result.grade < 2) return 0; // XP csak legalább elégségesnél
  if (!progress.completions[result.topicId]) {
    progress.completions[result.topicId] = {};
  }
  if (progress.completions[result.topicId][difficultyLabel]) {
    return 0;
  }
  const xpGain = calculateXpReward(result.topicId, normalizedDifficulty);
  progress.xp += xpGain;
  progress.completions[result.topicId][difficultyLabel] = {
    grade: result.grade,
    timestamp: result.timestamp,
    xp: xpGain,
  };
  return xpGain;
}

// Calculate the current level and XP needed to reach the next level
function calculateLevelStats(totalXp = 0) {
  let level = 1;
  let xpForNext = 200;
  let xpIntoLevel = totalXp;
  while (xpIntoLevel >= xpForNext) {
    xpIntoLevel -= xpForNext;
    level += 1;
    xpForNext = 200 + (level - 1) * 80;
  }
  return {
    level,
    xpIntoLevel,
    xpForNext,
    xpToNext: xpForNext - xpIntoLevel,
  };
}

// Create the main application window
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  mainWindow.loadFile('index.html');
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
  const progress = ensureProgressShape(readProgress());
  progress.tests.unshift(result);
  grantXpForResult(progress, result);
  saveProgress(progress);
});

// IPC: return all test results
ipcMain.handle('get-all-results', async () => {
  const progress = ensureProgressShape(readProgress());
  return progress.tests || [];
});

// IPC: return a summary of progress, completions and level stats
ipcMain.handle('get-progress-summary', async () => {
  const progress = ensureProgressShape(readProgress());
  return {
    xp: progress.xp,
    completions: progress.completions,
    practiceXp: progress.practiceXp,
    level: calculateLevelStats(progress.xp),
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
ipcMain.on('save-practice-xp', (event, { topicId, xp }) => {
  try {
    const progress = ensureProgressShape(readProgress());
    // Increase total XP by the amount earned in practice
    progress.xp += xp;
    // Track practice XP per topic for transparency (optional)
    if (!progress.practiceXp) progress.practiceXp = {};
    progress.practiceXp[topicId] = (progress.practiceXp[topicId] || 0) + xp;
    saveProgress(progress);
  } catch (error) {
    console.error('Hiba a practice XP mentése közben:', error);
  }
});