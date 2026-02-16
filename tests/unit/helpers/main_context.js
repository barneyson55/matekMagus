const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { appEntry } = require('../../helpers/paths');

function createFsStub(initialFiles = {}) {
  const store = new Map(Object.entries(initialFiles));
  const writes = [];
  const renameCalls = [];
  const unlinkCalls = [];
  return {
    writes,
    renameCalls,
    unlinkCalls,
    store,
    existsSync(filePath) {
      return store.has(filePath);
    },
    readFileSync(filePath) {
      if (!store.has(filePath)) {
        const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
        error.code = 'ENOENT';
        throw error;
      }
      return store.get(filePath);
    },
    writeFileSync(filePath, data) {
      const payload = typeof data === 'string' ? data : data.toString();
      store.set(filePath, payload);
      writes.push({ path: filePath, data: payload });
    },
    renameSync(fromPath, toPath) {
      if (!store.has(fromPath)) {
        const error = new Error(`ENOENT: no such file or directory, rename '${fromPath}' -> '${toPath}'`);
        error.code = 'ENOENT';
        throw error;
      }
      const payload = store.get(fromPath);
      store.delete(fromPath);
      store.set(toPath, payload);
      renameCalls.push({ from: fromPath, to: toPath });
    },
    unlinkSync(filePath) {
      if (!store.has(filePath)) {
        const error = new Error(`ENOENT: no such file or directory, unlink '${filePath}'`);
        error.code = 'ENOENT';
        throw error;
      }
      store.delete(filePath);
      unlinkCalls.push({ path: filePath });
    },
  };
}

function createElectronStub() {
  const listeners = new Map();
  const handlers = new Map();
  const app = {
    setPath() {},
    getPath() {
      return '/tmp/matek-magus-test';
    },
    whenReady() {
      return { then() {} };
    },
    on() {},
    quit() {},
  };

  class BrowserWindow {
    constructor() {}
    loadFile() {}
    static getAllWindows() {
      return [];
    }
  }

  const session = {
    defaultSession: {
      webRequest: {
        onHeadersReceived() {},
      },
    },
  };

  const ipcMain = {
    on(channel, handler) {
      listeners.set(channel, handler);
    },
    handle(channel, handler) {
      handlers.set(channel, handler);
    },
    _listeners: listeners,
    _handlers: handlers,
  };

  return { app, BrowserWindow, session, ipcMain };
}

function loadMainContext(options = {}) {
  const { fsStub, electronStub } = options;
  const mainPath = appEntry;
  const code = fs.readFileSync(mainPath, 'utf8');
  const electron = electronStub || createElectronStub();
  const requireFromMain = createRequire(mainPath);

  const sandbox = {
    console,
    process,
    Buffer,
    __dirname: path.dirname(mainPath),
    __filename: mainPath,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    require: (id) => {
      if (id === 'electron') return electron;
      if (id === 'fs') return fsStub || requireFromMain('fs');
      return requireFromMain(id);
    },
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(code, context, { filename: mainPath });
  return { context, electron, fsStub };
}

module.exports = {
  createFsStub,
  createElectronStub,
  loadMainContext,
};
