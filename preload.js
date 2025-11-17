// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveTestResult: (result) => ipcRenderer.send('save-test-result', result),
  getAllResults: () => ipcRenderer.invoke('get-all-results'),
});