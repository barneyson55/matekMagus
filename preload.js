// preload.js
// This file bridges the main and renderer processes in Electron.
// It exposes an API to the renderer context so that UI scripts can
// communicate with the main process without exposing Node.js APIs.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Persist the result of a completed test to the main process
  saveTestResult: (result) => ipcRenderer.send('save-test-result', result),
  // Retrieve all past test results
  getAllResults: () => ipcRenderer.invoke('get-all-results'),
  // Get a summary of XP and level progress
  getProgressSummary: () => ipcRenderer.invoke('get-progress-summary'),
  // Save user settings (e.g. theme colors)
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
  // Retrieve user settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  // Persist XP earned from practice sessions. Accepts an object with
  // topicId and xp amount and forwards it to the main process.
  savePracticeXp: ({ topicId, xp }) => ipcRenderer.invoke('save-practice-xp', { topicId, xp }),
  // Save quest state to the main process.
  saveQuestState: (questState) => ipcRenderer.send('save-quest-state', questState),
  // Save buff state to the main process.
  saveBuffState: (buffState) => ipcRenderer.send('save-buff-state', buffState),
  // Subscribe to auto-update status events from the main process.
  onUpdateStatus: (handler) => {
    if (typeof handler !== 'function') return () => {};
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on('update-status', wrapped);
    return () => ipcRenderer.removeListener('update-status', wrapped);
  },
});
