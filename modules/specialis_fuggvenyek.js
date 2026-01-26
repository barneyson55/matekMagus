const TOPIC_ID = 'specialis_fuggvenyek';
const TOPIC_NAME = 'Abszol\u00fat\u00e9rt\u00e9k, gy\u00f6k fv.';
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
  [DIFF_EASY]: ['abs-value-basic', 'root-value-basic', 'abs-domain-all', 'root-domain-basic'],
  [DIFF_NORMAL]: ['abs-value-shift', 'root-value-shift', 'abs-vertex-x', 'root-start-x', 'abs-range-shift', 'root-range-shift'],
  [DIFF_HARD]: ['abs-range-signed', 'root-range-signed', 'abs-solve-x', 'root-solve-x', 'root-domain-flip']
};

const TEXT_ALIASES = {
  r: ['r', 'real', 'realis', 'valos', 'valosszamok']
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

const absAInput = document.getElementById('abs-a');
const absHInput = document.getElementById('abs-h');
const absKInput = document.getElementById('abs-k');
const absXInput = document.getElementById('abs-x');
const absEquation = document.getElementById('abs-equation');
const absValue = document.getElementById('abs-value');
const absDomain = document.getElementById('abs-domain');
const absRange = document.getElementById('abs-range');
const absAxis = document.getElementById('abs-axis');
const absVertex = document.getElementById('abs-vertex');
const absNote = document.getElementById('abs-note');

const rootAInput = document.getElementById('root-a');
const rootHInput = document.getElementById('root-h');
const rootKInput = document.getElementById('root-k');
const rootXInput = document.getElementById('root-x');
const rootEquation = document.getElementById('root-equation');
const rootValue = document.getElementById('root-value');
const rootDomain = document.getElementById('root-domain');
const rootRange = document.getElementById('root-range');
const rootStart = document.getElementById('root-start');
const rootMonotonicity = document.getElementById('root-monotonicity');
const rootNote = document.getElementById('root-note');

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

function normalizeText(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\u00e1\u00e0\u00e2\u00e4]/g, 'a')
    .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, 'e')
    .replace(/[\u00ed\u00ec\u00ee\u00ef]/g, 'i')
    .replace(/[\u00f3\u00f6\u0151\u00f2\u00f4]/g, 'o')
    .replace(/[\u00fa\u00fc\u0171\u00f9\u00fb]/g, 'u');
}

function resolveTextKey(raw) {
  const normalized = normalizeText(raw);
  const entries = Object.entries(TEXT_ALIASES);
  for (let i = 0; i < entries.length; i += 1) {
    const [key, values] = entries[i];
    if (values.includes(normalized)) return key;
  }
  return normalized;
}

