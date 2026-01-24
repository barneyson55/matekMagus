const TOPIC_ID = 'exp_log_fuggveny';
const TOPIC_NAME = 'Exponenci\u00e1lis \u00e9s logaritmus f\u00fcggv\u00e9nyek';
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
  [DIFF_EASY]: ['exp-value', 'log-value', 'exp-at-zero', 'log-at-one'],
  [DIFF_NORMAL]: ['exp-value', 'log-value', 'exp-eq', 'log-eq', 'monotonicity', 'domain-range'],
  [DIFF_HARD]: ['exp-value', 'log-value', 'exp-eq', 'log-eq', 'monotonicity', 'domain-range', 'asymptote', 'inverse']
};

const TEXT_ALIASES = {
  inc: ['novegvo', 'novekvo', 'novevo', 'novekvo'],
  dec: ['csokkeno', 'csokken'],
  r: ['r', 'valos', 'valosszamok', 'real'],
  pos: ['y>0', 'x>0', '0inf', '0,inf', '0inf', 'pozitiv', 'rplus', 'r+'],
  x0: ['x=0', 'x0'],
  y0: ['y=0', 'y0']
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

const expBaseInput = document.getElementById('exp-base');
const expXInput = document.getElementById('exp-x');
const expEquation = document.getElementById('exp-equation');
const expValue = document.getElementById('exp-value');
const expDomain = document.getElementById('exp-domain');
const expRange = document.getElementById('exp-range');
const expMonotonicity = document.getElementById('exp-monotonicity');
const expAsymptote = document.getElementById('exp-asymptote');
const expIntercept = document.getElementById('exp-intercept');
const expNote = document.getElementById('exp-note');

const logBaseInput = document.getElementById('log-base');
const logXInput = document.getElementById('log-x');
const logEquation = document.getElementById('log-equation');
const logValue = document.getElementById('log-value');
const logDomain = document.getElementById('log-domain');
const logRange = document.getElementById('log-range');
const logMonotonicity = document.getElementById('log-monotonicity');
const logAsymptote = document.getElementById('log-asymptote');
const logIntercept = document.getElementById('log-intercept');
const logCheck = document.getElementById('log-check');
const logNote = document.getElementById('log-note');

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
const PRACTICE_HISTORY_LIMIT = 8;
const PRACTICE_RETRY_LIMIT = 16;
const practiceHistory = [];

const BASE_POOL = {
  [DIFF_EASY]: [2, 3, 4, 5],
  [DIFF_NORMAL]: [2, 3, 4, 5, 6],
  [DIFF_HARD]: [2, 3, 4, 5, 6, 7]
};

const FRACTION_BASES = [
  { numerator: 1, denominator: 2, value: 0.5, label: '1/2' },
  { numerator: 1, denominator: 3, value: 1 / 3, label: '1/3' },
  { numerator: 1, denominator: 4, value: 0.25, label: '1/4' }
];

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

function normalizeText(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\[\]{}()]/g, '')
    .replace(/,/g, '')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u221e/g, 'inf')
    .replace(/\u211d/g, 'r')
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

