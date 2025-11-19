// main.js
const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const progressFilePath = path.join(app.getPath('userData'), 'progress.json');
const XP_REWARDS = { konnyu: 120, kozepes: 200, nehez: 320 };
const DIFFICULTY_LABELS = { konnyu: 'könnyű', kozepes: 'közepes', nehez: 'nehéz' };
const TOPIC_BONUSES = [
  { match: /modulzaro/i, bonus: 150, label: 'Modulzáró' },
  { match: /temazaro/i, bonus: 220, label: 'Témazáró' },
  { match: /emelt_/i, bonus: 250, label: 'Emelt modul' }
];

function readProgress() {
  try {
    if (fs.existsSync(progressFilePath)) {
      return JSON.parse(fs.readFileSync(progressFilePath));
    }
  } catch (error) { console.error('Hiba a progress.json olvasása közben:', error); }
  return {};
}

function saveProgress(data) {
  try {
    fs.writeFileSync(progressFilePath, JSON.stringify(data, null, 2));
  } catch (error) { console.error('Hiba a progress.json írása közben:', error); }
}

function ensureProgressShape(progress) {
  if (!progress.tests) progress.tests = [];
  if (typeof progress.xp !== 'number') progress.xp = 0;
  if (!progress.completions) progress.completions = {};
  return progress;
}

function normalizeDifficulty(label = '') {
  const base = label.toString().toLowerCase()
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

function calculateXpReward(topicId, normalizedDifficulty) {
  const base = XP_REWARDS[normalizedDifficulty] || 100;
  let bonus = 0;
  TOPIC_BONUSES.forEach(rule => {
    if (rule.match.test(topicId || '')) {
      bonus = Math.max(bonus, rule.bonus);
    }
  });
  return base + bonus;
}

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
    xp: xpGain
  };
  return xpGain;
}

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
    xpToNext: xpForNext - xpIntoLevel
  };
}

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
      webSecurity: false
    }
  });
  mainWindow.loadFile('index.html');
};

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [ "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net" ]
      }
    });
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.on('save-test-result', (event, result) => {
  const progress = ensureProgressShape(readProgress());
  progress.tests.unshift(result);
  grantXpForResult(progress, result);
  saveProgress(progress);
});

ipcMain.handle('get-all-results', async () => {
  const progress = ensureProgressShape(readProgress());
  return progress.tests || [];
});

ipcMain.handle('get-progress-summary', async () => {
  const progress = ensureProgressShape(readProgress());
  return {
    xp: progress.xp,
    completions: progress.completions,
    level: calculateLevelStats(progress.xp)
  };
});
