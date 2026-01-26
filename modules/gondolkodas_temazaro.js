const TOPIC_ID = 'gondolkodas_temazaro';
const TOPIC_NAME = 'Gondolkod\u00e1si m\u00f3dszerek, Halmazok';
const DIFF_EASY = 'k\u00f6nny\u0171';
const DIFF_NORMAL = 'norm\u00e1l';
const DIFF_HARD = 'neh\u00e9z';
const TEST_QUESTION_COUNT = 10;
const PRACTICE_XP_REWARDS = {
  [DIFF_EASY]: 1,
  [DIFF_NORMAL]: 2,
  [DIFF_HARD]: 3
};

const TAB_LABELS = {
  elmelet: 'Elm\u00e9let',
  vizualis: 'Vizu\u00e1lis modell',
  teszt: 'Teszt',
  gyakorlas: 'Gyakorl\u00e1s'
};

const TEST_DIFFICULTY_KEY = null;
const TEST_QUESTION_TYPES = null;

const QUESTION_TYPES_BY_DIFFICULTY = {
  [DIFF_EASY]: ["set-union","set-complement","sum"],
  [DIFF_NORMAL]: ["set-intersection","set-union","ratio"],
  [DIFF_HARD]: ["set-intersection","set-complement","ratio"]
};

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const resultPopup = document.getElementById('resultPopup');

const testQuestion = document.getElementById('test-question');
const testAnswerInput = document.getElementById('test-answer');
const paginationDots = document.getElementById('pagination-dots');
const prevTestBtn = document.getElementById('prev-q');
const nextTestBtn = document.getElementById('next-q');
const finishTestBtn = document.getElementById('finish-test-btn');
const testStartBtn = document.getElementById('start-test-btn');
const testArea = document.getElementById('test-area');
const testIntro = document.getElementById('test-intro');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

const practiceStartBtn = document.getElementById('start-practice-btn');
const practiceArea = document.getElementById('practice-area');
const practiceQuestion = document.getElementById('practice-question');
const practiceInput = document.getElementById('practice-input');
const practiceCheck = document.getElementById('check-practice-btn');
const practiceFeedback = document.getElementById('practice-feedback');
const practiceDifficultyInputs = document.querySelectorAll('.practice-difficulty');

const modelAInput = document.getElementById('model-a');
const modelBInput = document.getElementById('model-b');
const modelSum = document.getElementById('model-sum');
const modelDiff = document.getElementById('model-diff');
const modelProd = document.getElementById('model-prod');
const modelAvg = document.getElementById('model-avg');
const modelRatio = document.getElementById('model-ratio');
const modelNote = document.getElementById('model-note');

let activeTab = 'elmelet';
let testQuestions = [];
let currentTestIndex = 0;
let currentTestDifficulty = TEST_DIFFICULTY_KEY || DIFF_EASY;
let currentTestAnswer = '';
let currentTestKind = '';
let correctAnswers = 0;
let isTestRunning = false;

let currentPracticeAnswer = '';
let currentPracticeKind = '';
let currentPracticeExpected = null;
let currentPracticeDifficulty = DIFF_EASY;
let practiceActive = false;
const PRACTICE_HISTORY_LIMIT = 12;
const PRACTICE_RETRY_LIMIT = 24;
const practiceHistory = [];

const PI_VALUE = 3.14;

function announceActiveTab(tabName) {
  const subtitle = TAB_LABELS[tabName] || '';
  if (window.parent) {
    window.parent.postMessage({ type: 'module-sheet', topicId: TOPIC_ID, subtitle }, '*');
  }
}

