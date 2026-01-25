const TOPIC_ID = 'racionalis_szamok_temazaro';
const TOPIC_NAME = 'Racion\u00e1lis sz\u00e1mok';
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

const TERMINATING_DENOMS = {
  [DIFF_EASY]: [2, 4, 5, 10],
  [DIFF_NORMAL]: [2, 4, 5, 8, 10, 20, 25],
  [DIFF_HARD]: [2, 4, 5, 8, 10, 20, 25, 40]
};
const GENERAL_DENOMS = {
  [DIFF_EASY]: [2, 3, 4, 5, 6, 10],
  [DIFF_NORMAL]: [3, 4, 5, 6, 8, 10, 12, 15],
  [DIFF_HARD]: [3, 4, 5, 6, 8, 9, 12, 14, 15, 16, 18, 20]
};
const QUESTION_TYPES_BY_DIFFICULTY = {
  [DIFF_EASY]: ['frac-to-dec', 'frac-to-percent', 'percent-to-dec'],
  [DIFF_NORMAL]: ['dec-to-frac', 'percent-to-frac', 'frac-to-percent', 'frac-to-dec'],
  [DIFF_HARD]: ['dec-to-frac', 'percent-to-frac', 'dec-to-percent', 'frac-to-dec', 'frac-to-percent']
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

const fracNumInput = document.getElementById('frac-num');
const fracDenInput = document.getElementById('frac-den');
const fracDecimalOutput = document.getElementById('frac-decimal-output');
const fracPercentOutput = document.getElementById('frac-percent-output');
const fracError = document.getElementById('frac-error');
const percentInput = document.getElementById('percent-input');
const percentDecimalOutput = document.getElementById('percent-decimal-output');
const percentFractionOutput = document.getElementById('percent-fraction-output');
const percentError = document.getElementById('percent-error');

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

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function simplifyFraction(n, d) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d);
  return {
    n: (n / divisor) * sign,
    d: Math.abs(d / divisor)
  };
}

function formatFraction(n, d) {
  return `${n}/${d}`;
}

function normalizeDecimalString(value) {
  return value.trim().replace(/\s+/g, '').replace(',', '.');
}

