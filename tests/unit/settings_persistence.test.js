const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { loadMainContext, createFsStub } = require('./helpers/main_context');
const { DEFAULT_SETTINGS, CUSTOM_SETTINGS } = require('./fixtures/settings_fixtures');
const { repoRoot } = require('../helpers/paths');

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createClassList() {
  const entries = new Set();
  return {
    add(...names) {
      names.forEach((name) => entries.add(name));
    },
    remove(...names) {
      names.forEach((name) => entries.delete(name));
    },
    toggle(name, force) {
      if (typeof force === 'boolean') {
        if (force) {
          entries.add(name);
        } else {
          entries.delete(name);
        }
        return force;
      }
      if (entries.has(name)) {
        entries.delete(name);
        return false;
      }
      entries.add(name);
      return true;
    },
    contains(name) {
      return entries.has(name);
    },
  };
}

function createStyleStub() {
  return {
    setProperty(name, value) {
      this[name] = value;
    },
    removeProperty(name) {
      delete this[name];
    },
  };
}

function createElementStub(tagName = 'div') {
  const listeners = new Map();
  const attributes = new Map();
  return {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    dataset: {},
    style: createStyleStub(),
    classList: createClassList(),
    children: [],
    textContent: '',
    innerHTML: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    appendChild(child) {
      this.children.push(child);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      if (!listeners.has(type)) return;
      listeners.set(
        type,
        listeners.get(type).filter((entry) => entry !== handler),
      );
    },
    focus() {
      this._focused = true;
    },
    _listeners: listeners,
  };
}

function createIframeDocumentStub() {
  const documentElement = createElementStub('html');
  const body = createElementStub('body');
  const head = createElementStub('head');
  const elements = new Map();
  return {
    documentElement,
    body,
    head,
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElement(tagName) {
      return createElementStub(tagName);
    },
  };
}

function createIframeStub() {
  const iframe = createElementStub('iframe');
  const contentDocument = createIframeDocumentStub();
  const contentWindow = {
    document: contentDocument,
    Math: { random: Math.random },
    postMessage() {},
  };
  iframe.contentDocument = contentDocument;
  iframe.contentWindow = contentWindow;
  iframe.src = '';
  return iframe;
}

function createDocumentStub() {
  const elements = new Map();
  const selectors = new Map();
  const documentElement = createElementStub('html');
  const body = createElementStub('body');
  const head = createElementStub('head');
  const listeners = new Map();

  return {
    elements,
    documentElement,
    body,
    head,
    activeElement: body,
    querySelector(selector) {
      if (!selectors.has(selector)) {
        selectors.set(selector, createElementStub());
      }
      return selectors.get(selector);
    },
    querySelectorAll() {
      return [];
    },
    getElementById(id) {
      if (!elements.has(id)) {
        const element = id === 'content-frame' ? createIframeStub() : createElementStub();
        element.id = id;
        elements.set(id, element);
      }
      return elements.get(id);
    },
    createElement(tagName) {
      return createElementStub(tagName);
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(handler);
    },
    _listeners: listeners,
  };
}

function createStorageStub(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

function loadIndexContext(options = {}) {
  const filePath = path.join(repoRoot, 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('index.html script block not found');
  const script = match[1];
  const document = createDocumentStub();
  const localStorage = createStorageStub();
  const electronAPI = {
    getProgressSummary: async () => null,
    getSettings: async () => null,
    saveSettings: async () => {},
    ...(options.electronAPI || {}),
  };
  const window = {
    document,
    parent: { postMessage() {} },
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      };
    },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    electronAPI,
  };
  const context = {
    console,
    document,
    window,
    localStorage,
    Intl,
    Date,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };
  vm.runInNewContext(script, context, { filename: filePath });
  return { context, document, window: context.window };
}

function getContextValue(context, expression) {
  return vm.runInNewContext(expression, context);
}

test('saveSettings writes settings payload to disk', () => {
  const fsStub = createFsStub();
  const { context } = loadMainContext({ fsStub });
  context.saveSettings(CUSTOM_SETTINGS);
  assert.equal(fsStub.writes.length, 1);
  const write = fsStub.writes[0];
  const expectedPath = path.join('/tmp/matek-magus-test', 'settings.json');
  assert.equal(write.path, expectedPath);
  const saved = JSON.parse(write.data);
  assert.deepEqual(saved, CUSTOM_SETTINGS);
});

test('get-settings handler returns stored settings when present', async () => {
  const fsStub = createFsStub();
  const { context, electron } = loadMainContext({ fsStub });
  context.saveSettings(CUSTOM_SETTINGS);
  const handler = electron.ipcMain._handlers.get('get-settings');
  assert.equal(typeof handler, 'function');
  const payload = await handler();
  assert.deepEqual(toPlain(payload), CUSTOM_SETTINGS);
});

test('get-settings handler returns empty object when no settings exist', async () => {
  const fsStub = createFsStub();
  const { electron } = loadMainContext({ fsStub });
  const handler = electron.ipcMain._handlers.get('get-settings');
  assert.equal(typeof handler, 'function');
  const payload = await handler();
  assert.deepEqual(toPlain(payload), {});
});

test('getDefaultSettings returns default settings baseline', () => {
  const { context } = loadIndexContext();
  const defaults = context.getDefaultSettings();
  assert.deepEqual(toPlain(defaults), DEFAULT_SETTINGS);
});

test('settings cancel restores active settings and skips persistence', () => {
  const saveCalls = [];
  const { context, document } = loadIndexContext({
    electronAPI: {
      saveSettings: async (settings) => saveCalls.push(settings),
    },
  });
  context.setActiveSettings(DEFAULT_SETTINGS);
  context.updateSettingsDraft({ sidebarBg: '#000000', fontScale: 120, reduceMotion: true });
  const draftBefore = getContextValue(context, 'draftSettings');
  assert.equal(draftBefore.sidebarBg, '#000000');
  const cancelButton = document.elements.get('settings-cancel');
  const cancelHandlers = cancelButton._listeners.get('click') || [];
  assert.ok(cancelHandlers.length > 0);
  cancelHandlers.forEach((handler) => handler());
  const activeAfter = getContextValue(context, 'activeSettings');
  const draftAfter = getContextValue(context, 'draftSettings');
  assert.deepEqual(toPlain(activeAfter), DEFAULT_SETTINGS);
  assert.deepEqual(toPlain(draftAfter), toPlain(activeAfter));
  assert.equal(saveCalls.length, 0);
});

test('settings save persists normalized draft settings', async () => {
  const saveCalls = [];
  const { context, document } = loadIndexContext({
    electronAPI: {
      saveSettings: async (settings) => saveCalls.push(settings),
    },
  });
  context.setActiveSettings(DEFAULT_SETTINGS);
  context.updateSettingsDraft({
    sidebarBg: '#000000',
    fontScale: 115,
    reduceMotion: true,
    contrastMode: 'high',
    hintMode: 'always',
  });
  const saveButton = document.elements.get('settings-save');
  const saveHandlers = saveButton._listeners.get('click') || [];
  assert.ok(saveHandlers.length > 0);
  await saveHandlers[0]();
  const activeAfter = getContextValue(context, 'activeSettings');
  assert.equal(activeAfter.sidebarBg, '#000000');
  assert.equal(activeAfter.fontScale, 115);
  assert.equal(activeAfter.reduceMotion, true);
  assert.equal(activeAfter.contrastMode, 'high');
  assert.equal(activeAfter.hintMode, 'always');
  assert.equal(saveCalls.length, 1);
  assert.deepEqual(toPlain(saveCalls[0]), toPlain(activeAfter));
});
