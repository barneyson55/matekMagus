const TOPIC_ID = 'tizedes_tortek';
const TOPIC_NAME = 'Tizedes t\u00f6rtek, \u00e1tv\u00e1lt\u00e1sok';
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

const DECIMAL_SCALES = {
  [DIFF_EASY]: [10, 100],
  [DIFF_NORMAL]: [100, 1000],
  [DIFF_HARD]: [1000]
};

const FRACTION_DENOMS = {
  [DIFF_EASY]: [2, 4, 5, 10, 20, 25],
  [DIFF_NORMAL]: [4, 5, 8, 10, 20, 25, 40],
  [DIFF_HARD]: [8, 10, 16, 20, 25, 40, 50, 100]
};

const PERCENT_SCALES = {
  [DIFF_EASY]: [1],
  [DIFF_NORMAL]: [1, 10],
  [DIFF_HARD]: [10]
};

const QUESTION_TYPES_BY_DIFFICULTY = {
  [DIFF_EASY]: ['dec-to-frac', 'frac-to-dec', 'dec-to-percent', 'percent-to-dec'],
  [DIFF_NORMAL]: ['dec-to-frac', 'frac-to-dec', 'dec-to-percent', 'percent-to-dec'],
  [DIFF_HARD]: ['dec-to-frac', 'frac-to-dec', 'dec-to-percent', 'percent-to-dec']
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

const decimalInput = document.getElementById('decimal-input');
const roundDigitsInput = document.getElementById('round-digits');
const decimalFractionOutput = document.getElementById('decimal-fraction-output');
const decimalPercentOutput = document.getElementById('decimal-percent-output');
const decimalRoundedOutput = document.getElementById('decimal-rounded-output');
const decimalError = document.getElementById('decimal-error');

const fracNumInput = document.getElementById('frac-num');
const fracDenInput = document.getElementById('frac-den');
const fractionDecimalOutput = document.getElementById('fraction-decimal-output');
const fractionError = document.getElementById('fraction-error');

const percentInput = document.getElementById('percent-input');
const percentDecimalOutput = document.getElementById('percent-decimal-output');
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
const PRACTICE_HISTORY_LIMIT = 8;
const PRACTICE_RETRY_LIMIT = 16;
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
  if (n === 0) return { n: 0, d: 1 };
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d);
  return {
    n: (n / divisor) * sign,
    d: Math.abs(d / divisor)
  };
}

function formatFraction(n, d) {
  if (d === 1) return String(n);
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
  const raw = value.trim();
  if (!raw) return null;
  const mixedMatch = raw.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    const absWhole = Math.abs(whole);
    const numerator = sign * (absWhole * den + num);
    return simplifyFraction(numerator, den);
  }
  const cleaned = raw.replace(/\s+/g, '').replace(/:/g, '/');
  if (/^-?\d+$/.test(cleaned)) {
    return simplifyFraction(Number(cleaned), 1);
  }
  if (/^-?\d+\/-?\d+$/.test(cleaned)) {
    const parts = cleaned.split('/');
    const n = Number(parts[0]);
    const d = Number(parts[1]);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return simplifyFraction(n, d);
  }
  return null;
}

