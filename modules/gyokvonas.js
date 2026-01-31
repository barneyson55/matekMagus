const TOPIC_ID = 'gyokvonas';
const TOPIC_NAME = 'N\u00e9gyzetgy\u00f6k, n-edik gy\u00f6k';
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
  [DIFF_EASY]: ['square', 'cube'],
  [DIFF_NORMAL]: ['square', 'cube', 'nth', 'powerRoot'],
  [DIFF_HARD]: ['square', 'cube', 'nth', 'powerRoot', 'productRoot']
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

const rootValueInput = document.getElementById('root-value');
const rootIndexInput = document.getElementById('root-index');
const rootOutput = document.getElementById('root-output');
const rootCheck = document.getElementById('root-check');
const rootError = document.getElementById('root-error');

const linkBaseInput = document.getElementById('link-base');
const linkIndexInput = document.getElementById('link-index');
const linkMultInput = document.getElementById('link-mult');
const linkRadicand = document.getElementById('link-radicand');
const linkResult = document.getElementById('link-result');
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
  if (difficulty === DIFF_EASY) return randomInt(2, 9);
  if (difficulty === DIFF_NORMAL) return randomInt(2, 10);
  return randomInt(2, 12);
}

function pickIndex(difficulty) {
  if (difficulty === DIFF_EASY) return randomInt(2, 3);
  if (difficulty === DIFF_NORMAL) return randomInt(2, 4);
  return randomInt(2, 5);
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerType = 'number';
  let answerString = '';
  let expectedValue = null;
  let signature = '';

  if (kind === 'square') {
    const base = pickBase(difficulty);
    const radicand = Math.pow(base, 2);
    expectedValue = base;
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: \u221a${radicand}.`;
    signature = `${kind}:${radicand}`;
  } else if (kind === 'cube') {
    const base = randomInt(2, difficulty === DIFF_HARD ? 6 : 5);
    const radicand = Math.pow(base, 3);
    expectedValue = base;
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: 3. gy\u00f6k(${radicand}).`;
    signature = `${kind}:${radicand}`;
  } else if (kind === 'nth') {
    const base = pickBase(difficulty);
    const index = pickIndex(difficulty);
    const radicand = Math.pow(base, index);
    expectedValue = base;
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: ${index}. gy\u00f6k(${radicand}).`;
    signature = `${kind}:${index}:${radicand}`;
  } else if (kind === 'powerRoot') {
    const base = randomInt(2, difficulty === DIFF_HARD ? 6 : 5);
    const index = pickIndex(difficulty);
    const multiplier = randomInt(2, difficulty === DIFF_HARD ? 4 : 3);
    const exponent = index * multiplier;
    const radicand = Math.pow(base, exponent);
    expectedValue = Math.pow(base, multiplier);
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: ${index}. gy\u00f6k(${base}^${exponent}).`;
    signature = `${kind}:${base}:${index}:${multiplier}`;
  } else if (kind === 'productRoot') {
    const index = randomInt(2, difficulty === DIFF_HARD ? 3 : 2);
    const a = randomInt(2, 6);
    const b = randomInt(2, 6);
    const radicand = Math.pow(a, index) * Math.pow(b, index);
    expectedValue = a * b;
    answerString = formatNumber(expectedValue, 0);
    question = `Sz\u00e1m\u00edtsd ki: ${index}. gy\u00f6k(${a}^${index} \u00d7 ${b}^${index}).`;
    signature = `${kind}:${index}:${a}:${b}`;
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

function updateRootModel() {
  const radicand = Number.parseInt(rootValueInput.value, 10);
  const index = Number.parseInt(rootIndexInput.value, 10);
  if (!Number.isFinite(radicand) || !Number.isFinite(index) || index < 2) {
    rootOutput.textContent = '-';
    rootCheck.textContent = '-';
    rootError.textContent = 'Adj meg \u00e9rv\u00e9nyes gy\u00f6k\u00f6s adatokat.';
    rootError.style.color = '#f04747';
    return;
  }
  if (radicand < 0 && index % 2 === 0) {
    rootOutput.textContent = '-';
    rootCheck.textContent = '-';
    rootError.textContent = 'P\u00e1ros indexhez nem lehet negat\u00edv a gy\u00f6k alatt.';
    rootError.style.color = '#f04747';
    return;
  }

  let value = null;
  if (radicand === 0) {
    value = 0;
  } else if (radicand < 0) {
    value = -Math.pow(Math.abs(radicand), 1 / index);
  } else {
    value = Math.pow(radicand, 1 / index);
  }

  const rounded = Math.round(value);
  const isInteger = Math.abs(value - rounded) < 0.000001;
  const display = isInteger ? formatNumber(rounded, 0) : formatNumber(value, 3);
  rootOutput.textContent = display;
  if (isInteger) {
    rootCheck.textContent = `${display}^${index} = ${radicand}`;
    rootError.textContent = '';
    rootError.style.color = '';
  } else {
    rootCheck.textContent = `${display}^${index} \u2248 ${formatNumber(Math.pow(value, index), 3)}`;
    rootError.textContent = 'Nem teljes hatv\u00e1ny, k\u00f6zel\u00edt\u0151 \u00e9rt\u00e9k.';
    rootError.style.color = '#f04747';
  }
}

function updateLinkModel() {
  const base = Number.parseInt(linkBaseInput.value, 10);
  const index = Number.parseInt(linkIndexInput.value, 10);
  const multiplier = Number.parseInt(linkMultInput.value, 10);
  if (!Number.isFinite(base) || !Number.isFinite(index) || !Number.isFinite(multiplier) || base < 1 || index < 2 || multiplier < 1) {
    linkRadicand.textContent = '-';
    linkResult.textContent = '-';
    linkFormula.textContent = '-';
    linkError.textContent = 'Adj meg \u00e9rv\u00e9nyes param\u00e9tereket.';
    linkError.style.color = '#f04747';
    return;
  }

  const exponent = index * multiplier;
  const radicand = Math.pow(base, exponent);
  const result = Math.pow(base, multiplier);
  linkRadicand.textContent = formatNumber(radicand, 0);
  linkResult.textContent = formatNumber(result, 0);
  linkFormula.textContent = `${index}. gy\u00f6k(${base}^${exponent}) = ${base}^${multiplier}`;
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

if (rootValueInput) rootValueInput.addEventListener('input', updateRootModel);
if (rootIndexInput) rootIndexInput.addEventListener('input', updateRootModel);

if (linkBaseInput) linkBaseInput.addEventListener('input', updateLinkModel);
if (linkIndexInput) linkIndexInput.addEventListener('input', updateLinkModel);
if (linkMultInput) linkMultInput.addEventListener('input', updateLinkModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateRootModel();
updateLinkModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