function setActiveTab(tabName) {
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  tabContents.forEach((section) => {
    section.classList.toggle('active', section.id === tabName);
  });
  activeTab = tabName;
  announceActiveTab(tabName);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeInput(value) {
  return value.trim().replace(/\s+/g, '').replace(',', '.').replace(':', '/');
}

function parseNumberInput(value) {
  const raw = normalizeInput(value);
  if (!raw) return null;
  if (/^-?\d+\/-?\d+$/.test(raw)) {
    const [nRaw, dRaw] = raw.split('/');
    const n = Number(nRaw);
    const d = Number(dRaw);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return { value: n / d };
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? { value: parsed } : null;
}

function formatNumber(value, precision = 2) {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

function simplifyFraction(n, d) {
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}

function formatFraction(n, d) {
  const simplified = simplifyFraction(n, d);
  if (simplified.d === 1) return String(simplified.n);
  return simplified.n + '/' + simplified.d;
}

function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
}

function difficultyTier(difficulty) {
  const normalized = (difficulty || '').toString().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
  if (normalized.includes('konny')) return 'easy';
  if (normalized.includes('nehez')) return 'hard';
  return 'normal';
}

function pickFrom(list) {
  if (!list || !list.length) return null;
  return list[randomInt(0, list.length - 1)];
}

function buildQuestion(kind, difficulty) {
  const tier = difficultyTier(difficulty);
  let question = '';
  let answerString = '';
  let expectedValue = null;

  if (kind === 'sum') {
    const a = randomInt(tier === 'easy' ? 4 : 10, tier === 'hard' ? 120 : 60);
    const b = randomInt(tier === 'easy' ? 4 : 10, tier === 'hard' ? 120 : 60);
    expectedValue = a + b;
    question = 'Sz\u00e1mold ki: ' + a + ' + ' + b + '.';
  } else if (kind === 'difference') {
    let a = randomInt(tier === 'easy' ? 8 : 20, tier === 'hard' ? 120 : 80);
    let b = randomInt(tier === 'easy' ? 3 : 10, tier === 'hard' ? 90 : 60);
    if (b > a) [a, b] = [b, a];
    expectedValue = a - b;
    question = 'Sz\u00e1mold ki: ' + a + ' - ' + b + '.';
  } else if (kind === 'product') {
    const a = randomInt(tier === 'easy' ? 2 : 5, tier === 'hard' ? 18 : 12);
    const b = randomInt(tier === 'easy' ? 2 : 5, tier === 'hard' ? 18 : 12);
    expectedValue = a * b;
    question = 'Sz\u00e1mold ki: ' + a + ' \u00b7 ' + b + '.';
  } else if (kind === 'division') {
    const divisor = randomInt(tier === 'easy' ? 2 : 3, tier === 'hard' ? 12 : 8);
    const quotient = randomInt(tier === 'easy' ? 2 : 4, tier === 'hard' ? 18 : 12);
    const dividend = divisor * quotient;
    expectedValue = quotient;
    question = 'Sz\u00e1mold ki: ' + dividend + ' : ' + divisor + '.';
  } else if (kind === 'linear-equation') {
    const a = randomInt(tier === 'hard' ? 4 : 2, tier === 'hard' ? 12 : 8);
    const x = randomInt(tier === 'easy' ? 2 : 3, tier === 'hard' ? 12 : 8);
    const b = randomInt(0, tier === 'hard' ? 12 : 8);
    const c = a * x + b;
    expectedValue = x;
    const bPart = b === 0 ? '' : ' + ' + b;
    question = 'Oldd meg: ' + a + 'x' + bPart + ' = ' + c + '.';
  } else if (kind === 'fraction-add') {
    const b = randomInt(2, tier === 'hard' ? 12 : 9);
    const d = randomInt(2, tier === 'hard' ? 12 : 9);
    const a = randomInt(1, b - 1);
    const c = randomInt(1, d - 1);
    const num = a * d + c * b;
    const den = b * d;
    expectedValue = num / den;
    answerString = formatFraction(num, den);
    question = 'Sz\u00e1mold ki: ' + a + '/' + b + ' + ' + c + '/' + d + '.';
  } else if (kind === 'percent') {
    const base = randomInt(tier === 'easy' ? 40 : 60, tier === 'hard' ? 240 : 180);
    const percents = tier === 'easy' ? [5, 10, 20, 25] : [5, 10, 15, 20, 25, 30, 40];
    const p = pickFrom(percents);
    expectedValue = (base * p) / 100;
    question = 'Mennyi ' + p + '%a ' + base + '-nak?';
  } else if (kind === 'ratio') {
    let a = 0;
    let b = 0;
    let c = 0;
    let x = 0;
    let attempts = 0;
    while (attempts < 40) {
      a = randomInt(2, tier === 'hard' ? 9 : 6);
      b = randomInt(3, tier === 'hard' ? 12 : 9);
      c = randomInt(4, tier === 'hard' ? 14 : 10);
      if ((b * c) % a === 0) {
        x = (b * c) / a;
        break;
      }
      attempts += 1;
    }
    expectedValue = x;
    question = 'Ha ' + a + ':' + b + ' = ' + c + ':x, mennyi x?';
  } else if (kind === 'set-union') {
    const a = randomInt(8, tier === 'hard' ? 26 : 18);
    const b = randomInt(8, tier === 'hard' ? 26 : 18);
    const inter = randomInt(2, Math.min(a, b) - 1);
    expectedValue = a + b - inter;
    question = 'Egy halmazban |A| = ' + a + ', |B| = ' + b + ', |A\u2229B| = ' + inter + '. Mennyi |A\u222aB|?';
  } else if (kind === 'set-intersection') {
    const a = randomInt(8, tier === 'hard' ? 26 : 18);
    const b = randomInt(8, tier === 'hard' ? 26 : 18);
    const union = randomInt(Math.max(a, b) + 2, a + b - 1);
    expectedValue = a + b - union;
    question = 'Egy halmazban |A| = ' + a + ', |B| = ' + b + ', |A\u222aB| = ' + union + '. Mennyi |A\u2229B|?';
  } else if (kind === 'set-complement') {
    const u = randomInt(20, tier === 'hard' ? 60 : 40);
    const a = randomInt(4, Math.floor(u * 0.6));
    expectedValue = u - a;
    question = 'Az alaphalmaz elemsz\u00e1ma ' + u + ', |A| = ' + a + '. Mennyi A komplementer\u00e9nek elemsz\u00e1ma?';
  } else if (kind === 'gcd') {
    const base = randomInt(2, tier === 'hard' ? 12 : 8);
    const m = randomInt(2, tier === 'hard' ? 10 : 6);
    const n = randomInt(2, tier === 'hard' ? 10 : 6);
    const a = base * m;
    const b = base * n;
    expectedValue = gcd(a, b);
    question = 'Sz\u00e1mold ki: LNKO(' + a + ', ' + b + ').';
  } else if (kind === 'lcm') {
    const a = randomInt(4, tier === 'hard' ? 16 : 12);
    const b = randomInt(4, tier === 'hard' ? 16 : 12);
    expectedValue = lcm(a, b);
    question = 'Sz\u00e1mold ki: LKKT(' + a + ', ' + b + ').';
  } else if (kind === 'remainder') {
    const divisor = randomInt(3, tier === 'hard' ? 12 : 9);
    const quotient = randomInt(2, tier === 'hard' ? 12 : 8);
    const remainder = randomInt(1, divisor - 1);
    const dividend = divisor * quotient + remainder;
    expectedValue = remainder;
    question = 'Mennyi a marad\u00e9k, ha ' + dividend + '-et elosztjuk ' + divisor + '-mal?';
  } else if (kind === 'rect-area') {
    const a = randomInt(4, tier === 'hard' ? 18 : 12);
    const b = randomInt(3, tier === 'hard' ? 16 : 10);
    expectedValue = a * b;
    question = 'Egy t\u00e9glalap oldalai ' + a + ' cm \u00e9s ' + b + ' cm. Mennyi a ter\u00fclete?';
  } else if (kind === 'rect-perimeter') {
    const a = randomInt(4, tier === 'hard' ? 18 : 12);
    const b = randomInt(3, tier === 'hard' ? 16 : 10);
    expectedValue = 2 * (a + b);
    question = 'Egy t\u00e9glalap oldalai ' + a + ' cm \u00e9s ' + b + ' cm. Mennyi a ker\u00fclete?';
  } else if (kind === 'triangle-area') {
    const base = randomInt(4, tier === 'hard' ? 18 : 12);
    const height = randomInt(4, tier === 'hard' ? 16 : 10);
    expectedValue = (base * height) / 2;
    question = 'Egy h\u00e1romsz\u00f6g alapja ' + base + ' cm, magass\u00e1ga ' + height + ' cm. Mennyi a ter\u00fclete?';
  } else if (kind === 'circle-area') {
    const r = randomInt(2, tier === 'hard' ? 12 : 8);
    expectedValue = PI_VALUE * r * r;
    question = 'Mennyi a k\u00f6r ter\u00fclete, ha r = ' + r + ' cm? (\u03c0 \u2248 3,14)';
  } else if (kind === 'circle-circumference') {
    const r = randomInt(2, tier === 'hard' ? 12 : 8);
    expectedValue = 2 * PI_VALUE * r;
    question = 'Mennyi a k\u00f6r ker\u00fclete, ha r = ' + r + ' cm? (\u03c0 \u2248 3,14)';
  } else if (kind === 'polygon-interior-angle') {
    const options = [5, 6, 8, 9, 10, 12];
    const n = pickFrom(options);
    expectedValue = ((n - 2) * 180) / n;
    question = 'Mennyi egy szab\u00e1lyos ' + n + '-sz\u00f6g bels\u0151 sz\u00f6ge?';
  } else if (kind === 'pythagoras') {
    const triples = [
      { a: 3, b: 4, c: 5 },
      { a: 5, b: 12, c: 13 },
      { a: 6, b: 8, c: 10 }
    ];
    const triple = pickFrom(triples);
    expectedValue = triple.c;
    question = 'Der\u00e9ksz\u00f6g\u0171 h\u00e1romsz\u00f6g befog\u00f3i ' + triple.a + ' cm \u00e9s ' + triple.b + ' cm. Mennyi az \u00e1tfog\u00f3?';
  } else if (kind === 'translation-x') {
    const x = randomInt(-4, 6);
    const y = randomInt(-4, 6);
    const dx = randomInt(2, 6);
    expectedValue = x + dx;
    question = 'P(' + x + '; ' + y + ') pontot eltoljuk (' + dx + '; 0) vektorral. Mi lesz az \u00faj x koordin\u00e1ta?';
  } else if (kind === 'translation-y') {
    const x = randomInt(-4, 6);
    const y = randomInt(-4, 6);
    const dy = randomInt(2, 6);
    expectedValue = y + dy;
    question = 'P(' + x + '; ' + y + ') pontot eltoljuk (0; ' + dy + ') vektorral. Mi lesz az \u00faj y koordin\u00e1ta?';
  } else if (kind === 'midpoint-x') {
    let x1 = randomInt(-6, 6);
    let x2 = randomInt(-6, 6);
    if ((x1 + x2) % 2 !== 0) x2 += 1;
    expectedValue = (x1 + x2) / 2;
    question = 'Mennyi a felez\u0151pont x koordin\u00e1t\u00e1ja, ha x1 = ' + x1 + ', x2 = ' + x2 + '?';
  } else if (kind === 'midpoint-y') {
    let y1 = randomInt(-6, 6);
    let y2 = randomInt(-6, 6);
    if ((y1 + y2) % 2 !== 0) y2 += 1;
    expectedValue = (y1 + y2) / 2;
    question = 'Mennyi a felez\u0151pont y koordin\u00e1t\u00e1ja, ha y1 = ' + y1 + ', y2 = ' + y2 + '?';
  } else if (kind === 'distance-points') {
    const triples = [
      { dx: 3, dy: 4, d: 5 },
      { dx: 5, dy: 12, d: 13 },
      { dx: 6, dy: 8, d: 10 }
    ];
    const triple = pickFrom(triples);
    const x1 = randomInt(-4, 4);
    const y1 = randomInt(-4, 4);
    const x2 = x1 + triple.dx;
    const y2 = y1 + triple.dy;
    expectedValue = triple.d;
    question = 'Mekkora a t\u00e1vols\u00e1g P(' + x1 + '; ' + y1 + ') \u00e9s Q(' + x2 + '; ' + y2 + ') k\u00f6z\u00f6tt?';
  } else if (kind === 'slope') {
    const dx = randomInt(2, 6);
    const m = pickFrom([1, 2, 3, 1/2, 3/2]);
    const dy = Math.round(m * dx);
    const x1 = randomInt(-4, 4);
    const y1 = randomInt(-4, 4);
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const num = y2 - y1;
    const den = x2 - x1;
    expectedValue = num / den;
    answerString = formatFraction(num, den);
    question = 'Mennyi a meredeks\u00e9g a P(' + x1 + '; ' + y1 + ') \u00e9s Q(' + x2 + '; ' + y2 + ') pontokat \u00f6sszek\u00f6t\u0151 egyenesn\u00e9l?';
  } else if (kind === 'volume-prism') {
    const a = randomInt(3, tier === 'hard' ? 12 : 8);
    const b = randomInt(3, tier === 'hard' ? 12 : 8);
    const c = randomInt(3, tier === 'hard' ? 12 : 8);
    expectedValue = a * b * c;
    question = 'Egy t\u00e9glatest m\u00e9retei ' + a + ' cm, ' + b + ' cm \u00e9s ' + c + ' cm. Mennyi a t\u00e9rfogata?';
  } else if (kind === 'volume-cylinder') {
    const r = randomInt(2, tier === 'hard' ? 8 : 6);
    const h = randomInt(4, tier === 'hard' ? 12 : 8);
    expectedValue = PI_VALUE * r * r * h;
    question = 'Egy henger sugara ' + r + ' cm, magass\u00e1ga ' + h + ' cm. Mennyi a t\u00e9rfogata? (\u03c0 \u2248 3,14)';
  } else if (kind === 'probability') {
    const total = randomInt(6, tier === 'hard' ? 20 : 14);
    const favorable = randomInt(1, total - 1);
    expectedValue = favorable / total;
    answerString = formatFraction(favorable, total);
    question = 'Egy k\u00eds\u00e9rletben ' + total + ' azonos es\u00e9ly\u0171 eset van, ebb\u0151l ' + favorable + ' kedvez\u0151. Mennyi a val\u00f3sz\u00edn\u0171s\u00e9g?';
  } else if (kind === 'factorial') {
    const n = randomInt(4, tier === 'hard' ? 8 : 6);
    expectedValue = factorial(n);
    question = 'Sz\u00e1mold ki: ' + n + '!';
  } else if (kind === 'permutation') {
    const n = randomInt(5, tier === 'hard' ? 9 : 7);
    const k = randomInt(2, tier === 'hard' ? 4 : 3);
    expectedValue = factorial(n) / factorial(n - k);
    question = 'H\u00e1nyf\u00e9lek\u00e9ppen v\u00e1laszthat\u00f3 ki sorrendben ' + k + ' elem ' + n + ' k\u00fcl\u00f6nb\u00f6z\u0151 elem k\u00f6z\u00fcl?';
  } else if (kind === 'combination') {
    const n = randomInt(5, tier === 'hard' ? 9 : 8);
    const k = randomInt(2, tier === 'hard' ? 4 : 3);
    expectedValue = factorial(n) / (factorial(k) * factorial(n - k));
    question = 'H\u00e1nyf\u00e9lek\u00e9ppen v\u00e1laszthat\u00f3 ki ' + k + ' elem ' + n + ' k\u00f6z\u00fcl?';
  } else if (kind === 'mean') {
    const values = [
      randomInt(6, tier === 'hard' ? 20 : 16),
      randomInt(6, tier === 'hard' ? 20 : 16),
      randomInt(6, tier === 'hard' ? 20 : 16),
      randomInt(6, tier === 'hard' ? 20 : 16)
    ];
    const sum = values.reduce((acc, v) => acc + v, 0);
    expectedValue = sum / values.length;
    question = 'Mennyi az \u00e1tlag a k\u00f6vetkez\u0151 sz\u00e1mokra: ' + values.join(', ') + '?';
  } else if (kind === 'median') {
    const values = [
      randomInt(4, tier === 'hard' ? 20 : 14),
      randomInt(4, tier === 'hard' ? 20 : 14),
      randomInt(4, tier === 'hard' ? 20 : 14),
      randomInt(4, tier === 'hard' ? 20 : 14),
      randomInt(4, tier === 'hard' ? 20 : 14)
    ];
    const sorted = [...values].sort((a, b) => a - b);
    expectedValue = sorted[2];
    question = 'Mi a medi\u00e1nja a k\u00f6vetkez\u0151 sz\u00e1moknak: ' + values.join(', ') + '?';
  } else if (kind === 'arith-next') {
    const a1 = randomInt(2, tier === 'hard' ? 8 : 6);
    const d = randomInt(2, tier === 'hard' ? 7 : 5);
    const n = randomInt(3, tier === 'hard' ? 6 : 5);
    const an = a1 + (n - 1) * d;
    expectedValue = an + d;
    question = 'Sz\u00e1mtani sorozatban a1 = ' + a1 + ', d = ' + d + '. Mennyi a a' + (n + 1) + '?';
  } else if (kind === 'arith-nth') {
    const a1 = randomInt(2, tier === 'hard' ? 10 : 6);
    const d = randomInt(2, tier === 'hard' ? 8 : 5);
    const n = randomInt(4, tier === 'hard' ? 8 : 6);
    expectedValue = a1 + (n - 1) * d;
    question = 'Sz\u00e1mtani sorozatban a1 = ' + a1 + ', d = ' + d + '. Mennyi a a' + n + '?';
  } else if (kind === 'geom-next') {
    const a1 = randomInt(2, tier === 'hard' ? 5 : 4);
    const r = randomInt(2, tier === 'hard' ? 4 : 3);
    const n = randomInt(3, tier === 'hard' ? 5 : 4);
    const an = a1 * Math.pow(r, n - 1);
    expectedValue = an * r;
    question = 'M\u00e9rtani sorozatban a1 = ' + a1 + ', r = ' + r + '. Mennyi a a' + (n + 1) + '?';
  } else if (kind === 'geom-nth') {
    const a1 = randomInt(2, tier === 'hard' ? 5 : 4);
    const r = randomInt(2, tier === 'hard' ? 4 : 3);
    const n = randomInt(3, tier === 'hard' ? 6 : 5);
    expectedValue = a1 * Math.pow(r, n - 1);
    question = 'M\u00e9rtani sorozatban a1 = ' + a1 + ', r = ' + r + '. Mennyi a a' + n + '?';
  } else if (kind === 'derivative-linear') {
    const a = randomInt(tier === 'hard' ? 3 : 2, tier === 'hard' ? 12 : 8);
    const b = randomInt(0, tier === 'hard' ? 10 : 6);
    expectedValue = a;
    const bPart = b === 0 ? '' : ' + ' + b;
    question = 'f(x) = ' + a + 'x' + bPart + '. Mennyi f\'(x)?';
  } else if (kind === 'derivative-quadratic') {
    const a = randomInt(tier === 'hard' ? 2 : 1, tier === 'hard' ? 6 : 4);
    const b = randomInt(0, tier === 'hard' ? 8 : 6);
    const c = randomInt(0, tier === 'hard' ? 8 : 6);
    const x0 = randomInt(1, tier === 'hard' ? 5 : 4);
    expectedValue = 2 * a * x0 + b;
    const bPart = b === 0 ? '' : ' + ' + b + 'x';
    const cPart = c === 0 ? '' : ' + ' + c;
    question = 'f(x) = ' + a + 'x^2' + bPart + cPart + '. Mennyi f\'(' + x0 + ')?';
  } else if (kind === 'integral-linear') {
    const a = randomInt(1, tier === 'hard' ? 6 : 4);
    const b = randomInt(0, tier === 'hard' ? 6 : 4);
    const t = randomInt(2, tier === 'hard' ? 6 : 5);
    expectedValue = 0.5 * a * t * t + b * t;
    const bPart = b === 0 ? '' : ' + ' + b;
    question = 'Sz\u00e1mold ki: \u222b_0^' + t + ' (' + a + 'x' + bPart + ') dx.';
  } else if (kind === 'integral-quadratic') {
    const a = randomInt(1, tier === 'hard' ? 4 : 3);
    const t = randomInt(2, tier === 'hard' ? 5 : 4);
    expectedValue = (a * Math.pow(t, 3)) / 3;
    question = 'Sz\u00e1mold ki: \u222b_0^' + t + ' ' + a + 'x^2 dx.';
  }

  if (!answerString && expectedValue !== null) {
    answerString = formatNumber(expectedValue);
  }

  return {
    kind,
    question,
    answerString,
    expectedValue
  };
}

function buildTestQuestions(difficulty) {
  const types = (TEST_QUESTION_TYPES && TEST_QUESTION_TYPES.length)
    ? TEST_QUESTION_TYPES
    : (QUESTION_TYPES_BY_DIFFICULTY[difficulty] || QUESTION_TYPES_BY_DIFFICULTY[DIFF_EASY] || []);
  const questions = [];
  const used = new Set();
  const poolTarget = TEST_QUESTION_COUNT + Math.min(types.length * 3, 8);

  const seedKinds = shuffle(types).slice(0, Math.min(types.length, TEST_QUESTION_COUNT));
  seedKinds.forEach((kind) => {
    let attempts = 0;
    let q = null;
    while (attempts < 30) {
      const candidate = buildQuestion(kind, difficulty);
      const signature = kind + ':' + candidate.question;
      if (!used.has(signature) && candidate.answerString) {
        used.add(signature);
        q = candidate;
        break;
      }
      attempts += 1;
    }
    if (q) questions.push(q);
  });

  for (let safety = 0; questions.length < poolTarget && safety < poolTarget * 25; safety += 1) {
    const kind = types[randomInt(0, types.length - 1)];
    const candidate = buildQuestion(kind, difficulty);
    const signature = kind + ':' + candidate.question;
    if (!used.has(signature) && candidate.answerString) {
      used.add(signature);
      questions.push(candidate);
    }
  }

  return shuffle(questions).slice(0, TEST_QUESTION_COUNT);
}

function checkAnswer(userAnswer, question) {
  const parsed = parseNumberInput(userAnswer || '');
  if (!parsed || question.expectedValue === null) return false;
  return Math.abs(parsed.value - question.expectedValue) < 0.01;
}

function renderPagination() {
  if (!paginationDots) return;
  paginationDots.innerHTML = '';
  testQuestions.forEach((q, index) => {
    const dot = document.createElement('div');
    dot.className = 'dot';
    if (index === currentTestIndex) dot.classList.add('current');
    if (q.userAnswer && q.userAnswer.trim().length > 0) dot.classList.add('answered');
    dot.addEventListener('click', () => {
      saveTestAnswer();
      goToTestQuestion(index);
    });
    paginationDots.appendChild(dot);
  });
}

function saveTestAnswer() {
  if (!testQuestions[currentTestIndex] || !testAnswerInput) return;
  testQuestions[currentTestIndex].userAnswer = testAnswerInput.value.trim();
}

function renderTestQuestion() {
  const current = testQuestions[currentTestIndex];
  if (!current) return;
  testQuestion.textContent = current.question;
  currentTestAnswer = current.answerString;
  currentTestKind = current.kind || '';
  window.currentTestAnswer = currentTestAnswer;
  window.currentTestKind = currentTestKind;
  testAnswerInput.value = current.userAnswer || '';
  renderPagination();
  if (prevTestBtn) prevTestBtn.disabled = currentTestIndex === 0;
  if (nextTestBtn) nextTestBtn.disabled = currentTestIndex >= testQuestions.length - 1;
}

function goToTestQuestion(index) {
  if (index < 0 || index >= testQuestions.length) return;
  currentTestIndex = index;
  renderTestQuestion();
}

function startTest() {
  testQuestions = buildTestQuestions(currentTestDifficulty);
  currentTestIndex = 0;
  correctAnswers = 0;
  isTestRunning = true;
  if (testArea) testArea.classList.remove('is-hidden');
  if (testIntro) testIntro.hidden = true;
  window.currentTestQuestionCount = testQuestions.length;
  window.currentTestDifficulty = currentTestDifficulty;
  if (testStartBtn) {
    testStartBtn.disabled = true;
    testStartBtn.hidden = true;
  }
  renderTestQuestion();
}

function showResultPopup(message) {
  resultPopup.textContent = message;
  resultPopup.classList.add('show');
  setTimeout(() => {
    resultPopup.classList.remove('show');
  }, 3000);
}

function finishTest() {
  saveTestAnswer();
  const total = testQuestions.length || 1;
  correctAnswers = 0;
  testQuestions.forEach((q) => {
    const isCorrect = checkAnswer(q.userAnswer || '', q);
    q.correctAnswer = q.answerString;
    q.isCorrect = isCorrect;
    if (isCorrect) correctAnswers += 1;
  });
  const percentage = Math.round((correctAnswers / total) * 100);
  let grade = 0;
  let feedback = '';

  if (percentage < 40) { grade = 1; feedback = 'El\u00e9gtelen (1)'; }
  else if (percentage < 55) { grade = 2; feedback = 'El\u00e9gs\u00e9ges (2)'; }
  else if (percentage < 70) { grade = 3; feedback = 'K\u00f6zepes (3)'; }
  else if (percentage < 85) { grade = 4; feedback = 'J\u00f3 (4)'; }
  else { grade = 5; feedback = 'Jeles (5)'; }

  showResultPopup('Eredm\u00e9ny: ' + percentage + '% - ' + feedback);

  const result = {
    topicId: TOPIC_ID,
    topicName: TOPIC_NAME,
    difficulty: currentTestDifficulty,
    grade,
    percentage,
    timestamp: new Date().toISOString(),
    questions: testQuestions.map((q) => ({
      question: q.question,
      userAnswer: q.userAnswer || '',
      correctAnswer: q.correctAnswer || q.answerString
    }))
  };
  if (window.parent) {
    window.parent.postMessage({ type: 'testResult', result }, '*');
  }

  isTestRunning = false;
  if (testStartBtn) {
    testStartBtn.disabled = false;
    testStartBtn.hidden = false;
    testStartBtn.textContent = '\u00daj teszt';
  }
  if (testIntro) testIntro.hidden = false;
  if (testAnswerInput) testAnswerInput.value = '';
  currentTestAnswer = '';
  currentTestKind = '';
  window.currentTestAnswer = '';
  window.currentTestKind = '';
  if (testArea) {
    testArea.classList.add('is-hidden');
  }
}

function getEnabledPracticeDifficulties() {
  return Array.from(practiceDifficultyInputs)
    .filter(input => input.checked)
    .map(input => input.value);
}

function pickRandomDifficulty(list) {
  if (!list.length) return DIFF_EASY;
  const index = randomInt(0, list.length - 1);
  return list[index];
}

function makePracticeSignature(difficulty, item) {
  return [difficulty, item.kind, item.question].join('|');
}

function pushPracticeHistory(entry) {
  practiceHistory.push(entry);
  if (practiceHistory.length > PRACTICE_HISTORY_LIMIT) {
    practiceHistory.shift();
  }
}

function buildPracticeQuestion(difficulty, options = {}) {
  const kinds = QUESTION_TYPES_BY_DIFFICULTY[difficulty] || QUESTION_TYPES_BY_DIFFICULTY[DIFF_EASY] || [];
  const avoidKind = options.avoidKind;
  let pool = kinds;
  if (avoidKind && kinds.length > 1) {
    pool = kinds.filter(kind => kind !== avoidKind);
    if (!pool.length) {
      pool = kinds;
    }
  }
  const kind = pool[randomInt(0, pool.length - 1)];
  return buildQuestion(kind, difficulty);
}

function nextPracticeQuestion() {
  const enabled = getEnabledPracticeDifficulties();
  if (!enabled.length) return;
  const difficulty = pickRandomDifficulty(enabled);
  const lastKind = practiceHistory.length ? practiceHistory[practiceHistory.length - 1].kind : null;
  let attempts = 0;
  let nextQuestion = null;

  while (attempts < PRACTICE_RETRY_LIMIT) {
    const candidate = buildPracticeQuestion(difficulty, { avoidKind: lastKind });
    const signature = makePracticeSignature(difficulty, candidate);
    if (!practiceHistory.some(entry => entry.signature === signature) && candidate.answerString) {
      candidate.signature = signature;
      nextQuestion = candidate;
      break;
    }
    attempts += 1;
  }

  if (!nextQuestion) {
    nextQuestion = buildPracticeQuestion(difficulty);
    nextQuestion.signature = makePracticeSignature(difficulty, nextQuestion);
  }

  currentPracticeDifficulty = difficulty;
  currentPracticeAnswer = nextQuestion.answerString;
  currentPracticeExpected = nextQuestion;
  currentPracticeKind = nextQuestion.kind || '';
  window.currentPracticeAnswer = currentPracticeAnswer;
  window.currentPracticeKind = currentPracticeKind;
  practiceQuestion.textContent = nextQuestion.question;
  practiceInput.value = '';
  practiceFeedback.textContent = '';
  practiceFeedback.style.color = '';
  pushPracticeHistory({
    signature: nextQuestion.signature,
    kind: nextQuestion.kind
  });
}

function checkPracticeAnswer() {
  if (!practiceActive) return;
  const isCorrect = checkAnswer(practiceInput.value || '', currentPracticeExpected);
  if (isCorrect) {
    const xpReward = PRACTICE_XP_REWARDS[currentPracticeDifficulty] || 1;
    practiceFeedback.textContent = 'Helyes! (+' + xpReward + ' XP)';
    practiceFeedback.style.color = '#43b581';
    if (window.parent) {
      window.parent.postMessage({ type: 'practiceXp', xp: xpReward, topicId: TOPIC_ID }, '*');
    }
    setTimeout(() => {
      if (practiceActive) {
        nextPracticeQuestion();
      }
    }, 2000);
  } else {
    practiceFeedback.textContent = 'Pr\u00f3b\u00e1ld \u00fajra!';
    practiceFeedback.style.color = '#f04747';
  }
}

function updateQuickModel() {
  if (!modelAInput || !modelBInput) return;
  const aValue = parseNumberInput(modelAInput.value || '');
  const bValue = parseNumberInput(modelBInput.value || '');
  if (!aValue || !bValue) {
    modelSum.textContent = '-';
    modelDiff.textContent = '-';
    modelProd.textContent = '-';
    modelAvg.textContent = '-';
    modelRatio.textContent = '-';
    modelNote.textContent = 'Adj meg k\u00e9t sz\u00e1mot.';
    modelNote.style.color = '#f04747';
    return;
  }
  const sum = aValue.value + bValue.value;
  const diff = aValue.value - bValue.value;
  const prod = aValue.value * bValue.value;
  const avg = sum / 2;
  const ratio = bValue.value === 0 ? null : aValue.value / bValue.value;
  modelSum.textContent = formatNumber(sum);
  modelDiff.textContent = formatNumber(diff);
  modelProd.textContent = formatNumber(prod);
  modelAvg.textContent = formatNumber(avg);
  modelRatio.textContent = ratio === null ? '-' : formatNumber(ratio);
  if (bValue.value === 0) {
    modelNote.textContent = 'B \u00e9rt\u00e9k nem lehet 0 a h\u00e1nyadoshoz.';
    modelNote.style.color = '#f04747';
  } else {
    modelNote.textContent = '';
    modelNote.style.color = '';
  }
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveTab(button.dataset.tab);
  });
});

difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextDifficulty = button.dataset.difficulty;
    if (!nextDifficulty) return;
    currentTestDifficulty = nextDifficulty;
    difficultyButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.difficulty === currentTestDifficulty);
    });
    if (isTestRunning) {
      startTest();
    }
  });
});

if (testStartBtn) {
  testStartBtn.addEventListener('click', () => {
    startTest();
  });
}
if (prevTestBtn) {
  prevTestBtn.addEventListener('click', () => {
    saveTestAnswer();
    goToTestQuestion(currentTestIndex - 1);
  });
}
if (nextTestBtn) {
  nextTestBtn.addEventListener('click', () => {
    saveTestAnswer();
    goToTestQuestion(currentTestIndex + 1);
  });
}
if (finishTestBtn) finishTestBtn.addEventListener('click', finishTest);
if (testAnswerInput) {
  testAnswerInput.addEventListener('input', () => {
    saveTestAnswer();
    renderPagination();
  });
  testAnswerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveTestAnswer();
      if (currentTestIndex < testQuestions.length - 1) {
        goToTestQuestion(currentTestIndex + 1);
      }
    }
  });
}

if (practiceStartBtn) {
  practiceStartBtn.addEventListener('click', () => {
    const enabled = getEnabledPracticeDifficulties();
    if (!enabled.length) {
      practiceFeedback.textContent = 'V\u00e1lassz legal\u00e1bb egy neh\u00e9zs\u00e9gi szintet.';
      practiceFeedback.style.color = '#f04747';
      return;
    }
    practiceActive = true;
    practiceHistory.length = 0;
    practiceArea.classList.remove('is-hidden');
    nextPracticeQuestion();
  });
}
if (practiceCheck) practiceCheck.addEventListener('click', checkPracticeAnswer);
if (practiceInput) {
  practiceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      checkPracticeAnswer();
    }
  });
}

if (modelAInput) modelAInput.addEventListener('input', updateQuickModel);
if (modelBInput) modelBInput.addEventListener('input', updateQuickModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateQuickModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
