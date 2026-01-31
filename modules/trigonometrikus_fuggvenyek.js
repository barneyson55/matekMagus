const TOPIC_ID = 'trigonometrikus_fuggvenyek';
const TOPIC_NAME = 'Trigonometrikus f\u00fcggv\u00e9nyek';
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
  [DIFF_EASY]: ['value-basic', 'parity', 'range-sincos', 'period-basic'],
  [DIFF_NORMAL]: ['value-basic', 'value-special', 'period-basic', 'amplitude', 'range-sincos'],
  [DIFF_HARD]: ['value-special', 'tan-value', 'tan-undefined', 'period-scaled', 'range-tan', 'amplitude', 'parity']
};

const TEXT_ALIASES = {
  paros: ['paros', 'even'],
  paratlan: ['paratlan', 'odd'],
  range: ['-1,1', '-1..1', '-1;1'],
  r: ['r', 'real', 'valos', 'valosszamok', 'inf', '-inf,inf'],
  undefined: ['nemertelmezheto', 'nemdefinialt', 'nincs', 'undef', 'undefined']
};

const BASIC_ANGLES = [0, 90, 180, 270, 360];
const SPECIAL_ANGLES = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];
const TAN_ANGLES = [0, 30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];
const TAN_UNDEFINED_ANGLES = [90, 270];

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

const scFunctionInput = document.getElementById('sc-function');
const scAmplitudeInput = document.getElementById('sc-amplitude');
const scAngleInput = document.getElementById('sc-angle');
const scEquation = document.getElementById('sc-equation');
const scValue = document.getElementById('sc-value');
const scRange = document.getElementById('sc-range');
const scPeriod = document.getElementById('sc-period');
const scParity = document.getElementById('sc-parity');
const scNote = document.getElementById('sc-note');

const tanAmplitudeInput = document.getElementById('tan-amplitude');
const tanAngleInput = document.getElementById('tan-angle');
const tanEquation = document.getElementById('tan-equation');
const tanValue = document.getElementById('tan-value');
const tanRange = document.getElementById('tan-range');
const tanPeriod = document.getElementById('tan-period');
const tanAsymptote = document.getElementById('tan-asymptote');
const tanNote = document.getElementById('tan-note');

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

function formatNumber(value, precision = 4) {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function normalizeNumberInput(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/\u221a/g, 'sqrt');
}

function parseRadicalToken(token) {
  if (!token) return null;
  let sign = 1;
  let clean = token;
  if (clean.startsWith('-')) {
    sign = -1;
    clean = clean.slice(1);
  }
  if (clean.startsWith('sqrt')) {
    const inner = clean.replace(/^sqrt\(?/, '').replace(/\)?$/, '');
    const value = Number(inner);
    if (!Number.isFinite(value) || value < 0) return null;
    return sign * Math.sqrt(value);
  }
  if (!/^\d+(?:\.\d+)?$/.test(clean)) return null;
  const numeric = Number.parseFloat(clean);
  return Number.isFinite(numeric) ? sign * numeric : null;
}

