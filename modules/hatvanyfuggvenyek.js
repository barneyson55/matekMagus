const TOPIC_ID = 'hatvanyfuggvenyek';
const TOPIC_NAME = 'Hatv\u00e1nyf\u00fcggv\u00e9nyek';
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
  [DIFF_EASY]: ['value', 'parity'],
  [DIFF_NORMAL]: ['value', 'parity', 'domain', 'range'],
  [DIFF_HARD]: ['value', 'parity', 'domain', 'range', 'zero']
};

const EXPONENT_POOL = {
  [DIFF_EASY]: [2, 3, 4],
  [DIFF_NORMAL]: [2, 3, 4, 5, -1, -2],
  [DIFF_HARD]: [2, 3, 4, 5, -1, -2, -3]
};

const TEXT_ALIASES = {
  paros: ['paros'],
  paratlan: ['paratlan'],
  r: ['r', 'real', 'realis', 'valos', 'valossz', 'valosszamok'],
  r0: ['r\\0', 'r\\{0}', 'r{0}', 'r-0', 'rminus0', 'rnot0', 'rne0'],
  yge0: ['y>=0', 'y>=0', 'y>=0', 'y>=0', 'y>=0', 'y>=0', '0inf', '0,inf', '0inf'],
  yle0: ['y<=0', 'y<=0', '-inf0', '-inf,0', 'inf0'],
  ygt0: ['y>0', '(0,inf)', '0inf'],
  ylt0: ['y<0', '(-inf,0)', '-inf0'],
  y0: ['y=0'],
  zero: ['x=0', 'x0', '0'],
  none: ['nincs', 'nincsen', 'none', 'no']
};

const DOMAIN_LABELS = {
  r: 'R',
  r0: 'R\\{0}'
};

const RANGE_LABELS = {
  r: 'R',
  r0: 'R\\{0}',
  yge0: 'y>=0',
  yle0: 'y<=0',
  ygt0: 'y>0',
  ylt0: 'y<0',
  y0: 'y=0'
};

const PARITY_LABELS = {
  paros: 'P\u00e1ros',
  paratlan: 'P\u00e1ratlan'
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

const powerCoefInput = document.getElementById('power-coef');
const powerExpInput = document.getElementById('power-exp');
const powerXInput = document.getElementById('power-x');
const powerEquation = document.getElementById('power-equation');
const powerDomain = document.getElementById('power-domain');
const powerRange = document.getElementById('power-range');
const powerParity = document.getElementById('power-parity');
const powerMonotonicity = document.getElementById('power-monotonicity');
const powerIntercept = document.getElementById('power-intercept');
const powerAsymptote = document.getElementById('power-asymptote');
const powerValue = document.getElementById('power-value');
const powerNote = document.getElementById('power-note');

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

function normalizeText(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\[\]{}()]/g, '')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u221e/g, 'inf')
    .replace(/[\u00e1\u00e0\u00e2\u00e4]/g, 'a')
    .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, 'e')
    .replace(/[\u00ed\u00ec\u00ee\u00ef]/g, 'i')
    .replace(/[\u00f3\u00f6\u0151\u00f2\u00f4]/g, 'o')
    .replace(/[\u00fa\u00fc\u0171\u00f9\u00fb]/g, 'u')
    .replace(/\\+/g, '\\');
}

