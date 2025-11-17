// main.js
const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const progressFilePath = path.join(app.getPath('userData'), 'progress.json');

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
  const progress = readProgress();
  if (!progress.tests) { progress.tests = []; }
  progress.tests.unshift(result);
  saveProgress(progress);
});

ipcMain.handle('get-all-results', async (event) => {
  const progress = readProgress();
  return progress.tests || [];
});