const TOPIC_ID = 'hatvany_temazaro';
const TOPIC_NAME = 'Hatv\u00e1ny, Gy\u00f6k, Logaritmus';
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
  [DIFF_EASY]: ['pow', 'root', 'rule-mul'],
  [DIFF_NORMAL]: ['pow', 'root', 'log', 'rule-mul', 'rule-div'],
  [DIFF_HARD]: ['pow', 'root', 'log', 'rule-mul', 'rule-div', 'rule-power']
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

const powBaseInput = document.getElementById('pow-base');
const powExpInput = document.getElementById('pow-exp');
const powOutput = document.getElementById('pow-output');
const powFormula = document.getElementById('pow-formula');
const powError = document.getElementById('pow-error');

const rootValueInput = document.getElementById('root-value');
const rootIndexInput = document.getElementById('root-index');
const rootOutput = document.getElementById('root-output');
const rootCheck = document.getElementById('root-check');
const rootError = document.getElementById('root-error');

const logBaseInput = document.getElementById('log-base');
const logValueInput = document.getElementById('log-value');
const logOutput = document.getElementById('log-output');
const logCheck = document.getElementById('log-check');
const logError = document.getElementById('log-error');

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

function formatNumber(value, precision = 3) {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function pickBase(difficulty) {
  if (difficulty === DIFF_EASY) return randomInt(2, 6);
  if (difficulty === DIFF_NORMAL) return randomInt(2, 8);
  return randomInt(2, 10);
}

function pickExponent(difficulty) {
  if (difficulty === DIFF_EASY) return randomInt(2, 3);
  if (difficulty === DIFF_NORMAL) return randomInt(2, 4);
  return randomInt(2, 5);
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;

  if (kind === 'pow') {
    const base = pickBase(difficulty);
    const exp = pickExponent(difficulty);
    expectedValue = Math.pow(base, exp);
    question = `Sz\u00e1m\u00edtsd ki: ${base}^${exp}`;
  } else if (kind === 'root') {
    const base = pickBase(difficulty);
    const index = difficulty === DIFF_EASY ? 2 : (difficulty === DIFF_NORMAL ? randomInt(2, 3) : randomInt(2, 4));
    const value = Math.pow(base, index);
    expectedValue = base;
    question = `Sz\u00e1m\u00edtsd ki: ${index}. gy\u00f6k ${value}-b\u0151l`;
  } else if (kind === 'log') {
    const base = pickBase(difficulty);
    const exp = pickExponent(difficulty);
    const value = Math.pow(base, exp);
    expectedValue = exp;
    question = `Sz\u00e1m\u00edtsd ki: log_${base}(${value})`;
  } else if (kind === 'rule-mul') {
    const base = pickBase(difficulty);
    const expA = pickExponent(difficulty);
    const expB = pickExponent(difficulty);
    expectedValue = Math.pow(base, expA + expB);
    question = `Sz\u00e1m\u00edtsd ki: ${base}^${expA} * ${base}^${expB}`;
  } else if (kind === 'rule-div') {
    const base = pickBase(difficulty);
    let expA = pickExponent(difficulty) + 1;
    let expB = pickExponent(difficulty);
    if (expB >= expA) {
      const temp = expA;
      expA = expB + 1;
      expB = temp - 1;
    }
    expectedValue = Math.pow(base, expA - expB);
    question = `Sz\u00e1m\u00edtsd ki: ${base}^${expA} / ${base}^${expB}`;
  } else if (kind === 'rule-power') {
    const base = pickBase(difficulty);
    const expA = pickExponent(difficulty);
    const expB = pickExponent(difficulty);
    expectedValue = Math.pow(base, expA * expB);
    question = `Sz\u00e1m\u00edtsd ki: (${base}^${expA})^${expB}`;
  }

  if (expectedValue !== null) {
    answerString = formatNumber(expectedValue, 3);
  }

  return {
    kind,
    question,
    answerString,
    expectedValue
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

  while (questions.length < poolTarget) {
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
  const parsed = parseDecimalInput(userAnswer || '');
  return parsed !== null && question.expectedValue !== null
    && Math.abs(parsed - question.expectedValue) < 0.01;
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
  const base = parseDecimalInput(powBaseInput.value || '');
  const exp = Number.parseInt(powExpInput.value, 10);
  if (base === null || !Number.isFinite(exp) || base <= 0 || exp < 0) {
    powOutput.textContent = '-';
    powFormula.textContent = '-';
    powError.textContent = 'Adj meg \u00e9rv\u00e9nyes alapot \u00e9s kitev\u0151t.';
    powError.style.color = '#f04747';
    return;
  }
  const value = Math.pow(base, exp);
  powOutput.textContent = formatNumber(value, 3);
  powFormula.textContent = `${formatNumber(base, 3)}^${exp} = ${formatNumber(value, 3)}`;
  powError.textContent = '';
  powError.style.color = '';
}

function updateRootModel() {
  const value = parseDecimalInput(rootValueInput.value || '');
  const index = Number.parseInt(rootIndexInput.value, 10);
  if (value === null || value < 0 || !Number.isFinite(index) || index < 2) {
    rootOutput.textContent = '-';
    rootCheck.textContent = '-';
    rootError.textContent = 'Adj meg \u00e9rv\u00e9nyes gy\u00f6k alatti sz\u00e1mot.';
    rootError.style.color = '#f04747';
    return;
  }
  const root = Math.pow(value, 1 / index);
  rootOutput.textContent = formatNumber(root, 3);
  rootCheck.textContent = `${formatNumber(root, 3)}^${index} = ${formatNumber(Math.pow(root, index), 3)}`;
  rootError.textContent = '';
  rootError.style.color = '';
}

function updateLogModel() {
  const base = parseDecimalInput(logBaseInput.value || '');
  const value = parseDecimalInput(logValueInput.value || '');
  if (base === null || value === null || base <= 0 || base === 1 || value <= 0) {
    logOutput.textContent = '-';
    logCheck.textContent = '-';
    logError.textContent = 'Adj meg \u00e9rv\u00e9nyes alapot \u00e9s argumentumot.';
    logError.style.color = '#f04747';
    return;
  }
  const logValue = Math.log(value) / Math.log(base);
  logOutput.textContent = formatNumber(logValue, 3);
  logCheck.textContent = `${formatNumber(base, 3)}^${formatNumber(logValue, 3)} = ${formatNumber(Math.pow(base, logValue), 3)}`;
  logError.textContent = '';
  logError.style.color = '';
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

if (powBaseInput) powBaseInput.addEventListener('input', updatePowerModel);
if (powExpInput) powExpInput.addEventListener('input', updatePowerModel);
if (rootValueInput) rootValueInput.addEventListener('input', updateRootModel);
if (rootIndexInput) rootIndexInput.addEventListener('input', updateRootModel);
if (logBaseInput) logBaseInput.addEventListener('input', updateLogModel);
if (logValueInput) logValueInput.addEventListener('input', updateLogModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updatePowerModel();
updateRootModel();
updateLogModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