function resolveTextKey(raw) {
  const normalized = normalizeText(raw);
  const entries = Object.entries(TEXT_ALIASES);
  for (let i = 0; i < entries.length; i += 1) {
    const [key, values] = entries[i];
    if (values.includes(normalized)) {
      return key;
    }
  }
  return normalized;
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
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  const sign = d < 0 ? -1 : 1;
  const nn = n * sign;
  const dd = Math.abs(d);
  const g = gcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

function formatFraction(n, d) {
  const simplified = simplifyFraction(n, d);
  if (!simplified) return null;
  if (simplified.d === 1) return String(simplified.n);
  return `${simplified.n}/${simplified.d}`;
}

function normalizeNumberInput(value) {
  return value.trim().replace(/\s+/g, '').replace(',', '.');
}

function parseNumberInput(value) {
  const raw = normalizeNumberInput(value);
  if (!raw) return null;
  if (/^-?\d+\/-?\d+$/.test(raw)) {
    const parts = raw.split('/');
    const num = Number(parts[0]);
    const den = Number(parts[1]);
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
  return fixed.replace(/\.?0+$/, '');
}

function formatPowerExpression(a, n) {
  if (n === 0) return String(a);
  const absA = Math.abs(a);
  const sign = a < 0 ? '-' : '';
  const exponentPart = n === 1 ? 'x' : `x^${n}`;
  if (absA === 1) {
    return `${sign}${exponentPart}`;
  }
  return `${sign}${absA}${exponentPart}`;
}

function pickExponent(difficulty) {
  const pool = EXPONENT_POOL[difficulty] || EXPONENT_POOL[DIFF_EASY];
  return pool[randomInt(0, pool.length - 1)];
}

function pickCoefficient(difficulty) {
  const limit = difficulty === DIFF_EASY ? 3 : difficulty === DIFF_NORMAL ? 4 : 5;
  return pickNonZero(-limit, limit);
}

function pickXValue(difficulty, exponent) {
  const limit = difficulty === DIFF_EASY ? 3 : difficulty === DIFF_NORMAL ? 4 : 5;
  let value = randomInt(-limit, limit);
  if (exponent < 0) {
    while (value === 0) {
      value = randomInt(-limit, limit);
    }
  }
  return value;
}

function computePowerValue(a, x, n) {
  if (n >= 0) {
    return { value: a * Math.pow(x, n), answer: null };
  }
  const absN = Math.abs(n);
  const pow = Math.pow(Math.abs(x), absN);
  const sign = x < 0 && absN % 2 === 1 ? -1 : 1;
  const numerator = a * sign;
  const fraction = formatFraction(numerator, pow);
  return { value: numerator / pow, answer: fraction };
}

function rangeKeyFor(a, n) {
  if (a === 0) return 'y0';
  const even = Math.abs(n) % 2 === 0;
  if (n > 0) {
    if (even) return a > 0 ? 'yge0' : 'yle0';
    return 'r';
  }
  if (even) return a > 0 ? 'ygt0' : 'ylt0';
  return 'r0';
}

function monotonicityLabel(a, n) {
  if (n === 0) return 'Konstans';
  const sign = a >= 0 ? 1 : -1;
  const even = Math.abs(n) % 2 === 0;
  if (n > 0) {
    if (even) {
      return sign > 0
        ? 'Cs\u00f6kken\u0151 (-\u221e,0], n\u00f6vekv\u0151 [0,\u221e)'
        : 'N\u00f6vekv\u0151 (-\u221e,0], cs\u00f6kken\u0151 [0,\u221e)';
    }
    return sign > 0 ? 'Szigor\u00faan n\u00f6vekv\u0151' : 'Szigor\u00faan cs\u00f6kken\u0151';
  }
  if (even) {
    return sign > 0
      ? 'N\u00f6vekv\u0151 (-\u221e,0), cs\u00f6kken\u0151 (0,\u221e)'
      : 'Cs\u00f6kken\u0151 (-\u221e,0), n\u00f6vekv\u0151 (0,\u221e)';
  }
  return sign > 0
    ? 'Szigor\u00faan cs\u00f6kken\u0151 mindk\u00e9t \u00e1gon'
    : 'Szigor\u00faan n\u00f6vekv\u0151 mindk\u00e9t \u00e1gon';
}

function buildValueQuestion(difficulty, kind) {
  const exponent = pickExponent(difficulty);
  const coefficient = pickCoefficient(difficulty);
  const xValue = pickXValue(difficulty, exponent);
  const expression = formatPowerExpression(coefficient, exponent);
  const computed = computePowerValue(coefficient, xValue, exponent);
  const answerString = computed.answer || formatNumber(computed.value, 4);
  return {
    kind,
    question: `Sz\u00e1m\u00edtsd ki: f(x) = ${expression}. Mennyi f(${xValue})?`,
    answerString,
    answerType: 'number',
    expectedValue: computed.value,
    signature: `${kind}:${coefficient}:${exponent}:${xValue}`
  };
}

function buildParityQuestion(difficulty, kind) {
  const exponent = pickExponent(difficulty);
  const coefficient = pickCoefficient(difficulty);
  const expression = formatPowerExpression(coefficient, exponent);
  const parityKey = exponent % 2 === 0 ? 'paros' : 'paratlan';
  return {
    kind,
    question: `A f(x) = ${expression} f\u00fcggv\u00e9ny p\u00e1ros vagy p\u00e1ratlan? (p\u00e1ros/p\u00e1ratlan)`,
    answerString: parityKey,
    answerType: 'text',
    expectedKey: parityKey,
    signature: `${kind}:${coefficient}:${exponent}`
  };
}

function buildDomainQuestion(difficulty, kind) {
  const exponent = pickExponent(difficulty);
  const coefficient = pickCoefficient(difficulty);
  const expression = formatPowerExpression(coefficient, exponent);
  const domainKey = exponent < 0 ? 'r0' : 'r';
  return {
    kind,
    question: `Mi az f(x) = ${expression} f\u00fcggv\u00e9ny \u00e9rtelmez\u00e9si tartom\u00e1nya? (R / R\\{0})`,
    answerString: DOMAIN_LABELS[domainKey],
    answerType: 'text',
    expectedKey: domainKey,
    signature: `${kind}:${coefficient}:${exponent}`
  };
}

function buildRangeQuestion(difficulty, kind) {
  const exponent = pickExponent(difficulty);
  const coefficient = pickCoefficient(difficulty);
  const expression = formatPowerExpression(coefficient, exponent);
  const rangeKey = rangeKeyFor(coefficient, exponent);
  return {
    kind,
    question: `Mi az f(x) = ${expression} \u00e9rt\u00e9kk\u00e9szlete? (R / R\\{0} / y>=0 / y<=0 / y>0 / y<0)`,
    answerString: RANGE_LABELS[rangeKey],
    answerType: 'text',
    expectedKey: rangeKey,
    signature: `${kind}:${coefficient}:${exponent}`
  };
}

function buildZeroQuestion(difficulty, kind) {
  const exponent = pickExponent(difficulty);
  const coefficient = pickCoefficient(difficulty);
  const expression = formatPowerExpression(coefficient, exponent);
  const hasZero = exponent > 0;
  return {
    kind,
    question: `Hol van a f(x) = ${expression} f\u00fcggv\u00e9ny z\u00e9rushelye? (x=0 / nincs)`,
    answerString: hasZero ? 'x=0' : 'nincs',
    answerType: 'text',
    expectedKey: hasZero ? 'zero' : 'none',
    signature: `${kind}:${coefficient}:${exponent}`
  };
}

function buildQuestion(kind, difficulty) {
  if (kind === 'value') return buildValueQuestion(difficulty, kind);
  if (kind === 'parity') return buildParityQuestion(difficulty, kind);
  if (kind === 'domain') return buildDomainQuestion(difficulty, kind);
  if (kind === 'range') return buildRangeQuestion(difficulty, kind);
  if (kind === 'zero') return buildZeroQuestion(difficulty, kind);
  return buildValueQuestion(difficulty, 'value');
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
    if (parsed === null || question.expectedValue === null || question.expectedValue === undefined) return false;
    return Math.abs(parsed - question.expectedValue) < 0.001;
  }
  const expectedKey = question.expectedKey;
  if (!expectedKey) return false;
  const userKey = resolveTextKey(userAnswer || '');
  return userKey === expectedKey;
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
    grade: grade,
    percentage: percentage,
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
  return [difficulty, item.kind, item.answerString].join('|');
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

function updatePowerModel() {
  if (!powerCoefInput || !powerExpInput || !powerXInput) return;
  const a = Number.parseFloat(powerCoefInput.value);
  const n = Number.parseInt(powerExpInput.value, 10);
  const x = Number.parseFloat(powerXInput.value);

  if (!Number.isFinite(a) || !Number.isFinite(n) || n === 0 || a === 0) {
    if (powerEquation) powerEquation.textContent = '-';
    if (powerDomain) powerDomain.textContent = '-';
    if (powerRange) powerRange.textContent = '-';
    if (powerParity) powerParity.textContent = '-';
    if (powerMonotonicity) powerMonotonicity.textContent = '-';
    if (powerIntercept) powerIntercept.textContent = '-';
    if (powerAsymptote) powerAsymptote.textContent = '-';
    if (powerValue) powerValue.textContent = '-';
    if (powerNote) {
      powerNote.textContent = 'Adj meg nem nulla eg\u00e9sz kitev\u0151t \u00e9s egy\u00fctthat\u00f3t.';
      powerNote.style.color = '#f04747';
    }
    return;
  }

  const expression = formatPowerExpression(a, n);
  if (powerEquation) powerEquation.textContent = `f(x) = ${expression}`;
  const domainKey = n < 0 ? 'r0' : 'r';
  if (powerDomain) powerDomain.textContent = DOMAIN_LABELS[domainKey];

  const rangeKey = rangeKeyFor(a, n);
  if (powerRange) powerRange.textContent = RANGE_LABELS[rangeKey] || '-';

  const parityKey = n % 2 === 0 ? 'paros' : 'paratlan';
  if (powerParity) powerParity.textContent = PARITY_LABELS[parityKey];

  if (powerMonotonicity) powerMonotonicity.textContent = monotonicityLabel(a, n);

  if (powerIntercept) {
    powerIntercept.textContent = n > 0 ? '(0, 0)' : 'nincs';
  }

  if (powerAsymptote) {
    powerAsymptote.textContent = n < 0 ? 'x = 0, y = 0' : 'nincs';
  }

  if (!Number.isFinite(x)) {
    if (powerValue) powerValue.textContent = '-';
  } else if (n < 0 && x === 0) {
    if (powerValue) powerValue.textContent = 'nincs';
  } else {
    const computed = computePowerValue(a, x, n);
    if (powerValue) powerValue.textContent = formatNumber(computed.value, 4);
  }

  if (powerNote) {
    powerNote.textContent = '';
    powerNote.style.color = '';
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

if (powerCoefInput) powerCoefInput.addEventListener('input', updatePowerModel);
if (powerExpInput) powerExpInput.addEventListener('input', updatePowerModel);
if (powerXInput) powerXInput.addEventListener('input', updatePowerModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updatePowerModel();
announceActiveTab(activeTab);
if (window.parent) {
  window.parent.postMessage({ type: 'request-settings' }, '*');
}