function parseDecimalInput(value) {
  const raw = normalizeDecimalString(value);
  if (!raw) return null;
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercentInput(value) {
  const raw = normalizeDecimalString(value).replace('%', '');
  if (!raw) return null;
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFractionInput(value) {
  const raw = value.trim().replace(/\s+/g, '').replace(':', '/');
  if (!/^-?\d+\/-?\d+$/.test(raw)) return null;
  const parts = raw.split('/');
  const n = Number(parts[0]);
  const d = Number(parts[1]);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return simplifyFraction(n, d);
}

function percentToFraction(value) {
  const raw = normalizeDecimalString(String(value));
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parts = raw.split('.');
  const whole = Number(parts[0]);
  const frac = parts[1] || '';
  const scale = frac.length ? 10 ** frac.length : 1;
  const numerator = whole * scale + Number(frac || 0);
  return simplifyFraction(numerator, scale * 100);
}

function formatDecimal(value, precision = 4) {
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function formatPercent(value) {
  return `${formatDecimal(value, 2)}%`;
}

function pickFraction(difficulty, terminatingOnly) {
  const pool = terminatingOnly
    ? (TERMINATING_DENOMS[difficulty] || TERMINATING_DENOMS[DIFF_EASY])
    : (GENERAL_DENOMS[difficulty] || GENERAL_DENOMS[DIFF_EASY]);
  const denom = pool[randomInt(0, pool.length - 1)];
  const num = randomInt(1, denom - 1);
  return simplifyFraction(num, denom);
}

function buildQuestion(kind, difficulty) {
  let fraction = null;
  let question = '';
  let answerType = 'decimal';
  let answerString = '';
  let expectedDecimal = null;
  let expectedPercent = null;
  let expectedFraction = null;

  if (kind === 'frac-to-dec') {
    fraction = pickFraction(difficulty, true);
    expectedDecimal = fraction.n / fraction.d;
    answerType = 'decimal';
    answerString = formatDecimal(expectedDecimal);
    question = `Alak\u00edtsd \u00e1t tizedes alakra: ${formatFraction(fraction.n, fraction.d)}`;
  } else if (kind === 'frac-to-percent') {
    fraction = pickFraction(difficulty, true);
    expectedPercent = (fraction.n / fraction.d) * 100;
    answerType = 'percent';
    answerString = formatPercent(expectedPercent);
    question = `Alak\u00edtsd \u00e1t sz\u00e1zal\u00e9kra: ${formatFraction(fraction.n, fraction.d)}`;
  } else if (kind === 'percent-to-dec') {
    fraction = pickFraction(difficulty, true);
    expectedPercent = (fraction.n / fraction.d) * 100;
    expectedDecimal = expectedPercent / 100;
    answerType = 'decimal';
    answerString = formatDecimal(expectedDecimal);
    question = `Alak\u00edtsd \u00e1t tizedes alakra: ${formatPercent(expectedPercent)}`;
  } else if (kind === 'dec-to-frac') {
    fraction = pickFraction(difficulty, true);
    expectedDecimal = fraction.n / fraction.d;
    expectedFraction = simplifyFraction(fraction.n, fraction.d);
    answerType = 'fraction';
    answerString = formatFraction(expectedFraction.n, expectedFraction.d);
    question = `Alak\u00edtsd \u00e1t t\u00f6rt alakra: ${formatDecimal(expectedDecimal)}`;
  } else if (kind === 'percent-to-frac') {
    fraction = pickFraction(difficulty, true);
    expectedPercent = (fraction.n / fraction.d) * 100;
    expectedFraction = simplifyFraction(fraction.n, fraction.d);
    answerType = 'fraction';
    answerString = formatFraction(expectedFraction.n, expectedFraction.d);
    question = `Alak\u00edtsd \u00e1t t\u00f6rt alakra: ${formatPercent(expectedPercent)}`;
  } else if (kind === 'dec-to-percent') {
    fraction = pickFraction(difficulty, true);
    expectedDecimal = fraction.n / fraction.d;
    expectedPercent = expectedDecimal * 100;
    answerType = 'percent';
    answerString = formatPercent(expectedPercent);
    question = `Alak\u00edtsd \u00e1t sz\u00e1zal\u00e9kra: ${formatDecimal(expectedDecimal)}`;
  }

  return {
    kind,
    question,
    answerType,
    answerString,
    expectedDecimal,
    expectedPercent,
    expectedFraction
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
      const signature = `${kind}:${candidate.answerString}`;
      if (!used.has(signature)) {
        used.add(signature);
        q = candidate;
        break;
      }
      attempts += 1;
    }
    if (q) questions.push(q);
  });

  while (questions.length < poolTarget) {
    const kind = types[randomInt(0, types.length - 1)];
    const candidate = buildQuestion(kind, difficulty);
    const signature = `${kind}:${candidate.answerString}`;
    if (!used.has(signature)) {
      used.add(signature);
      questions.push(candidate);
    }
  }
  return shuffle(questions).slice(0, TEST_QUESTION_COUNT);
}

function checkAnswer(answerType, userAnswer, question) {
  if (!userAnswer) return false;
  if (answerType === 'fraction') {
    const parsed = parseFractionInput(userAnswer);
    return Boolean(parsed && question.expectedFraction
      && parsed.n === question.expectedFraction.n
      && parsed.d === question.expectedFraction.d);
  }
  if (answerType === 'percent') {
    const parsed = parsePercentInput(userAnswer);
    return parsed !== null && question.expectedPercent !== null
      && Math.abs(parsed - question.expectedPercent) < 0.01;
  }
  const parsed = parseDecimalInput(userAnswer);
  return parsed !== null && question.expectedDecimal !== null
    && Math.abs(parsed - question.expectedDecimal) < 0.001;
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
  if (testIntro) testIntro.hidden = false;
  testAnswerInput.value = '';
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
    if (!practiceHistory.some(entry => entry.signature === signature)) {
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

function updateFractionModel() {
  const num = Number.parseInt(fracNumInput.value, 10);
  const den = Number.parseInt(fracDenInput.value, 10);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    fracDecimalOutput.textContent = '-';
    fracPercentOutput.textContent = '-';
    fracError.textContent = 'Adj meg \u00e9rv\u00e9nyes t\u00f6rtet.';
    fracError.style.color = '#f04747';
    return;
  }
  const simplified = simplifyFraction(num, den);
  if (!simplified) {
    fracDecimalOutput.textContent = '-';
    fracPercentOutput.textContent = '-';
    fracError.textContent = 'Adj meg \u00e9rv\u00e9nyes t\u00f6rtet.';
    fracError.style.color = '#f04747';
    return;
  }
  const value = simplified.n / simplified.d;
  fracDecimalOutput.textContent = formatDecimal(value);
  fracPercentOutput.textContent = formatPercent(value * 100);
  fracError.textContent = '';
  fracError.style.color = '';
}

function updatePercentModel() {
  const percentValue = parsePercentInput(percentInput.value || '');
  if (percentValue === null) {
    percentDecimalOutput.textContent = '-';
    percentFractionOutput.textContent = '-';
    percentError.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1zal\u00e9kot.';
    percentError.style.color = '#f04747';
    return;
  }
  const decimalValue = percentValue / 100;
  const fraction = percentToFraction(String(percentValue));
  percentDecimalOutput.textContent = formatDecimal(decimalValue);
  percentFractionOutput.textContent = fraction ? formatFraction(fraction.n, fraction.d) : '-';
  percentError.textContent = '';
  percentError.style.color = '';
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

if (fracNumInput) fracNumInput.addEventListener('input', updateFractionModel);
if (fracDenInput) fracDenInput.addEventListener('input', updateFractionModel);
if (percentInput) percentInput.addEventListener('input', updatePercentModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateFractionModel();
updatePercentModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
