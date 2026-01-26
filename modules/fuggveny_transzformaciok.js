const TOPIC_ID = 'fuggveny_transzformaciok';
const TOPIC_NAME = 'F\u00fcggv\u00e9nytranszform\u00e1ci\u00f3k';
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

const QUESTION_TYPES_BY_DIFFICULTY = {
  [DIFF_EASY]: ['shift-vertical', 'shift-horizontal', 'reflect-x', 'reflect-y', 'point-shift-y'],
  [DIFF_NORMAL]: ['shift-horizontal', 'scale-vertical', 'scale-horizontal', 'point-shift-y', 'point-scale-y', 'reflect-x'],
  [DIFF_HARD]: ['point-shift-x', 'point-combined', 'scale-vertical', 'scale-horizontal', 'reflect-y', 'point-scale-y']
};

const TEXT_ALIASES = {
  xtengely: ['xtengely', 'xtengelyre', 'x', 'xaxis'],
  ytengely: ['ytengely', 'ytengelyre', 'y', 'yaxis']
};

const BASE_FUNCTIONS = {
  parabola: {
    label: 'x^2',
    points: [
      { x: -1, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ],
    domain: 'all'
  },
  abs: {
    label: '|x|',
    points: [
      { x: -1, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ],
    domain: 'all'
  },
  sqrt: {
    label: 'sqrt(x)',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 4, y: 2 }
    ],
    domain: 'sqrt'
  }
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
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

const practiceStartBtn = document.getElementById('start-practice-btn');
const practiceArea = document.getElementById('practice-area');
const practiceQuestion = document.getElementById('practice-question');
const practiceInput = document.getElementById('practice-input');
const practiceCheck = document.getElementById('check-practice-btn');
const practiceFeedback = document.getElementById('practice-feedback');
const practiceDifficultyInputs = document.querySelectorAll('.practice-difficulty');

const transBaseSelect = document.getElementById('trans-base');
const transAInput = document.getElementById('trans-a');
const transBInput = document.getElementById('trans-b');
const transHInput = document.getElementById('trans-h');
const transKInput = document.getElementById('trans-k');
const transEquation = document.getElementById('trans-equation');
const transDomain = document.getElementById('trans-domain');
const transRange = document.getElementById('trans-range');
const transVerticalShift = document.getElementById('trans-vertical-shift');
const transHorizontalShift = document.getElementById('trans-horizontal-shift');
const transVerticalScale = document.getElementById('trans-vertical-scale');
const transHorizontalScale = document.getElementById('trans-horizontal-scale');
const transReflection = document.getElementById('trans-reflection');
const transPoint1 = document.getElementById('trans-point-1');
const transPoint2 = document.getElementById('trans-point-2');
const transPoint3 = document.getElementById('trans-point-3');
const transNote = document.getElementById('trans-note');

let activeTab = 'elmelet';
let testQuestions = [];
let currentTestIndex = 0;
let currentTestDifficulty = DIFF_EASY;
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
  if (tabName === 'teszt' && !isTestRunning) {
    startTest();
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickNonZero(min, max) {
  let value = 0;
  while (value === 0) {
    value = randomInt(min, max);
  }
  return value;
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
  return value.trim().replace(/\s+/g, '').replace(',', '.');
}

function normalizeText(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/\u00e1/g, 'a')
    .replace(/\u00e9/g, 'e')
    .replace(/\u00ed/g, 'i')
    .replace(/[\u00f3\u00f6\u0151]/g, 'o')
    .replace(/[\u00fa\u00fc\u0171]/g, 'u');
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

function simplifyFraction(n, d) {
  if (d === 0) return null;
  const sign = d < 0 ? -1 : 1;
  const nn = n * sign;
  const dd = Math.abs(d);
  const g = gcd(nn, dd);
  return {
    n: nn / g,
    d: dd / g
  };
}

function parseAnswer(value) {
  const raw = normalizeInput(value);
  if (!raw) return null;
  if (/^-?\d+\/-?\d+$/.test(raw)) {
    const parts = raw.split('/');
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    const fraction = simplifyFraction(num, den);
    return fraction ? { value: fraction.n / fraction.d, fraction } : null;
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? { value: parsed, fraction: null } : null;
}

function parseNumberInput(value) {
  const parsed = parseAnswer(value);
  return parsed ? parsed.value : null;
}

function formatNumber(value, precision = 3) {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function formatSigned(value) {
  if (Math.abs(value) < 1e-9) return '';
  const absText = formatNumber(Math.abs(value), 3);
  return value < 0 ? ` - ${absText}` : ` + ${absText}`;
}

function formatShiftedX(h) {
  if (Math.abs(h) < 1e-9) return 'x';
  const absText = formatNumber(Math.abs(h), 3);
  return h > 0 ? `x - ${absText}` : `x + ${absText}`;
}

function formatBx(b) {
  if (Math.abs(b - 1) < 1e-9) return 'x';
  if (Math.abs(b + 1) < 1e-9) return '-x';
  return `${formatNumber(b, 3)}x`;
}

function formatScaledInput(b, h) {
  const shift = formatShiftedX(h);
  if (Math.abs(b - 1) < 1e-9) return shift;
  if (Math.abs(b + 1) < 1e-9) {
    if (shift === 'x') return '-x';
    return `-(${shift})`;
  }
  const bText = formatNumber(b, 3);
  if (shift === 'x') return `${bText}x`;
  return `${bText}(${shift})`;
}

function formatCoefficient(a) {
  if (Math.abs(a - 1) < 1e-9) return '';
  if (Math.abs(a + 1) < 1e-9) return '-';
  return `${formatNumber(a, 3)}`;
}

function buildScaledFunction(a, inner) {
  if (Math.abs(a - 1) < 1e-9) return `f(${inner})`;
  if (Math.abs(a + 1) < 1e-9) return `-f(${inner})`;
  return `${formatNumber(a, 3)} f(${inner})`;
}

function buildTransformEquation(baseKey, a, b, h, k) {
  if (Math.abs(a) < 1e-9) {
    return `g(x) = ${formatNumber(k, 3)}`;
  }
  const scaledInput = formatScaledInput(b, h);
  let core = '';
  if (baseKey === 'parabola') {
    const baseInput = scaledInput === 'x' ? 'x' : `(${scaledInput})`;
    core = `${baseInput}^2`;
  } else if (baseKey === 'abs') {
    core = scaledInput === 'x' ? '|x|' : `|${scaledInput}|`;
  } else if (baseKey === 'sqrt') {
    core = scaledInput === 'x' ? 'sqrt(x)' : `sqrt(${scaledInput})`;
  }
  const coefficient = formatCoefficient(a);
  const expr = `${coefficient}${core}${formatSigned(k)}`;
  return `g(x) = ${expr}`;
}

function describeShift(value, positive, negative) {
  if (Math.abs(value) < 1e-9) return 'nincs';
  const amount = formatNumber(Math.abs(value), 3);
  const direction = value > 0 ? positive : negative;
  return `${direction} ${amount} egys\u00e9g`;
}

function describeVerticalScale(a) {
  const absA = Math.abs(a);
  if (absA < 1e-9) return 'lenull\u00e1z\u00e1s';
  if (Math.abs(absA - 1) < 1e-9) return 'nincs';
  if (absA > 1) return `ny\u00fajt\u00e1s ${formatNumber(absA, 3)}x`;
  return `\u00f6sszenyom\u00e1s ${formatNumber(1 / absA, 3)}x`;
}

function describeHorizontalScale(b) {
  const absB = Math.abs(b);
  if (absB < 1e-9) return 'nincs';
  if (Math.abs(absB - 1) < 1e-9) return 'nincs';
  if (absB > 1) return `\u00f6sszenyom\u00e1s ${formatNumber(absB, 3)}x`;
  return `ny\u00fajt\u00e1s ${formatNumber(1 / absB, 3)}x`;
}

function buildDomain(baseKey, b, h) {
  if (baseKey === 'sqrt') {
    const hText = formatNumber(h, 3);
    if (b > 0) return `x >= ${hText}`;
    if (b < 0) return `x <= ${hText}`;
    return 'x b\u00e1rmely val\u00f3s sz\u00e1m';
  }
  return 'x b\u00e1rmely val\u00f3s sz\u00e1m';
}

function buildRange(a, k) {
  const kText = formatNumber(k, 3);
  if (Math.abs(a) < 1e-9) return `y = ${kText}`;
  if (a > 0) return `y >= ${kText}`;
  return `y <= ${kText}`;
}

function transformPoint(point, a, b, h, k) {
  if (Math.abs(b) < 1e-9) {
    return { x: h, y: a * point.y + k };
  }
  return { x: point.x / b + h, y: a * point.y + k };
}

function formatPoint(point) {
  return `(${formatNumber(point.x, 3)}, ${formatNumber(point.y, 3)})`;
}

function updateTransformModel() {
  if (!transEquation) return;
  const baseKey = transBaseSelect ? transBaseSelect.value : 'parabola';
  const a = parseNumberInput(transAInput?.value || '');
  const b = parseNumberInput(transBInput?.value || '');
  const h = parseNumberInput(transHInput?.value || '');
  const k = parseNumberInput(transKInput?.value || '');

  if (a === null || b === null || h === null || k === null || Math.abs(b) < 1e-9) {
    transEquation.textContent = '-';
    transDomain.textContent = '-';
    transRange.textContent = '-';
    transVerticalShift.textContent = '-';
    transHorizontalShift.textContent = '-';
    transVerticalScale.textContent = '-';
    transHorizontalScale.textContent = '-';
    transReflection.textContent = '-';
    transPoint1.textContent = '-';
    transPoint2.textContent = '-';
    transPoint3.textContent = '-';
    if (transNote) {
      transNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat, b \u2260 0.';
      transNote.style.color = '#f04747';
    }
    return;
  }

  const baseInfo = BASE_FUNCTIONS[baseKey] || BASE_FUNCTIONS.parabola;
  const equation = buildTransformEquation(baseKey, a, b, h, k);
  transEquation.textContent = equation;
  transDomain.textContent = buildDomain(baseKey, b, h);
  transRange.textContent = buildRange(a, k);
  transVerticalShift.textContent = describeShift(k, 'felfel\u00e9', 'lefel\u00e9');
  transHorizontalShift.textContent = describeShift(h, 'jobbra', 'balra');
  transVerticalScale.textContent = `a = ${formatNumber(a, 3)} (${describeVerticalScale(a)})`;
  transHorizontalScale.textContent = `b = ${formatNumber(b, 3)} (${describeHorizontalScale(b)})`;
  const reflections = [];
  if (a < 0) reflections.push('x-tengely');
  if (b < 0) reflections.push('y-tengely');
  transReflection.textContent = reflections.length ? reflections.join(', ') : 'nincs';

  const points = baseInfo.points || [];
  const transformed = points.map(point => transformPoint(point, a, b, h, k));
  if (transPoint1 && points[0]) {
    transPoint1.textContent = `${formatPoint(points[0])} -> ${formatPoint(transformed[0])}`;
  }
  if (transPoint2 && points[1]) {
    transPoint2.textContent = `${formatPoint(points[1])} -> ${formatPoint(transformed[1])}`;
  }
  if (transPoint3 && points[2]) {
    transPoint3.textContent = `${formatPoint(points[2])} -> ${formatPoint(transformed[2])}`;
  }
  if (transNote) {
    transNote.textContent = '';
    transNote.style.color = '';
  }
}

function pickShiftValue(difficulty, allowNegative) {
  const max = difficulty === DIFF_EASY ? 4 : difficulty === DIFF_NORMAL ? 6 : 8;
  let value = randomInt(1, max);
  if (allowNegative && Math.random() < 0.5) value *= -1;
  return value;
}

function pickScaleValue(difficulty, allowNegative) {
  const pool = difficulty === DIFF_HARD ? [2, 3, 4] : [2, 3];
  let value = pool[randomInt(0, pool.length - 1)];
  if (allowNegative && Math.random() < 0.5) value *= -1;
  return value;
}

function buildShiftVertical(difficulty) {
  const k = pickShiftValue(difficulty, difficulty !== DIFF_EASY);
  const question = `g(x) = f(x)${formatSigned(k)}. Add meg k \u00e9rt\u00e9k\u00e9t (el\u0151jellel).`;
  return {
    question,
    answerString: formatNumber(k, 3),
    answerType: 'number',
    expectedValue: k
  };
}

function buildShiftHorizontal(difficulty) {
  const allowNegative = difficulty !== DIFF_EASY;
  const h = pickShiftValue(difficulty, allowNegative);
  const inner = formatShiftedX(h);
  const question = `g(x) = f(${inner}). Add meg h \u00e9rt\u00e9k\u00e9t az f(x - h) alakban.`;
  return {
    question,
    answerString: formatNumber(h, 3),
    answerType: 'number',
    expectedValue: h
  };
}

function buildVerticalScale(difficulty) {
  const a = pickScaleValue(difficulty, true);
  const equation = buildScaledFunction(a, 'x');
  const question = `g(x) = ${equation}. Add meg a szorz\u00f3t (a).`;
  return {
    question,
    answerString: formatNumber(a, 3),
    answerType: 'number',
    expectedValue: a
  };
}

function buildHorizontalScale(difficulty) {
  const b = pickScaleValue(difficulty, true);
  const bx = formatBx(b);
  const question = `g(x) = f(${bx}). Add meg b \u00e9rt\u00e9k\u00e9t.`;
  return {
    question,
    answerString: formatNumber(b, 3),
    answerType: 'number',
    expectedValue: b
  };
}

function buildReflectX() {
  const question = 'g(x) = -f(x). Melyik tengelyre t\u00f6rt\u00e9nik t\u00fckr\u00f6z\u00e9s?';
  return {
    question,
    answerString: 'x-tengely',
    answerType: 'text',
    expectedText: 'xtengely'
  };
}

function buildReflectY() {
  const question = 'g(x) = f(-x). Melyik tengelyre t\u00f6rt\u00e9nik t\u00fckr\u00f6z\u00e9s?';
  return {
    question,
    answerString: 'y-tengely',
    answerType: 'text',
    expectedText: 'ytengely'
  };
}

function buildPointShiftY(difficulty) {
  const x0 = randomInt(-4, 4);
  const y0 = pickNonZero(-4, 4);
  const k = pickShiftValue(difficulty, true);
  const question = `Ha f(${formatNumber(x0, 3)}) = ${formatNumber(y0, 3)} \u00e9s g(x) = f(x)${formatSigned(k)}, mi g(${formatNumber(x0, 3)})?`;
  return {
    question,
    answerString: formatNumber(y0 + k, 3),
    answerType: 'number',
    expectedValue: y0 + k
  };
}

function buildPointShiftX(difficulty) {
  const x0 = randomInt(-4, 4);
  const y0 = pickNonZero(-4, 4);
  const h = pickShiftValue(difficulty, true);
  const inner = formatShiftedX(h);
  const question = `Ha (${formatNumber(x0, 3)}, ${formatNumber(y0, 3)}) pont a f grafikonon, \u00e9s g(x) = f(${inner}), mi lesz az \u00faj x-koordin\u00e1ta?`;
  return {
    question,
    answerString: formatNumber(x0 + h, 3),
    answerType: 'number',
    expectedValue: x0 + h
  };
}

function buildPointScaleY(difficulty) {
  const x0 = randomInt(-4, 4);
  const y0 = pickNonZero(-4, 4);
  const a = pickScaleValue(difficulty, true);
  const equation = buildScaledFunction(a, 'x');
  const question = `Ha f(${formatNumber(x0, 3)}) = ${formatNumber(y0, 3)} \u00e9s g(x) = ${equation}, mi g(${formatNumber(x0, 3)})?`;
  return {
    question,
    answerString: formatNumber(a * y0, 3),
    answerType: 'number',
    expectedValue: a * y0
  };
}

function buildPointCombined(difficulty) {
  const x0 = randomInt(-4, 4);
  const y0 = pickNonZero(-4, 4);
  const a = pickScaleValue(difficulty, true);
  const h = pickShiftValue(difficulty, true);
  const k = pickShiftValue(difficulty, true);
  const inner = formatShiftedX(h);
  const equation = `${buildScaledFunction(a, inner)}${formatSigned(k)}`;
  const xTarget = x0 + h;
  const question = `Ha f(${formatNumber(x0, 3)}) = ${formatNumber(y0, 3)} \u00e9s g(x) = ${equation}, mi g(${formatNumber(xTarget, 3)})?`;
  return {
    question,
    answerString: formatNumber(a * y0 + k, 3),
    answerType: 'number',
    expectedValue: a * y0 + k
  };
}

function buildQuestion(kind, difficulty) {
  let result = null;

  if (kind === 'shift-vertical') {
    result = buildShiftVertical(difficulty);
  } else if (kind === 'shift-horizontal') {
    result = buildShiftHorizontal(difficulty);
  } else if (kind === 'scale-vertical') {
    result = buildVerticalScale(difficulty);
  } else if (kind === 'scale-horizontal') {
    result = buildHorizontalScale(difficulty);
  } else if (kind === 'reflect-x') {
    result = buildReflectX();
  } else if (kind === 'reflect-y') {
    result = buildReflectY();
  } else if (kind === 'point-shift-y') {
    result = buildPointShiftY(difficulty);
  } else if (kind === 'point-shift-x') {
    result = buildPointShiftX(difficulty);
  } else if (kind === 'point-scale-y') {
    result = buildPointScaleY(difficulty);
  } else if (kind === 'point-combined') {
    result = buildPointCombined(difficulty);
  }

  return {
    kind,
    question: result.question,
    answerString: result.answerString,
    answerType: result.answerType || '',
    expectedValue: result.expectedValue ?? null,
    expectedText: result.expectedText || ''
  };
}

function buildTestQuestions(difficulty) {
  const types = QUESTION_TYPES_BY_DIFFICULTY[difficulty] || QUESTION_TYPES_BY_DIFFICULTY[DIFF_EASY];
  const questions = [];
  const used = new Set();
  const poolTarget = TEST_QUESTION_COUNT + Math.min(types.length * 3, 8);

  types.forEach((kind) => {
    let q = null;
    let attempts = 0;
    while (attempts < 30) {
      const candidate = buildQuestion(kind, difficulty);
      const signature = `${kind}:${candidate.question}`;
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
    const signature = `${kind}:${candidate.question}`;
    if (!used.has(signature) && candidate.answerString) {
      used.add(signature);
      questions.push(candidate);
    }
  }

  return shuffle(questions).slice(0, TEST_QUESTION_COUNT);
}

function checkAnswer(userAnswer, question) {
  if (!userAnswer) return false;
  if (question.answerType === 'text') {
    const expectedRaw = question.expectedText || question.answerString || '';
    const actual = normalizeText(userAnswer);
    if (!actual) return false;
    const expected = normalizeText(expectedRaw);
    const aliases = TEXT_ALIASES[expected] || [expected];
    return aliases.includes(actual);
  }

  const parsed = parseAnswer(userAnswer);
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

  showResultPopup(`Eredm\u00e9ny: ${percentage}% - ${feedback}`);

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
  const kinds = QUESTION_TYPES_BY_DIFFICULTY[difficulty] || QUESTION_TYPES_BY_DIFFICULTY[DIFF_EASY];
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
  window.currentPracticeExpected = currentPracticeExpected;
  window.currentPracticeDifficulty = currentPracticeDifficulty;
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
  if (!practiceActive) {
    if (!currentPracticeExpected) return;
    practiceActive = true;
  }
  const isCorrect = checkAnswer(practiceInput.value || '', currentPracticeExpected);
  if (isCorrect) {
    const xpReward = PRACTICE_XP_REWARDS[currentPracticeDifficulty] || 1;
    practiceFeedback.textContent = `Helyes! (+${xpReward} XP)`;
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
    if (activeTab === 'teszt') {
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

if (transBaseSelect) transBaseSelect.addEventListener('change', updateTransformModel);
if (transAInput) transAInput.addEventListener('input', updateTransformModel);
if (transBInput) transBInput.addEventListener('input', updateTransformModel);
if (transHInput) transHInput.addEventListener('input', updateTransformModel);
if (transKInput) transKInput.addEventListener('input', updateTransformModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateTransformModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
