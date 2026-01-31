const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { repoRoot } = require('../helpers/paths');

function createElementStub() {
  return {
    value: '',
    textContent: '',
    innerHTML: '',
    checked: false,
    disabled: false,
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    },
    style: {},
    dataset: {},
    appendChild() {},
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    focus() {},
  };
}

function createDocumentStub() {
  const elements = new Map();
  return {
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return createElementStub();
    },
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, createElementStub());
      }
      return elements.get(id);
    },
    createElement() {
      return createElementStub();
    },
    addEventListener() {},
  };
}

function loadModule(relativePath) {
  const modulePath = path.join(repoRoot, relativePath);
  const code = fs.readFileSync(modulePath, 'utf8');
  const document = createDocumentStub();
  const window = {
    parent: { postMessage() {} },
    addEventListener() {},
    removeEventListener() {},
  };
  const context = {
    console,
    document,
    window,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(code, context, { filename: modulePath });
  return context;
}

const haromszogCtx = loadModule('modules/haromszogek_temazaro.js');
const szinuszCtx = loadModule('modules/szinusz_koszinusz_tetel.js');
const racionalisCtx = loadModule('modules/racionalis_szamok_temazaro.js');
const hatvanyCtx = loadModule('modules/hatvany_temazaro.js');
const polinomokCtx = loadModule('modules/polinomok.js');

const DIFF_EASY = 'könnyű';
const DIFF_NORMAL = 'normál';
const DIFF_HARD = 'nehéz';

const TERMINATING_DENOMS = {
  [DIFF_EASY]: [2, 4, 5, 10],
  [DIFF_NORMAL]: [2, 4, 5, 8, 10, 20, 25],
  [DIFF_HARD]: [2, 4, 5, 8, 10, 20, 25, 40],
};

const within = (value, min, max) => value >= min && value <= max;

function assertSameMembers(actual, expected) {
  assert.equal(actual.length, expected.length);
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  assert.deepEqual(sortedActual, sortedExpected);
}

test('randomInt returns inclusive values and respects min/max equality', () => {
  const { randomInt } = haromszogCtx;
  assert.equal(randomInt(5, 5), 5);
  for (let i = 0; i < 200; i += 1) {
    const value = randomInt(-3, 3);
    assert.ok(within(value, -3, 3));
  }
});

test('shuffle preserves members without mutating input', () => {
  const { shuffle } = haromszogCtx;
  const source = [1, 2, 3, 4, 5];
  const result = shuffle(source);
  assertSameMembers(result, source);
  assert.deepEqual(source, [1, 2, 3, 4, 5]);
});

test('pickNonZero never returns zero', () => {
  const { pickNonZero } = polinomokCtx;
  for (let i = 0; i < 200; i += 1) {
    const value = pickNonZero(-5, 5);
    assert.notEqual(value, 0);
    assert.ok(within(value, -5, 5));
  }
});

test('parseNumberInput normalizes comma and fraction input', () => {
  const { parseNumberInput } = haromszogCtx;
  const fraction = parseNumberInput(' 3/4 ');
  assert.ok(fraction && typeof fraction.value === 'number');
  assert.equal(fraction.value, 0.75);
  const decimal = parseNumberInput(' 2,5 ');
  assert.ok(decimal && typeof decimal.value === 'number');
  assert.equal(decimal.value, 2.5);
});

test('formatNumber trims trailing zeros and rounds', () => {
  const { formatNumber } = haromszogCtx;
  assert.equal(formatNumber(4), '4');
  assert.equal(formatNumber(3.14159, 2), '3.14');
});

test('generateTriangleSides respects bounds and triangle inequality', () => {
  const { generateTriangleSides } = haromszogCtx;
  for (let i = 0; i < 100; i += 1) {
    const { a, b, c } = generateTriangleSides(3, 8);
    assert.ok(within(a, 3, 8));
    assert.ok(within(b, 3, 8));
    assert.ok(within(c, 3, 8));
    assert.ok(a + b > c && a + c > b && b + c > a);
  }
});

test('generateAngles returns a valid triangle angle set', () => {
  const { generateAngles } = szinuszCtx;
  for (let i = 0; i < 100; i += 1) {
    const { a, b, c } = generateAngles();
    assert.ok(within(a, 25, 70));
    assert.ok(within(b, 30, 85));
    assert.ok(c > 0 && c < 180);
    assert.equal(a + b + c, 180);
  }
});

test('simplifyFraction reduces and normalizes sign', () => {
  const { simplifyFraction } = racionalisCtx;
  const first = simplifyFraction(2, 4);
  assert.equal(first.n, 1);
  assert.equal(first.d, 2);
  const second = simplifyFraction(2, -4);
  assert.equal(second.n, -1);
  assert.equal(second.d, 2);
});

test('pickFraction returns terminating denominators when requested', () => {
  const { pickFraction } = racionalisCtx;
  [DIFF_EASY, DIFF_NORMAL, DIFF_HARD].forEach((difficulty) => {
    const allowed = TERMINATING_DENOMS[difficulty];
    for (let i = 0; i < 40; i += 1) {
      const fraction = pickFraction(difficulty, true);
      assert.ok(allowed.includes(fraction.d));
      assert.ok(fraction.n > 0 && fraction.n < fraction.d);
    }
  });
});

test('pickBase and pickExponent respect difficulty ranges', () => {
  const { pickBase, pickExponent } = hatvanyCtx;
  for (let i = 0; i < 80; i += 1) {
    assert.ok(within(pickBase(DIFF_EASY), 2, 6));
    assert.ok(within(pickExponent(DIFF_EASY), 2, 3));
    assert.ok(within(pickBase(DIFF_NORMAL), 2, 8));
    assert.ok(within(pickExponent(DIFF_NORMAL), 2, 4));
    assert.ok(within(pickBase(DIFF_HARD), 2, 10));
    assert.ok(within(pickExponent(DIFF_HARD), 2, 5));
  }
});

test('pickRandomDifficulty selects from the provided list', () => {
  const { pickRandomDifficulty } = hatvanyCtx;
  const options = [DIFF_EASY, DIFF_NORMAL, DIFF_HARD];
  for (let i = 0; i < 50; i += 1) {
    const pick = pickRandomDifficulty(options);
    assert.ok(options.includes(pick));
  }
});
