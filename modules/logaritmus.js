const TOPIC_ID = 'logaritmus';
const TOPIC_NAME = 'A logaritmus fogalma';
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
  [DIFF_EASY]: ['value', 'exponent'],
  [DIFF_NORMAL]: ['value', 'exponent', 'product', 'quotient'],
  [DIFF_HARD]: ['value', 'exponent', 'product', 'quotient', 'power', 'mixed']
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

const logBaseInput = document.getElementById('log-base');
const logValueInput = document.getElementById('log-value');
const logOutput = document.getElementById('log-output');
const logCheck = document.getElementById('log-check');
const logError = document.getElementById('log-error');

const linkBaseInput = document.getElementById('link-base');
const linkExpInput = document.getElementById('link-exp');
const linkValue = document.getElementById('link-value');
const linkFormula = document.getElementById('link-formula');
const linkError = document.getElementById('link-error');

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

function formatNumber(value, precision = 4) {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
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

function pickBase(difficulty) {
  if (difficulty === DIFF_EASY) return randomInt(2, 5);
  if (difficulty === DIFF_NORMAL) return randomInt(2, 6);
  return randomInt(2, 7);
}

function pickExponent(difficulty) {
  if (difficulty === DIFF_EASY) return randomInt(1, 3);
  if (difficulty === DIFF_NORMAL) return randomInt(1, 4);
  return randomInt(2, 5);
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerType = 'number';
  let answerString = '';
  let expectedValue = null;
  let signature = '';

  if (kind === 'value') {
    const base = pickBase(difficulty);
    const exp = pickExponent(difficulty);
    const value = Math.pow(base, exp);
    expectedValue = exp;
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: log_${base}(${value}).`;
    signature = `${kind}:${base}:${value}`;
  } else if (kind === 'exponent') {
    const base = pickBase(difficulty);
    const exp = pickExponent(difficulty);
    const value = Math.pow(base, exp);
    expectedValue = value;
    answerString = formatNumber(expectedValue, 0);
    question = `Ha log_${base}(b) = ${exp}, add meg b-t.`;
    signature = `${kind}:${base}:${exp}`;
  } else if (kind === 'product') {
    const base = pickBase(difficulty);
    const expA = pickExponent(difficulty);
    const expB = pickExponent(difficulty);
    expectedValue = expA + expB;
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: log_${base}(${base}^${expA} * ${base}^${expB}).`;
    signature = `${kind}:${base}:${expA}:${expB}`;
  } else if (kind === 'quotient') {
    const base = pickBase(difficulty);
    let expA = pickExponent(difficulty);
    let expB = pickExponent(difficulty);
    if (expA < expB) {
      const temp = expA;
      expA = expB;
      expB = temp;
    }
    expectedValue = expA - expB;
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: log_${base}(${base}^${expA} / ${base}^${expB}).`;
    signature = `${kind}:${base}:${expA}:${expB}`;
  } else if (kind === 'power') {
    const base = pickBase(difficulty);
    const expA = pickExponent(difficulty);
    const expB = randomInt(2, difficulty === DIFF_HARD ? 3 : 2);
    expectedValue = expA * expB;
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: log_${base}(( ${base}^${expA} )^${expB}).`;
    signature = `${kind}:${base}:${expA}:${expB}`;
  } else if (kind === 'mixed') {
    const base = pickBase(difficulty);
    const expA = pickExponent(difficulty);
    const expB = pickExponent(difficulty);
    let expC = pickExponent(difficulty);
    if (expA + expB < expC) {
      expC = randomInt(0, expA + expB);
    }
    expectedValue = expA + expB - expC;
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: log_${base}(${base}^${expA} * ${base}^${expB} / ${base}^${expC}).`;
    signature = `${kind}:${base}:${expA}:${expB}:${expC}`;
  }

  return {
    kind,
    question,
    answerType,
    answerString,
    expectedValue,
    signature
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
  if (!userAnswer || !question) return false;
  const parsed = parseNumberInput(userAnswer);
  if (parsed === null || question.expectedValue === null) return false;
  return Math.abs(parsed - question.expectedValue) < 0.0001;
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

function updateLogModel() {
  const base = Number.parseFloat(logBaseInput.value);
  const value = Number.parseFloat(logValueInput.value);
  if (!Number.isFinite(base) || !Number.isFinite(value) || base <= 0 || base === 1 || value <= 0) {
    logOutput.textContent = '-';
    logCheck.textContent = '-';
    logError.textContent = 'Adj meg \u00e9rv\u00e9nyes alapot \u00e9s \u00e9rt\u00e9ket.';
    logError.style.color = '#f04747';
    return;
  }

  const result = Math.log(value) / Math.log(base);
  if (!Number.isFinite(result)) {
    logOutput.textContent = '-';
    logCheck.textContent = '-';
    logError.textContent = 'Nem sz\u00e1molhat\u00f3 logaritmus.';
    logError.style.color = '#f04747';
    return;
  }

  const rounded = Math.round(result);
  const isInteger = Math.abs(result - rounded) < 0.000001;
  const display = isInteger ? formatNumber(rounded, 0) : formatNumber(result, 3);
  logOutput.textContent = display;
  if (isInteger) {
    logCheck.textContent = `${base}^${display} = ${formatNumber(value, 0)}`;
    logError.textContent = '';
    logError.style.color = '';
  } else {
    logCheck.textContent = `${base}^${display} \u2248 ${formatNumber(Math.pow(base, result), 3)}`;
    logError.textContent = 'Nem teljes hatv\u00e1ny, k\u00f6zel\u00edt\u0151 \u00e9rt\u00e9k.';
    logError.style.color = '#f04747';
  }
}

function updateLinkModel() {
  const base = Number.parseFloat(linkBaseInput.value);
  const exp = Number.parseFloat(linkExpInput.value);
  if (!Number.isFinite(base) || !Number.isFinite(exp) || base <= 0 || base === 1) {
    linkValue.textContent = '-';
    linkFormula.textContent = '-';
    linkError.textContent = 'Adj meg \u00e9rv\u00e9nyes alapot \u00e9s kitev\u0151t.';
    linkError.style.color = '#f04747';
    return;
  }

  const value = Math.pow(base, exp);
  linkValue.textContent = formatNumber(value, 0);
  linkFormula.textContent = `log_${formatNumber(base, 0)}(${formatNumber(value, 0)}) = ${formatNumber(exp, 0)}`;
  linkError.textContent = '';
  linkError.style.color = '';
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

if (logBaseInput) logBaseInput.addEventListener('input', updateLogModel);
if (logValueInput) logValueInput.addEventListener('input', updateLogModel);

if (linkBaseInput) linkBaseInput.addEventListener('input', updateLinkModel);
if (linkExpInput) linkExpInput.addEventListener('input', updateLinkModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateLogModel();
updateLinkModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