function formatNumber(value, precision = 4) {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
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

function makeBase(n) {
  return { numerator: n, denominator: 1, value: n, label: String(n) };
}

function pickBase(difficulty) {
  const pool = BASE_POOL[difficulty] || BASE_POOL[DIFF_EASY];
  const base = pool[randomInt(0, pool.length - 1)];
  return makeBase(base);
}

function pickMonotonicBase(difficulty) {
  if (difficulty === DIFF_EASY) {
    return pickBase(difficulty);
  }
  const useFraction = Math.random() < 0.45;
  if (useFraction) {
    const fraction = FRACTION_BASES[randomInt(0, FRACTION_BASES.length - 1)];
    return { ...fraction };
  }
  return pickBase(difficulty);
}

function powerRational(base, exp) {
  if (exp === 0) return { numerator: 1, denominator: 1, value: 1 };
  const absExp = Math.abs(exp);
  let numPow = Math.pow(base.numerator, absExp);
  let denPow = Math.pow(base.denominator, absExp);
  if (exp < 0) {
    const temp = numPow;
    numPow = denPow;
    denPow = temp;
  }
  const simplified = simplifyFraction(numPow, denPow) || { n: numPow, d: denPow };
  return { numerator: simplified.n, denominator: simplified.d, value: simplified.n / simplified.d };
}

function formatRational(value) {
  if (!value) return '-';
  return formatFraction(value.numerator, value.denominator) || '-';
}

function pickExpExponent(difficulty) {
  if (difficulty === DIFF_EASY) return randomInt(1, 3);
  if (difficulty === DIFF_NORMAL) return randomInt(0, 4);
  let exp = randomInt(-3, 5);
  if (exp === 0) exp = 1;
  return exp;
}

function pickLogExponent(difficulty) {
  if (difficulty === DIFF_EASY) return randomInt(1, 3);
  if (difficulty === DIFF_NORMAL) return randomInt(-2, 4);
  return randomInt(-3, 5);
}

function buildExpValueQuestion(difficulty) {
  const base = pickBase(difficulty);
  const xValue = pickExpExponent(difficulty);
  const power = powerRational(base, xValue);
  return {
    kind: 'exp-value',
    question: `Sz\u00e1m\u00edtsd ki: f(x) = ${base.label}^x. Mennyi f(${xValue})?`,
    answerString: formatRational(power),
    answerType: 'number',
    expectedValue: power.value,
    signature: `exp-value:${base.label}:${xValue}`
  };
}

function buildLogValueQuestion(difficulty) {
  const base = pickBase(difficulty);
  const exp = pickLogExponent(difficulty);
  const power = powerRational(base, exp);
  return {
    kind: 'log-value',
    question: `Sz\u00e1m\u00edtsd ki: log_${base.label}(${formatRational(power)}).`,
    answerString: String(exp),
    answerType: 'number',
    expectedValue: exp,
    signature: `log-value:${base.label}:${exp}`
  };
}

function buildExpEquationQuestion(difficulty) {
  const base = pickBase(difficulty);
  const exp = pickLogExponent(difficulty);
  const power = powerRational(base, exp);
  return {
    kind: 'exp-eq',
    question: `Oldd meg: ${base.label}^x = ${formatRational(power)}. Mennyi x?`,
    answerString: String(exp),
    answerType: 'number',
    expectedValue: exp,
    signature: `exp-eq:${base.label}:${exp}`
  };
}

function buildLogEquationQuestion(difficulty) {
  const base = pickBase(difficulty);
  const exp = pickExpExponent(difficulty);
  const power = powerRational(base, exp);
  return {
    kind: 'log-eq',
    question: `Ha log_${base.label} b = ${exp}, add meg b-t.`,
    answerString: formatRational(power),
    answerType: 'number',
    expectedValue: power.value,
    signature: `log-eq:${base.label}:${exp}`
  };
}

function buildExpAtZeroQuestion() {
  return {
    kind: 'exp-at-zero',
    question: 'Mennyi f(0), ha f(x) = a^x?',
    answerString: '1',
    answerType: 'number',
    expectedValue: 1,
    signature: 'exp-at-zero'
  };
}

function buildLogAtOneQuestion() {
  return {
    kind: 'log-at-one',
    question: 'Mennyi f(1), ha f(x) = log_a x?',
    answerString: '0',
    answerType: 'number',
    expectedValue: 0,
    signature: 'log-at-one'
  };
}

function buildMonotonicityQuestion(difficulty) {
  const base = pickMonotonicBase(difficulty);
  const isIncreasing = base.value > 1;
  const expectedKey = isIncreasing ? 'inc' : 'dec';
  const answerString = isIncreasing ? 'n\u00f6vekv\u0151' : 'cs\u00f6kken\u0151';
  const functionKind = Math.random() < 0.5 ? 'exp' : 'log';
  const expression = functionKind === 'exp'
    ? `f(x) = ${base.label}^x`
    : `f(x) = log_${base.label} x`;
  return {
    kind: 'monotonicity',
    question: `A ${expression} f\u00fcggv\u00e9ny monotonit\u00e1sa? (n\u00f6vekv\u0151/cs\u00f6kken\u0151)`,
    answerString,
    answerType: 'text',
    expectedKey,
    signature: `monotonicity:${functionKind}:${base.label}`
  };
}

function buildDomainRangeQuestion() {
  const isExp = Math.random() < 0.5;
  const askDomain = Math.random() < 0.5;
  let expectedKey = '';
  let answerString = '';
  let question = '';

  if (isExp) {
    if (askDomain) {
      expectedKey = 'r';
      answerString = 'R';
      question = 'Mi az f(x) = a^x f\u00fcggv\u00e9ny \u00e9rtelmez\u00e9si tartom\u00e1nya? (R)';
    } else {
      expectedKey = 'pos';
      answerString = 'y>0';
      question = 'Mi az f(x) = a^x f\u00fcggv\u00e9ny \u00e9rt\u00e9kk\u00e9szlete? (y>0)';
    }
  } else {
    if (askDomain) {
      expectedKey = 'pos';
      answerString = 'x>0';
      question = 'Mi az f(x) = log_a x f\u00fcggv\u00e9ny \u00e9rtelmez\u00e9si tartom\u00e1nya? (x>0)';
    } else {
      expectedKey = 'r';
      answerString = 'R';
      question = 'Mi az f(x) = log_a x f\u00fcggv\u00e9ny \u00e9rt\u00e9kk\u00e9szlete? (R)';
    }
  }

  return {
    kind: 'domain-range',
    question,
    answerString,
    answerType: 'text',
    expectedKey,
    signature: `domain-range:${isExp ? 'exp' : 'log'}:${askDomain ? 'domain' : 'range'}`
  };
}

function buildAsymptoteQuestion() {
  const isExp = Math.random() < 0.5;
  if (isExp) {
    return {
      kind: 'asymptote',
      question: 'Melyik az f(x) = a^x f\u00fcggv\u00e9ny v\u00edzszintes aszimpt\u00f3t\u00e1ja? (y=0)',
      answerString: 'y=0',
      answerType: 'text',
      expectedKey: 'y0',
      signature: 'asymptote:exp'
    };
  }
  return {
    kind: 'asymptote',
    question: 'Melyik az f(x) = log_a x f\u00fcggv\u00e9ny f\u00fcgg\u0151leges aszimpt\u00f3t\u00e1ja? (x=0)',
    answerString: 'x=0',
    answerType: 'text',
    expectedKey: 'x0',
    signature: 'asymptote:log'
  };
}

function buildInverseQuestion(difficulty) {
  const base = pickBase(difficulty);
  if (Math.random() < 0.5) {
    const exp = pickExpExponent(difficulty);
    return {
      kind: 'inverse',
      question: `Sz\u00e1m\u00edtsd ki: log_${base.label}(${base.label}^${exp}).`,
      answerString: String(exp),
      answerType: 'number',
      expectedValue: exp,
      signature: `inverse-log:${base.label}:${exp}`
    };
  }
  const value = randomInt(2, 9);
  return {
    kind: 'inverse',
    question: `Sz\u00e1m\u00edtsd ki: ${base.label}^{log_${base.label}(${value})}.`,
    answerString: String(value),
    answerType: 'number',
    expectedValue: value,
    signature: `inverse-exp:${base.label}:${value}`
  };
}

function buildQuestion(kind, difficulty) {
  if (kind === 'exp-value') return buildExpValueQuestion(difficulty);
  if (kind === 'log-value') return buildLogValueQuestion(difficulty);
  if (kind === 'exp-eq') return buildExpEquationQuestion(difficulty);
  if (kind === 'log-eq') return buildLogEquationQuestion(difficulty);
  if (kind === 'exp-at-zero') return buildExpAtZeroQuestion();
  if (kind === 'log-at-one') return buildLogAtOneQuestion();
  if (kind === 'monotonicity') return buildMonotonicityQuestion(difficulty);
  if (kind === 'domain-range') return buildDomainRangeQuestion();
  if (kind === 'asymptote') return buildAsymptoteQuestion();
  if (kind === 'inverse') return buildInverseQuestion(difficulty);
  return buildExpValueQuestion(difficulty);
}

function buildTestQuestions(difficulty) {
  const types = QUESTION_TYPES_BY_DIFFICULTY[difficulty] || QUESTION_TYPES_BY_DIFFICULTY[DIFF_EASY];
  const questions = [];
  const used = new Set();

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

  while (questions.length < TEST_QUESTION_COUNT) {
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

function updateExpModel() {
  if (!expBaseInput || !expXInput) return;
  const base = Number.parseFloat(expBaseInput.value);
  const xValue = Number.parseFloat(expXInput.value);

  if (!Number.isFinite(base) || !Number.isFinite(xValue) || base <= 0 || base === 1) {
    if (expEquation) expEquation.textContent = '-';
    if (expValue) expValue.textContent = '-';
    if (expDomain) expDomain.textContent = '-';
    if (expRange) expRange.textContent = '-';
    if (expMonotonicity) expMonotonicity.textContent = '-';
    if (expAsymptote) expAsymptote.textContent = '-';
    if (expIntercept) expIntercept.textContent = '-';
    if (expNote) {
      expNote.textContent = 'Adj meg 0-n\u00e1l nagyobb, 1-t\u0151l k\u00fcl\u00f6nb\u00f6z\u0151 alapot.';
      expNote.style.color = '#f04747';
    }
    return;
  }

  const baseLabel = formatNumber(base, 3);
  const value = Math.pow(base, xValue);

  if (expEquation) expEquation.textContent = `f(x) = ${baseLabel}^x`;
  if (expValue) expValue.textContent = formatNumber(value, 4);
  if (expDomain) expDomain.textContent = 'R';
  if (expRange) expRange.textContent = 'y>0';
  if (expMonotonicity) expMonotonicity.textContent = base > 1 ? 'N\u00f6vekv\u0151' : 'Cs\u00f6kken\u0151';
  if (expAsymptote) expAsymptote.textContent = 'y = 0';
  if (expIntercept) expIntercept.textContent = 'f(0) = 1';
  if (expNote) {
    expNote.textContent = '';
    expNote.style.color = '';
  }
}

function updateLogModel() {
  if (!logBaseInput || !logXInput) return;
  const base = Number.parseFloat(logBaseInput.value);
  const xValue = Number.parseFloat(logXInput.value);

  if (!Number.isFinite(base) || !Number.isFinite(xValue) || base <= 0 || base === 1 || xValue <= 0) {
    if (logEquation) logEquation.textContent = '-';
    if (logValue) logValue.textContent = '-';
    if (logDomain) logDomain.textContent = '-';
    if (logRange) logRange.textContent = '-';
    if (logMonotonicity) logMonotonicity.textContent = '-';
    if (logAsymptote) logAsymptote.textContent = '-';
    if (logIntercept) logIntercept.textContent = '-';
    if (logCheck) logCheck.textContent = '-';
    if (logNote) {
      logNote.textContent = 'Adj meg helyes alapot (a>0, a\u22601) \u00e9s pozit\u00edv x-et.';
      logNote.style.color = '#f04747';
    }
    return;
  }

  const logResult = Math.log(xValue) / Math.log(base);
  const baseLabel = formatNumber(base, 3);
  const displayValue = formatNumber(logResult, 4);
  if (logEquation) logEquation.textContent = `f(x) = log_${baseLabel} x`;
  if (logValue) logValue.textContent = displayValue;
  if (logDomain) logDomain.textContent = 'x>0';
  if (logRange) logRange.textContent = 'R';
  if (logMonotonicity) logMonotonicity.textContent = base > 1 ? 'N\u00f6vekv\u0151' : 'Cs\u00f6kken\u0151';
  if (logAsymptote) logAsymptote.textContent = 'x = 0';
  if (logIntercept) logIntercept.textContent = 'f(1) = 0';
  if (logCheck) logCheck.textContent = `${baseLabel}^${displayValue} = ${formatNumber(xValue, 4)}`;
  if (logNote) {
    logNote.textContent = '';
    logNote.style.color = '';
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
      practiceFeedback.textContent = 'V\u00e1lassz legal\u00e1bb egy neh\u00e9zs\u00e9get.';
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

if (expBaseInput) expBaseInput.addEventListener('input', updateExpModel);
if (expXInput) expXInput.addEventListener('input', updateExpModel);
if (logBaseInput) logBaseInput.addEventListener('input', updateLogModel);
if (logXInput) logXInput.addEventListener('input', updateLogModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateExpModel();
updateLogModel();
announceActiveTab(activeTab);
if (window.parent) {
  window.parent.postMessage({ type: 'request-settings' }, '*');
}
