const TOPIC_ID = 'nevezetes_azonossagok';
const TOPIC_NAME = 'Nevezetes azonoss\u00e1gok';
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
  [DIFF_EASY]: ['square-plus', 'square-minus'],
  [DIFF_NORMAL]: ['square-plus', 'square-minus', 'product'],
  [DIFF_HARD]: ['product', 'scaled-square', 'diff-squares']
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

const idAInput = document.getElementById('id-a');
const idBInput = document.getElementById('id-b');
const idFormula = document.getElementById('id-formula');
const idExpanded = document.getElementById('id-expanded');
const idOutput = document.getElementById('id-output');
const idError = document.getElementById('id-error');
const identityButtons = document.querySelectorAll('.operation-btn');

const axAInput = document.getElementById('ax-a');
const axBInput = document.getElementById('ax-b');
const axXInput = document.getElementById('ax-x');
const axExpanded = document.getElementById('ax-expanded');
const axOutput = document.getElementById('ax-output');
const axError = document.getElementById('ax-error');

let activeTab = 'elmelet';
let activeIdentity = 'square-plus';
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
  return value.trim().replace(/\s+/g, '').replace(',', '.').replace(':', '/');
}

function parseNumberInput(value) {
  const raw = normalizeInput(value);
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
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function formatTerm(coef, power, isFirst) {
  const absCoef = Math.abs(coef);
  const sign = coef < 0 ? '-' : (isFirst ? '' : '+');
  const signText = sign ? `${sign} ` : '';
  let coefText = '';
  if (!(power > 0 && absCoef === 1)) {
    coefText = String(absCoef);
  }
  let variableText = '';
  if (power > 0) {
    variableText = power === 1 ? 'x' : `x^${power}`;
  }
  return `${signText}${coefText}${variableText}`.trim();
}

function formatPolynomial(coeffs) {
  const degree = coeffs.length - 1;
  const terms = [];
  coeffs.forEach((coef, index) => {
    if (coef === 0) return;
    const power = degree - index;
    terms.push(formatTerm(coef, power, terms.length === 0));
  });
  return terms.length ? terms.join(' ') : '0';
}

function wrapValue(value) {
  const formatted = formatNumber(value, 3);
  return value < 0 ? `(${formatted})` : formatted;
}

function pickRange(difficulty) {
  if (difficulty === DIFF_EASY) return 5;
  if (difficulty === DIFF_NORMAL) return 8;
  return 10;
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;

  const range = pickRange(difficulty);
  const a = pickNonZero(-range, range);
  const b = randomInt(-range, range);

  if (kind === 'square-plus') {
    expectedValue = (a + b) ** 2;
    question = `Sz\u00e1m\u00edtsd ki: (a + b)^2, ahol a = ${a}, b = ${b}.`;
  } else if (kind === 'square-minus') {
    expectedValue = (a - b) ** 2;
    question = `Sz\u00e1m\u00edtsd ki: (a - b)^2, ahol a = ${a}, b = ${b}.`;
  } else if (kind === 'product') {
    expectedValue = (a + b) * (a - b);
    question = `Sz\u00e1m\u00edtsd ki: (a + b)(a - b), ahol a = ${a}, b = ${b}.`;
  } else if (kind === 'diff-squares') {
    expectedValue = (a + b) ** 2 - (a - b) ** 2;
    question = `Sz\u00e1m\u00edtsd ki: (a + b)^2 - (a - b)^2, ahol a = ${a}, b = ${b}.`;
  } else if (kind === 'scaled-square') {
    const coeff = pickNonZero(-6, 6);
    const c = randomInt(-8, 8);
    const x = randomInt(-5, 5);
    expectedValue = (coeff * x + c) ** 2;
    question = `Sz\u00e1m\u00edtsd ki: (${coeff}x + ${c})^2, ahol x = ${x}.`;
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

  while (questions.length < TEST_QUESTION_COUNT) {
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
  if (!userAnswer || !question) return false;
  const parsed = parseNumberInput(userAnswer);
  if (parsed === null || question.expectedValue === null) return false;
  return Math.abs(parsed - question.expectedValue) < 0.01;
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

function updateIdentityModel() {
  const a = parseNumberInput(idAInput.value || '');
  const b = parseNumberInput(idBInput.value || '');
  if (a === null || b === null) {
    idFormula.textContent = '-';
    idExpanded.textContent = '-';
    idOutput.textContent = '-';
    idError.textContent = 'Adj meg helyes sz\u00e1mokat.';
    idError.style.color = '#f04747';
    return;
  }

  let formulaText = '';
  let expandedText = '';
  let value = 0;

  if (activeIdentity === 'square-minus') {
    formulaText = `(${wrapValue(a)} - ${wrapValue(b)})^2`;
    value = (a - b) ** 2;
    expandedText = `${formatNumber(a * a)} - ${formatNumber(2 * a * b)} + ${formatNumber(b * b)} = ${formatNumber(value)}`;
  } else if (activeIdentity === 'product') {
    formulaText = `(${wrapValue(a)} + ${wrapValue(b)})(${wrapValue(a)} - ${wrapValue(b)})`;
    value = (a + b) * (a - b);
    expandedText = `${formatNumber(a * a)} - ${formatNumber(b * b)} = ${formatNumber(value)}`;
  } else {
    formulaText = `(${wrapValue(a)} + ${wrapValue(b)})^2`;
    value = (a + b) ** 2;
    expandedText = `${formatNumber(a * a)} + ${formatNumber(2 * a * b)} + ${formatNumber(b * b)} = ${formatNumber(value)}`;
  }

  idFormula.textContent = formulaText;
  idExpanded.textContent = expandedText;
  idOutput.textContent = formatNumber(value, 3);
  idError.textContent = '';
  idError.style.color = '';
}

function updateAxModel() {
  const a = parseNumberInput(axAInput.value || '');
  const b = parseNumberInput(axBInput.value || '');
  const x = parseNumberInput(axXInput.value || '');
  if (a === null || b === null || x === null) {
    axExpanded.textContent = '-';
    axOutput.textContent = '-';
    axError.textContent = 'Adj meg helyes sz\u00e1mokat.';
    axError.style.color = '#f04747';
    return;
  }
  const a2 = a * a;
  const mid = 2 * a * b;
  const constTerm = b * b;
  const value = (a * x + b) ** 2;
  axExpanded.textContent = formatPolynomial([a2, mid, constTerm]);
  axOutput.textContent = formatNumber(value, 3);
  axError.textContent = '';
  axError.style.color = '';
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveTab(button.dataset.tab);
  });
});

identityButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeIdentity = button.dataset.op || 'square-plus';
    identityButtons.forEach((btn) => {
      btn.classList.toggle('active', btn === button);
    });
    updateIdentityModel();
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

if (idAInput) idAInput.addEventListener('input', updateIdentityModel);
if (idBInput) idBInput.addEventListener('input', updateIdentityModel);
if (axAInput) axAInput.addEventListener('input', updateAxModel);
if (axBInput) axBInput.addEventListener('input', updateAxModel);
if (axXInput) axXInput.addEventListener('input', updateAxModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateIdentityModel();
updateAxModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
