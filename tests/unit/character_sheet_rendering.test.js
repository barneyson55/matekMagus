const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { SUMMARY_FIXTURE, RESULTS_FIXTURE } = require('./fixtures/character_sheet_fixtures');
const { repoRoot } = require('../helpers/paths');

function createElementStub(tagName = 'div') {
  return {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    dataset: {},
    style: {
      setProperty() {},
    },
    children: [],
    textContent: '',
    innerHTML: '',
    value: '',
    type: '',
    disabled: false,
    appendChild(child) {
      this.children.push(child);
    },
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
  };
}

function createDocumentStub() {
  const elements = new Map();
  const tabButtons = [createElementStub('button'), createElementStub('button')];
  tabButtons[0].dataset.tab = 'active';
  tabButtons[1].dataset.tab = 'results';
  const documentElement = createElementStub('html');
  const body = createElementStub('body');

  return {
    elements,
    documentElement,
    body,
    querySelector(selector) {
      if (selector === '.tab-button.is-active') return tabButtons[0];
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.tab-button') return tabButtons;
      return [];
    },
    getElementById(id) {
      if (!elements.has(id)) {
        const el = createElementStub();
        el.id = id;
        elements.set(id, el);
      }
      return elements.get(id);
    },
    createElement(tagName) {
      return createElementStub(tagName);
    },
    addEventListener() {},
  };
}

function loadCharacterSheetContext() {
  const htmlPath = path.join(repoRoot, 'modules', 'character_sheet.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const srcMatch = html.match(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/i);
  const inlineMatch = html.match(/<script>([\s\S]*?)<\/script>/);

  let filePath = htmlPath;
  let script = '';

  if (srcMatch) {
    filePath = path.join(path.dirname(htmlPath), srcMatch[1]);
    script = fs.readFileSync(filePath, 'utf8');
  } else if (inlineMatch) {
    script = inlineMatch[1];
  } else {
    throw new Error('Character sheet script block not found');
  }
  const document = createDocumentStub();
  const window = {
    parent: {
      postMessage() {},
      document: { querySelector() { return null; } },
    },
    addEventListener() {},
  };
  const context = {
    console,
    document,
    window,
    Node: { TEXT_NODE: 3 },
    Intl,
    Date,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(script, context, { filename: filePath });
  return { context, document };
}

function setContextVar(context, name, value) {
  context.__temp = value;
  vm.runInNewContext(`${name} = __temp`, context);
  delete context.__temp;
}

test('renderProfile populates level and XP fields', () => {
  const { context, document } = loadCharacterSheetContext();
  setContextVar(context, 'summaryData', SUMMARY_FIXTURE);
  context.renderProfile();
  const levelEl = document.elements.get('profile-level');
  const xpEl = document.elements.get('profile-xp');
  const nextEl = document.elements.get('profile-next');
  assert.ok(levelEl.textContent.includes('Lv.'), 'TODO: assert exact level label formatting');
  assert.ok(xpEl.textContent.includes('XP'), 'TODO: assert XP total formatting');
  assert.ok(nextEl.textContent.includes('Következő szint'), 'TODO: assert next-level label');
});

test('renderAchievements builds achievement list entries', () => {
  const { context, document } = loadCharacterSheetContext();
  setContextVar(context, 'summaryData', SUMMARY_FIXTURE);
  context.renderAchievements();
  const list = document.elements.get('achievement-list');
  assert.ok(list.children.length > 0, 'TODO: assert achievement card content');
});

test('renderAll populates quest lists and result panels', () => {
  const { context, document } = loadCharacterSheetContext();
  setContextVar(context, 'summaryData', SUMMARY_FIXTURE);
  setContextVar(context, 'resultsData', RESULTS_FIXTURE);
  context.renderAll();
  const activeList = document.elements.get('active-quest-list');
  const completedList = document.elements.get('completed-quest-list');
  const resultsList = document.elements.get('recent-results-list');
  assert.ok(activeList.children.length >= 1, 'TODO: assert active quest rendering');
  assert.ok(completedList.children.length >= 1, 'TODO: assert completed quest rendering');
  assert.ok(resultsList.children.length >= 1, 'TODO: assert recent results rendering');
});