function parseNumberInput(value) {
  const raw = normalizeNumberInput(value);
  if (!raw) return null;
  if (raw.includes('/')) {
    const parts = raw.split('/');
    if (parts.length !== 2) return null;
    const numerator = parseRadicalToken(parts[0]);
    const denominator = parseRadicalToken(parts[1]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
    return numerator / denominator;
  }
  if (!raw.startsWith('sqrt') && !raw.startsWith('-sqrt') && !/^-?\d+(?:\.\d+)?$/.test(raw)) {
    return null;
  }
  return parseRadicalToken(raw);
}

function normalizeText(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\u00b0/g, '')
    .replace(/[\[\]{}()]/g, '')
    .replace(/;/g, ',')
    .replace(/\.\./g, ',')
    .replace(/\u2212/g, '-')
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

function degreesToRadians(deg) {
  return (deg * Math.PI) / 180;
}

function formatAngle(deg) {
  return `${deg}\u00b0`;
}

function pickAngle(list) {
  const base = list[randomInt(0, list.length - 1)];
  if (Math.random() < 0.25 && base !== 0) {
    return -base;
  }
  return base;
}

function getTrigValue(func, deg) {
  const rad = degreesToRadians(deg);
  if (func === 'tan') {
    const cosValue = Math.cos(rad);
    if (Math.abs(cosValue) < 1e-6) return null;
  }
  return Math[func](rad);
}

function buildValueQuestion(kind, difficulty) {
  let func = 'sin';
  let angle = 0;
  if (kind === 'tan-value') {
    func = 'tan';
    angle = pickAngle(TAN_ANGLES);
  } else if (kind === 'value-special') {
    func = Math.random() < 0.5 ? 'sin' : 'cos';
    angle = pickAngle(SPECIAL_ANGLES);
  } else {
    func = Math.random() < 0.5 ? 'sin' : 'cos';
    angle = pickAngle(BASIC_ANGLES);
  }

  const value = getTrigValue(func, angle);
  return {
    kind,
    question: `Sz\u00e1m\u00edtsd ki: ${func}(${formatAngle(angle)})`,
    answerString: formatNumber(value, 4),
    answerType: 'number',
    expectedValue: value,
    signature: `${kind}:${func}:${angle}`
  };
}

function buildTanUndefinedQuestion() {
  const angle = pickAngle(TAN_UNDEFINED_ANGLES);
  return {
    kind: 'tan-undefined',
    question: `Mi a tan(${formatAngle(angle)}) \u00e9rt\u00e9ke?`,
    answerString: 'nem \u00e9rtelmezhet\u0151',
    answerType: 'text',
    expectedKey: 'undefined',
    signature: `tan-undefined:${angle}`
  };
}

function buildParityQuestion() {
  const func = ['sin', 'cos', 'tan'][randomInt(0, 2)];
  const expectedKey = func === 'cos' ? 'paros' : 'paratlan';
  const answerString = func === 'cos' ? 'p\u00e1ros' : 'p\u00e1ratlan';
  return {
    kind: 'parity',
    question: `Milyen parit\u00e1s\u00fa a ${func}(x)? (p\u00e1ros/p\u00e1ratlan)`,
    answerString,
    answerType: 'text',
    expectedKey,
    signature: `parity:${func}`
  };
}

function buildRangeQuestion(kind) {
  if (kind === 'range-tan') {
    return {
      kind: 'range-tan',
      question: 'Mi a tan(x) \u00e9rt\u00e9kk\u00e9szlete? (R)',
      answerString: 'R',
      answerType: 'text',
      expectedKey: 'r',
      signature: 'range-tan'
    };
  }
  const func = Math.random() < 0.5 ? 'sin' : 'cos';
  return {
    kind: 'range-sincos',
    question: `Mi a ${func}(x) \u00e9rt\u00e9kk\u00e9szlete? ([-1,1])`,
    answerString: '[-1,1]',
    answerType: 'text',
    expectedKey: 'range',
    signature: `range-sincos:${func}`
  };
}

function buildPeriodQuestion(kind) {
  if (kind === 'period-scaled') {
    const func = Math.random() < 0.5 ? 'sin' : 'cos';
    const k = [2, 3, 4][randomInt(0, 2)];
    const period = 360 / k;
    return {
      kind: 'period-scaled',
      question: `Mi a f(x) = ${func}(${k}x) peri\u00f3dusa fokban?`,
      answerString: formatNumber(period, 2),
      answerType: 'number',
      expectedValue: period,
      signature: `period-scaled:${func}:${k}`
    };
  }
  const func = ['sin', 'cos', 'tan'][randomInt(0, 2)];
  const period = func === 'tan' ? 180 : 360;
  return {
    kind: 'period-basic',
    question: `Mi a ${func}(x) peri\u00f3dusa fokban?`,
    answerString: String(period),
    answerType: 'number',
    expectedValue: period,
    signature: `period-basic:${func}`
  };
}

function buildAmplitudeQuestion() {
  const func = Math.random() < 0.5 ? 'sin' : 'cos';
  const coef = [-4, -3, -2, -1, 2, 3, 4][randomInt(0, 6)];
  return {
    kind: 'amplitude',
    question: `Mi a f(x) = ${coef} ${func} x amplit\u00f3d\u00f3ja?`,
    answerString: String(Math.abs(coef)),
    answerType: 'number',
    expectedValue: Math.abs(coef),
    signature: `amplitude:${func}:${coef}`
  };
}

function buildQuestion(kind, difficulty) {
  if (kind === 'value-basic') return buildValueQuestion(kind, difficulty);
  if (kind === 'value-special') return buildValueQuestion(kind, difficulty);
  if (kind === 'tan-value') return buildValueQuestion(kind, difficulty);
  if (kind === 'tan-undefined') return buildTanUndefinedQuestion();
  if (kind === 'parity') return buildParityQuestion();
  if (kind === 'range-sincos' || kind === 'range-tan') return buildRangeQuestion(kind);
  if (kind === 'period-basic' || kind === 'period-scaled') return buildPeriodQuestion(kind);
  if (kind === 'amplitude') return buildAmplitudeQuestion();
  return buildValueQuestion('value-basic', difficulty);
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

function updateSinCosModel() {
  if (!scFunctionInput || !scAmplitudeInput || !scAngleInput) return;
  const func = scFunctionInput.value || 'sin';
  const amplitude = Number.parseFloat(scAmplitudeInput.value);
  const angle = Number.parseFloat(scAngleInput.value);
  if (!Number.isFinite(amplitude) || !Number.isFinite(angle)) {
    if (scEquation) scEquation.textContent = '-';
    if (scValue) scValue.textContent = '-';
    if (scRange) scRange.textContent = '-';
    if (scPeriod) scPeriod.textContent = '-';
    if (scParity) scParity.textContent = '-';
    if (scNote) {
      scNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
      scNote.style.color = '#f04747';
    }
    return;
  }

  const rad = degreesToRadians(angle);
  const base = func === 'sin' ? Math.sin(rad) : Math.cos(rad);
  const value = amplitude * base;
  const absAmp = Math.abs(amplitude);
  const parityLabel = func === 'cos' ? 'P\u00e1ros' : 'P\u00e1ratlan';

  if (scEquation) scEquation.textContent = `f(x) = ${formatNumber(amplitude, 3)} ${func} x`;
  if (scValue) scValue.textContent = formatNumber(value, 4);
  if (scRange) scRange.textContent = `[${formatNumber(-absAmp, 3)}, ${formatNumber(absAmp, 3)}]`;
  if (scPeriod) scPeriod.textContent = `360\u00b0`;
  if (scParity) scParity.textContent = parityLabel;
  if (scNote) {
    scNote.textContent = '';
    scNote.style.color = '';
  }
}

function updateTanModel() {
  if (!tanAmplitudeInput || !tanAngleInput) return;
  const amplitude = Number.parseFloat(tanAmplitudeInput.value);
  const angle = Number.parseFloat(tanAngleInput.value);
  if (!Number.isFinite(amplitude) || !Number.isFinite(angle)) {
    if (tanEquation) tanEquation.textContent = '-';
    if (tanValue) tanValue.textContent = '-';
    if (tanRange) tanRange.textContent = '-';
    if (tanPeriod) tanPeriod.textContent = '-';
    if (tanAsymptote) tanAsymptote.textContent = '-';
    if (tanNote) {
      tanNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
      tanNote.style.color = '#f04747';
    }
    return;
  }

  const rad = degreesToRadians(angle);
  const cosValue = Math.cos(rad);
  const value = Math.abs(cosValue) < 1e-6 ? null : amplitude * Math.tan(rad);

  if (tanEquation) tanEquation.textContent = `f(x) = ${formatNumber(amplitude, 3)} tan x`;
  if (tanRange) tanRange.textContent = 'R';
  if (tanPeriod) tanPeriod.textContent = `180\u00b0`;
  if (tanAsymptote) tanAsymptote.textContent = `x = 90\u00b0 + k*180\u00b0`;

  if (value === null) {
    if (tanValue) tanValue.textContent = 'nem \u00e9rtelmezhet\u0151';
    if (tanNote) {
      tanNote.textContent = 'A cos(x) = 0 pontokban a tangens nem \u00e9rtelmezett.';
      tanNote.style.color = '#f04747';
    }
    return;
  }

  if (tanValue) tanValue.textContent = formatNumber(value, 4);
  if (tanNote) {
    tanNote.textContent = '';
    tanNote.style.color = '';
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

if (scFunctionInput) scFunctionInput.addEventListener('change', updateSinCosModel);
if (scAmplitudeInput) scAmplitudeInput.addEventListener('input', updateSinCosModel);
if (scAngleInput) scAngleInput.addEventListener('input', updateSinCosModel);
if (tanAmplitudeInput) tanAmplitudeInput.addEventListener('input', updateTanModel);
if (tanAngleInput) tanAngleInput.addEventListener('input', updateTanModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateSinCosModel();
updateTanModel();
announceActiveTab(activeTab);
if (window.parent) {
  window.parent.postMessage({ type: 'request-settings' }, '*');
}