function parseNumberInput(value) {
  const raw = normalizeInput(value);
  if (!raw) return null;
  if (/^-?\d+\/-?\d+$/.test(raw)) {
    const parts = raw.split('/');
    const num = Number.parseFloat(parts[0]);
    const den = Number.parseFloat(parts[1]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return num / den;
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value, precision = 3) {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function formatCoeff(value) {
  if (value === 1) return '';
  if (value === -1) return '-';
  return formatNumber(value);
}

function formatShift(variable, shift) {
  if (shift === 0) return variable;
  const sign = shift > 0 ? '-' : '+';
  const magnitude = formatNumber(Math.abs(shift));
  return `${variable} ${sign} ${magnitude}`;
}

function formatAbsExpression(a, h, k) {
  if (!Number.isFinite(a) || !Number.isFinite(h) || !Number.isFinite(k)) return '-';
  if (a === 0) return formatNumber(k);
  const coeff = formatCoeff(a);
  const inner = formatShift('x', h);
  let expr = `${coeff}|${inner}|`;
  if (k !== 0) {
    expr += ` ${k > 0 ? '+' : '-'} ${formatNumber(Math.abs(k))}`;
  }
  return expr;
}

function formatRootExpression(a, h, k) {
  if (!Number.isFinite(a) || !Number.isFinite(h) || !Number.isFinite(k)) return '-';
  if (a === 0) return formatNumber(k);
  const coeff = formatCoeff(a);
  const inner = formatShift('x', h);
  let expr = `${coeff}sqrt(${inner})`;
  if (k !== 0) {
    expr += ` ${k > 0 ? '+' : '-'} ${formatNumber(Math.abs(k))}`;
  }
  return expr;
}

function formatInequality(variable, op, value) {
  return `${variable}${op}${formatNumber(value)}`;
}

function normalizeInequalityInput(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u221e/g, 'inf')
    .replace(/\u2208/g, 'in');
}

function parseInterval(text, defaultVar) {
  if (!text) return null;
  let varName = defaultVar || 'x';
  let cleaned = text;
  if (cleaned.startsWith('x') || cleaned.startsWith('y')) {
    varName = cleaned[0];
    cleaned = cleaned.slice(1);
    if (cleaned.startsWith('in')) cleaned = cleaned.slice(2);
  }
  if (!(cleaned.startsWith('[') || cleaned.startsWith('('))) return null;
  if (!(cleaned.endsWith(']') || cleaned.endsWith(')'))) return null;

  const left = cleaned[0];
  const right = cleaned[cleaned.length - 1];
  const body = cleaned.slice(1, -1);
  const parts = body.split(',');
  if (parts.length !== 2) return null;
  const low = parts[0];
  const high = parts[1];

  if (high === 'inf' || high === '+inf') {
    const value = Number.parseFloat(low);
    if (!Number.isFinite(value)) return null;
    const op = left === '[' ? '>=' : '>';
    return { var: varName, op, value };
  }

  if (low === '-inf') {
    const value = Number.parseFloat(high);
    if (!Number.isFinite(value)) return null;
    const op = right === ']' ? '<=' : '<';
    return { var: varName, op, value };
  }

  return null;
}

function parseInequality(raw, defaultVar) {
  const normalized = normalizeInequalityInput(raw);
  if (!normalized) return null;

  const direct = normalized.match(/^(x|y)(>=|<=|>|<)(-?\d+(?:\.\d+)?)/);
  if (direct) {
    return {
      var: direct[1],
      op: direct[2],
      value: Number.parseFloat(direct[3])
    };
  }

  const bare = normalized.match(/^(>=|<=|>|<)(-?\d+(?:\.\d+)?)/);
  if (bare) {
    return {
      var: defaultVar || 'x',
      op: bare[1],
      value: Number.parseFloat(bare[2])
    };
  }

  const interval = parseInterval(normalized, defaultVar);
  if (interval) return interval;

  return null;
}

function rangeLabelFor(a, k) {
  if (a > 0) return { op: '>=', label: `y >= ${formatNumber(k)}` };
  if (a < 0) return { op: '<=', label: `y <= ${formatNumber(k)}` };
  return { op: '=', label: `y = ${formatNumber(k)}` };
}

function monotonicityLabel(a) {
  if (a > 0) return 'N\u00f6vekv\u0151';
  if (a < 0) return 'Cs\u00f6kken\u0151';
  return 'Konstans';
}

function buildAbsValueBasic() {
  const x = randomInt(-9, 9);
  const value = Math.abs(x);
  return {
    kind: 'abs-value-basic',
    question: `Sz\u00e1m\u00edtsd ki: f(x) = |x|, ha x = ${x}.`,
    answerString: formatNumber(value),
    answerType: 'number',
    expectedValue: value,
    signature: `abs-value-basic:${x}`
  };
}

function buildRootValueBasic() {
  const t = randomInt(0, 9);
  const x = t * t;
  return {
    kind: 'root-value-basic',
    question: `Sz\u00e1m\u00edtsd ki: f(x) = sqrt(x), ha x = ${x}.`,
    answerString: formatNumber(t),
    answerType: 'number',
    expectedValue: t,
    signature: `root-value-basic:${x}`
  };
}

function buildAbsDomainAll() {
  return {
    kind: 'abs-domain-all',
    question: 'Add meg az f(x) = |x| f\u00fcggv\u00e9ny tartom\u00e1ny\u00e1t.',
    answerString: 'R',
    answerType: 'text',
    expectedKey: 'r',
    signature: 'abs-domain-all'
  };
}

function buildRootDomainBasic() {
  return {
    kind: 'root-domain-basic',
    question: 'Add meg az f(x) = sqrt(x) f\u00fcggv\u00e9ny tartom\u00e1ny\u00e1t.',
    answerString: 'x>=0',
    answerType: 'inequality',
    expectedVar: 'x',
    expectedOp: '>=',
    expectedValue: 0,
    signature: 'root-domain-basic'
  };
}

function buildAbsValueShift() {
  const a = randomInt(1, 3);
  const h = randomInt(-4, 4);
  const k = randomInt(-3, 3);
  const x = randomInt(-6, 6);
  const value = a * Math.abs(x - h) + k;
  const expr = formatAbsExpression(a, h, k);
  return {
    kind: 'abs-value-shift',
    question: `Sz\u00e1m\u00edtsd ki: f(x) = ${expr}, ha x = ${x}.`,
    answerString: formatNumber(value),
    answerType: 'number',
    expectedValue: value,
    signature: `abs-value-shift:${a}:${h}:${k}:${x}`
  };
}

function buildRootValueShift() {
  const a = randomInt(1, 2);
  const h = randomInt(-4, 4);
  const k = randomInt(-3, 3);
  const t = randomInt(0, 5);
  const x = h + t * t;
  const value = a * t + k;
  const expr = formatRootExpression(a, h, k);
  return {
    kind: 'root-value-shift',
    question: `Sz\u00e1m\u00edtsd ki: f(x) = ${expr}, ha x = ${x}.`,
    answerString: formatNumber(value),
    answerType: 'number',
    expectedValue: value,
    signature: `root-value-shift:${a}:${h}:${k}:${x}`
  };
}

function buildAbsVertexX() {
  const a = randomInt(1, 3);
  const h = randomInt(-5, 5);
  const k = randomInt(-4, 4);
  const expr = formatAbsExpression(a, h, k);
  return {
    kind: 'abs-vertex-x',
    question: `Az f(x) = ${expr} f\u00fcggv\u00e9ny cs\u00facs\u00e1nak x-koordin\u00e1t\u00e1ja?`,
    answerString: formatNumber(h),
    answerType: 'number',
    expectedValue: h,
    signature: `abs-vertex-x:${a}:${h}:${k}`
  };
}

function buildRootStartX() {
  const a = randomInt(1, 3);
  const h = randomInt(-4, 4);
  const k = randomInt(-3, 3);
  const expr = formatRootExpression(a, h, k);
  return {
    kind: 'root-start-x',
    question: `Add meg a gy\u00f6k f\u00fcggv\u00e9ny kezd\u0151pontj\u00e1nak x-koordin\u00e1t\u00e1j\u00e1t: f(x) = ${expr}.`,
    answerString: formatNumber(h),
    answerType: 'number',
    expectedValue: h,
    signature: `root-start-x:${a}:${h}:${k}`
  };
}

function buildAbsRangeShift() {
  const a = randomInt(1, 3);
  const h = randomInt(-4, 4);
  const k = randomInt(-5, 5);
  const expr = formatAbsExpression(a, h, k);
  return {
    kind: 'abs-range-shift',
    question: `Add meg az f(x) = ${expr} f\u00fcggv\u00e9ny \u00e9rt\u00e9kk\u00e9szlet\u00e9t.`,
    answerString: formatInequality('y', '>=', k),
    answerType: 'inequality',
    expectedVar: 'y',
    expectedOp: '>=',
    expectedValue: k,
    signature: `abs-range-shift:${a}:${h}:${k}`
  };
}

function buildRootRangeShift() {
  const a = randomInt(1, 3);
  const h = randomInt(-4, 4);
  const k = randomInt(-5, 5);
  const expr = formatRootExpression(a, h, k);
  return {
    kind: 'root-range-shift',
    question: `Add meg az f(x) = ${expr} f\u00fcggv\u00e9ny \u00e9rt\u00e9kk\u00e9szlet\u00e9t.`,
    answerString: formatInequality('y', '>=', k),
    answerType: 'inequality',
    expectedVar: 'y',
    expectedOp: '>=',
    expectedValue: k,
    signature: `root-range-shift:${a}:${h}:${k}`
  };
}

function buildAbsRangeSigned() {
  const a = -randomInt(1, 3);
  const h = randomInt(-4, 4);
  const k = randomInt(-5, 5);
  const expr = formatAbsExpression(a, h, k);
  return {
    kind: 'abs-range-signed',
    question: `Add meg az f(x) = ${expr} f\u00fcggv\u00e9ny \u00e9rt\u00e9kk\u00e9szlet\u00e9t.`,
    answerString: formatInequality('y', '<=', k),
    answerType: 'inequality',
    expectedVar: 'y',
    expectedOp: '<=',
    expectedValue: k,
    signature: `abs-range-signed:${a}:${h}:${k}`
  };
}

function buildRootRangeSigned() {
  const a = -randomInt(1, 3);
  const h = randomInt(-4, 4);
  const k = randomInt(-5, 5);
  const expr = formatRootExpression(a, h, k);
  return {
    kind: 'root-range-signed',
    question: `Add meg az f(x) = ${expr} f\u00fcggv\u00e9ny \u00e9rt\u00e9kk\u00e9szlet\u00e9t.`,
    answerString: formatInequality('y', '<=', k),
    answerType: 'inequality',
    expectedVar: 'y',
    expectedOp: '<=',
    expectedValue: k,
    signature: `root-range-signed:${a}:${h}:${k}`
  };
}

function buildAbsSolveX() {
  const a = randomInt(1, 3);
  const h = randomInt(-5, 5);
  const k = randomInt(-4, 4);
  const m = randomInt(1, 5);
  const y = a * m + k;
  const expr = formatAbsExpression(a, h, k);
  const solution = h - m;
  return {
    kind: 'abs-solve-x',
    question: `Oldd meg: ${expr} = ${formatNumber(y)}. Add meg a kisebbik x \u00e9rt\u00e9ket.`,
    answerString: formatNumber(solution),
    answerType: 'number',
    expectedValue: solution,
    signature: `abs-solve-x:${a}:${h}:${k}:${m}`
  };
}

function buildRootSolveX() {
  const a = randomInt(1, 3);
  const h = randomInt(-4, 4);
  const k = randomInt(-3, 3);
  const t = randomInt(1, 5);
  const y = a * t + k;
  const x = h + t * t;
  const expr = formatRootExpression(a, h, k);
  return {
    kind: 'root-solve-x',
    question: `Oldd meg: ${expr} = ${formatNumber(y)}. Add meg x \u00e9rt\u00e9k\u00e9t.`,
    answerString: formatNumber(x),
    answerType: 'number',
    expectedValue: x,
    signature: `root-solve-x:${a}:${h}:${k}:${t}`
  };
}

function buildRootDomainFlip() {
  const h = randomInt(2, 8);
  const expr = `sqrt(${h} - x)`;
  return {
    kind: 'root-domain-flip',
    question: `Add meg a tartom\u00e1nyt: f(x) = ${expr}.`,
    answerString: formatInequality('x', '<=', h),
    answerType: 'inequality',
    expectedVar: 'x',
    expectedOp: '<=',
    expectedValue: h,
    signature: `root-domain-flip:${h}`
  };
}

function buildQuestion(kind, difficulty) {
  if (kind === 'abs-value-basic') return buildAbsValueBasic();
  if (kind === 'root-value-basic') return buildRootValueBasic();
  if (kind === 'abs-domain-all') return buildAbsDomainAll();
  if (kind === 'root-domain-basic') return buildRootDomainBasic();
  if (kind === 'abs-value-shift') return buildAbsValueShift();
  if (kind === 'root-value-shift') return buildRootValueShift();
  if (kind === 'abs-vertex-x') return buildAbsVertexX();
  if (kind === 'root-start-x') return buildRootStartX();
  if (kind === 'abs-range-shift') return buildAbsRangeShift();
  if (kind === 'root-range-shift') return buildRootRangeShift();
  if (kind === 'abs-range-signed') return buildAbsRangeSigned();
  if (kind === 'root-range-signed') return buildRootRangeSigned();
  if (kind === 'abs-solve-x') return buildAbsSolveX();
  if (kind === 'root-solve-x') return buildRootSolveX();
  if (kind === 'root-domain-flip') return buildRootDomainFlip();
  return buildAbsValueBasic();
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
      const signature = candidate.signature || `${kind}:${candidate.question}`;
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
    const signature = candidate.signature || `${kind}:${candidate.question}`;
    if (!used.has(signature) && candidate.answerString) {
      used.add(signature);
      questions.push(candidate);
    }
  }

  return shuffle(questions).slice(0, TEST_QUESTION_COUNT);
}

function checkAnswer(answerType, userAnswer, question) {
  if (!question) return false;
  if (answerType === 'number') {
    const parsed = parseNumberInput(userAnswer || '');
    if (parsed === null || !Number.isFinite(question.expectedValue)) return false;
    return Math.abs(parsed - question.expectedValue) < 0.01;
  }
  if (answerType === 'inequality') {
    const parsed = parseInequality(userAnswer || '', question.expectedVar);
    if (!parsed || !Number.isFinite(parsed.value)) return false;
    if (question.expectedVar && parsed.var && parsed.var !== question.expectedVar) return false;
    if (parsed.op !== question.expectedOp) return false;
    return Math.abs(parsed.value - question.expectedValue) < 0.01;
  }
  if (answerType === 'text') {
    const expectedKey = question.expectedKey;
    if (!expectedKey) return false;
    const userKey = resolveTextKey(userAnswer || '');
    return userKey === expectedKey;
  }
  return false;
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
  if (!resultPopup) return;
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
    const isCorrect = checkAnswer(q.answerType, q.userAnswer || '', q);
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
  const isCorrect = checkAnswer(currentPracticeExpected.answerType, practiceInput.value || '', currentPracticeExpected);
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

function updateAbsModel() {
  if (!absAInput || !absHInput || !absKInput || !absXInput) return;
  const a = parseNumberInput(absAInput.value || '');
  const h = parseNumberInput(absHInput.value || '');
  const k = parseNumberInput(absKInput.value || '');
  const x = parseNumberInput(absXInput.value || '');

  if (a === null || h === null || k === null || x === null) {
    if (absEquation) absEquation.textContent = '-';
    if (absValue) absValue.textContent = '-';
    if (absDomain) absDomain.textContent = '-';
    if (absRange) absRange.textContent = '-';
    if (absAxis) absAxis.textContent = '-';
    if (absVertex) absVertex.textContent = '-';
    if (absNote) {
      absNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
      absNote.style.color = '#f04747';
    }
    return;
  }

  const expression = formatAbsExpression(a, h, k);
  if (absEquation) absEquation.textContent = `f(x) = ${expression}`;
  if (absDomain) absDomain.textContent = 'R';
  const range = rangeLabelFor(a, k);
  if (absRange) absRange.textContent = range.label;
  if (absAxis) absAxis.textContent = `x = ${formatNumber(h)}`;
  if (absVertex) absVertex.textContent = `(${formatNumber(h)}, ${formatNumber(k)})`;
  if (absValue) {
    const value = a * Math.abs(x - h) + k;
    absValue.textContent = formatNumber(value);
  }

  if (absNote) {
    absNote.textContent = a === 0
      ? 'a = 0 eset\u00e9n konstans f\u00fcggv\u00e9nyt kapsz.'
      : '';
    absNote.style.color = a === 0 ? '#f39c12' : '';
  }
}

function updateRootModel() {
  if (!rootAInput || !rootHInput || !rootKInput || !rootXInput) return;
  const a = parseNumberInput(rootAInput.value || '');
  const h = parseNumberInput(rootHInput.value || '');
  const k = parseNumberInput(rootKInput.value || '');
  const x = parseNumberInput(rootXInput.value || '');

  if (a === null || h === null || k === null || x === null) {
    if (rootEquation) rootEquation.textContent = '-';
    if (rootValue) rootValue.textContent = '-';
    if (rootDomain) rootDomain.textContent = '-';
    if (rootRange) rootRange.textContent = '-';
    if (rootStart) rootStart.textContent = '-';
    if (rootMonotonicity) rootMonotonicity.textContent = '-';
    if (rootNote) {
      rootNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
      rootNote.style.color = '#f04747';
    }
    return;
  }

  const expression = formatRootExpression(a, h, k);
  if (rootEquation) rootEquation.textContent = `f(x) = ${expression}`;
  if (rootDomain) rootDomain.textContent = `x >= ${formatNumber(h)}`;
  const range = rangeLabelFor(a, k);
  if (rootRange) rootRange.textContent = range.label;
  if (rootStart) rootStart.textContent = `(${formatNumber(h)}, ${formatNumber(k)})`;
  if (rootMonotonicity) rootMonotonicity.textContent = monotonicityLabel(a);

  if (x < h) {
    if (rootValue) rootValue.textContent = '-';
    if (rootNote) {
      rootNote.textContent = 'Az x legyen legal\u00e1bb h.';
      rootNote.style.color = '#f04747';
    }
    return;
  }

  const value = a * Math.sqrt(x - h) + k;
  if (rootValue) rootValue.textContent = formatNumber(value);
  if (rootNote) {
    rootNote.textContent = a === 0
      ? 'a = 0 eset\u00e9n konstans f\u00fcggv\u00e9ny.'
      : '';
    rootNote.style.color = a === 0 ? '#f39c12' : '';
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
if (testStartBtn) {
  testStartBtn.addEventListener('click', () => {
    startTest();
  });
}
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

if (absAInput) absAInput.addEventListener('input', updateAbsModel);
if (absHInput) absHInput.addEventListener('input', updateAbsModel);
if (absKInput) absKInput.addEventListener('input', updateAbsModel);
if (absXInput) absXInput.addEventListener('input', updateAbsModel);

if (rootAInput) rootAInput.addEventListener('input', updateRootModel);
if (rootHInput) rootHInput.addEventListener('input', updateRootModel);
if (rootKInput) rootKInput.addEventListener('input', updateRootModel);
if (rootXInput) rootXInput.addEventListener('input', updateRootModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateAbsModel();
updateRootModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