function formatDecimal(value, precision = 4) {
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function formatPercent(value) {
  return `${formatDecimal(value, 2)}%`;
}

function decimalToFraction(rawValue) {
  const normalized = normalizeDecimalString(rawValue);
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const parts = unsigned.split('.');
  const wholePart = parts[0] || '0';
  const fracPart = parts[1] || '';
  const scale = fracPart.length ? 10 ** fracPart.length : 1;
  const whole = Number(wholePart);
  const frac = fracPart ? Number(fracPart) : 0;
  const numerator = whole * scale + frac;
  const signedNumerator = negative ? -numerator : numerator;
  return simplifyFraction(signedNumerator, scale);
}

function pickDecimalValue(difficulty) {
  const scales = DECIMAL_SCALES[difficulty] || DECIMAL_SCALES[DIFF_EASY];
  const scale = scales[randomInt(0, scales.length - 1)];
  const maxInt = difficulty === DIFF_HARD ? 4 : 2;
  const integerPart = randomInt(0, maxInt);
  const fracPart = randomInt(1, scale - 1);
  const numerator = integerPart * scale + fracPart;
  const fraction = simplifyFraction(numerator, scale);
  return {
    value: numerator / scale,
    fraction
  };
}

function pickFraction(difficulty) {
  const pool = FRACTION_DENOMS[difficulty] || FRACTION_DENOMS[DIFF_EASY];
  const denom = pool[randomInt(0, pool.length - 1)];
  const num = randomInt(1, denom - 1);
  return simplifyFraction(num, denom);
}

function pickPercentValue(difficulty) {
  const scales = PERCENT_SCALES[difficulty] || PERCENT_SCALES[DIFF_EASY];
  const scale = scales[randomInt(0, scales.length - 1)];
  const raw = randomInt(5 * scale, 95 * scale);
  const percent = raw / scale;
  return {
    percent,
    decimal: percent / 100
  };
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerType = 'decimal';
  let answerString = '';
  let expectedDecimal = null;
  let expectedPercent = null;
  let expectedFraction = null;

  if (kind === 'dec-to-frac') {
    const item = pickDecimalValue(difficulty);
    expectedFraction = item.fraction;
    answerType = 'fraction';
    answerString = formatFraction(expectedFraction.n, expectedFraction.d);
    question = `Alak\u00edtsd \u00e1t t\u00f6rt alakra: ${formatDecimal(item.value)}`;
  } else if (kind === 'frac-to-dec') {
    const frac = pickFraction(difficulty);
    expectedFraction = frac;
    expectedDecimal = frac.n / frac.d;
    answerType = 'decimal';
    answerString = formatDecimal(expectedDecimal);
    question = `Alak\u00edtsd \u00e1t tizedes alakra: ${formatFraction(frac.n, frac.d)}`;
  } else if (kind === 'dec-to-percent') {
    const item = pickDecimalValue(difficulty);
    expectedDecimal = item.value;
    expectedPercent = item.value * 100;
    answerType = 'percent';
    answerString = formatPercent(expectedPercent);
    question = `Alak\u00edtsd \u00e1t sz\u00e1zal\u00e9kra: ${formatDecimal(item.value)}`;
  } else if (kind === 'percent-to-dec') {
    const percentItem = pickPercentValue(difficulty);
    expectedPercent = percentItem.percent;
    expectedDecimal = percentItem.decimal;
    answerType = 'decimal';
    answerString = formatDecimal(expectedDecimal);
    question = `Alak\u00edtsd \u00e1t tizedes alakra: ${formatPercent(expectedPercent)}`;
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

  types.forEach((kind) => {
    let q = null;
    let attempts = 0;
    while (attempts < 30) {
      const candidate = buildQuestion(kind, difficulty);
      const signature = `${kind}:${candidate.answerString}`;
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
    const signature = `${kind}:${candidate.answerString}`;
    if (!used.has(signature) && candidate.answerString) {
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

function updateDecimalModel() {
  const rawValue = decimalInput.value || '';
  const parsed = parseDecimalInput(rawValue);
  if (parsed === null) {
    decimalFractionOutput.textContent = '-';
    decimalPercentOutput.textContent = '-';
    decimalRoundedOutput.textContent = '-';
    decimalError.textContent = 'Adj meg helyes tizedes sz\u00e1mot.';
    decimalError.style.color = '#f04747';
    return;
  }

  const fraction = decimalToFraction(rawValue);
  if (!fraction) {
    decimalFractionOutput.textContent = '-';
    decimalPercentOutput.textContent = '-';
    decimalRoundedOutput.textContent = '-';
    decimalError.textContent = 'Adj meg helyes tizedes sz\u00e1mot.';
    decimalError.style.color = '#f04747';
    return;
  }

  const percentValue = parsed * 100;
  decimalFractionOutput.textContent = formatFraction(fraction.n, fraction.d);
  decimalPercentOutput.textContent = formatPercent(percentValue);

  const digits = Number.parseInt(roundDigitsInput.value, 10);
  if (!Number.isFinite(digits) || digits < 0) {
    decimalRoundedOutput.textContent = '-';
  } else {
    decimalRoundedOutput.textContent = formatDecimal(parsed, digits);
  }

  decimalError.textContent = '';
  decimalError.style.color = '';
}

function updateFractionModel() {
  const num = Number.parseInt(fracNumInput.value, 10);
  const den = Number.parseInt(fracDenInput.value, 10);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    fractionDecimalOutput.textContent = '-';
    fractionError.textContent = 'Adj meg helyes t\u00f6rtet.';
    fractionError.style.color = '#f04747';
    return;
  }
  const simplified = simplifyFraction(num, den);
  if (!simplified) {
    fractionDecimalOutput.textContent = '-';
    fractionError.textContent = 'Adj meg helyes t\u00f6rtet.';
    fractionError.style.color = '#f04747';
    return;
  }
  fractionDecimalOutput.textContent = formatDecimal(simplified.n / simplified.d);
  fractionError.textContent = '';
  fractionError.style.color = '';
}

function updatePercentModel() {
  const percentValue = parsePercentInput(percentInput.value || '');
  if (percentValue === null) {
    percentDecimalOutput.textContent = '-';
    percentError.textContent = 'Adj meg helyes sz\u00e1zal\u00e9kot.';
    percentError.style.color = '#f04747';
    return;
  }
  percentDecimalOutput.textContent = formatDecimal(percentValue / 100);
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

if (decimalInput) decimalInput.addEventListener('input', updateDecimalModel);
if (roundDigitsInput) roundDigitsInput.addEventListener('input', updateDecimalModel);
if (fracNumInput) fracNumInput.addEventListener('input', updateFractionModel);
if (fracDenInput) fracDenInput.addEventListener('input', updateFractionModel);
if (percentInput) percentInput.addEventListener('input', updatePercentModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateDecimalModel();
updateFractionModel();
updatePercentModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
