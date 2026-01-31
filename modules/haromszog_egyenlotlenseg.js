const TOPIC_ID = 'haromszog_egyenlotlenseg';
const TOPIC_NAME = 'H\u00e1romsz\u00f6g-egyenl\u0151tlens\u00e9g';
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
  [DIFF_EASY]: ['min-third', 'max-third'],
  [DIFF_NORMAL]: ['min-third', 'max-third', 'count-possible'],
  [DIFF_HARD]: ['min-third', 'max-third', 'count-possible', 'range-size']
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

const ineqSideAInput = document.getElementById('ineq-side-a');
const ineqSideBInput = document.getElementById('ineq-side-b');
const ineqSideCInput = document.getElementById('ineq-side-c');
const ineqStatus = document.getElementById('ineq-status');
const ineqPerimeter = document.getElementById('ineq-perimeter');
const ineqNote = document.getElementById('ineq-note');

const rangeSideAInput = document.getElementById('range-side-a');
const rangeSideBInput = document.getElementById('range-side-b');
const rangeMinOutput = document.getElementById('range-min');
const rangeMaxOutput = document.getElementById('range-max');
const rangeCountOutput = document.getElementById('range-count');
const rangeNote = document.getElementById('range-note');

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

function normalizeInput(value) {
  return value.trim().replace(/\s+/g, '').replace(',', '.').replace(':', '/');
}

function parseNumberInput(value) {
  const raw = normalizeInput(value);
  if (!raw) return null;
  if (/^-?\d+\/-?\d+$/.test(raw)) {
    const [nRaw, dRaw] = raw.split('/');
    const n = Number(nRaw);
    const d = Number(dRaw);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return { value: n / d };
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? { value: parsed } : null;
}

function formatNumber(value, precision = 2) {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function pickSides(difficulty) {
  const minSide = difficulty === DIFF_EASY ? 4 : 5;
  const maxSide = difficulty === DIFF_HARD ? 18 : difficulty === DIFF_NORMAL ? 14 : 12;
  const a = randomInt(minSide, maxSide);
  const b = randomInt(minSide, maxSide);
  return { a, b };
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;

  const { a, b } = pickSides(difficulty);
  const minThird = Math.abs(a - b) + 1;
  const maxThird = a + b - 1;

  if (kind === 'min-third') {
    expectedValue = minThird;
    question = `K\u00e9t oldal hossza ${a} cm \u00e9s ${b} cm. Mennyi lehet a harmadik oldal legkisebb eg\u00e9sz hossza?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'max-third') {
    expectedValue = maxThird;
    question = `K\u00e9t oldal hossza ${a} cm \u00e9s ${b} cm. Mennyi lehet a harmadik oldal legnagyobb eg\u00e9sz hossza?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'count-possible') {
    expectedValue = maxThird - minThird + 1;
    question = `K\u00e9t oldal hossza ${a} cm \u00e9s ${b} cm. H\u00e1ny k\u00fcl\u00f6nb\u00f6z\u0151 eg\u00e9sz hossz\u00fas\u00e1g\u00fa harmadik oldal lehets\u00e9ges?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'range-size') {
    expectedValue = maxThird - minThird;
    question = `K\u00e9t oldal hossza ${a} cm \u00e9s ${b} cm. Mekkora a legnagyobb \u00e9s a legkisebb eg\u00e9sz harmadik oldal k\u00f6zti k\u00fcl\u00f6nbs\u00e9g?`;
    answerString = formatNumber(expectedValue);
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

  const seedKinds = shuffle(types).slice(0, Math.min(types.length, TEST_QUESTION_COUNT));
  seedKinds.forEach((kind) => {
    let attempts = 0;
    let q = null;
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

  for (let safety = 0; questions.length < poolTarget && safety < poolTarget * 25; safety += 1) {
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
  const parsed = parseNumberInput(userAnswer || '');
  if (!parsed || question.expectedValue === null) return false;
  return Math.abs(parsed.value - question.expectedValue) < 0.01;
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

function updateInequalityModel() {
  const aValue = parseNumberInput(ineqSideAInput.value || '');
  const bValue = parseNumberInput(ineqSideBInput.value || '');
  const cValue = parseNumberInput(ineqSideCInput.value || '');

  if (!aValue || !bValue || !cValue || aValue.value <= 0 || bValue.value <= 0 || cValue.value <= 0) {
    ineqStatus.textContent = '-';
    ineqPerimeter.textContent = '-';
    ineqNote.textContent = 'Adj meg minden oldalt pozit\u00edv hosszal.';
    ineqNote.style.color = '#f04747';
    return;
  }

  const inequalityOk = (aValue.value + bValue.value > cValue.value)
    && (aValue.value + cValue.value > bValue.value)
    && (bValue.value + cValue.value > aValue.value);

  ineqStatus.textContent = inequalityOk ? 'Teljes\u00fcl' : 'Nem teljes\u00fcl';
  ineqPerimeter.textContent = inequalityOk
    ? `${formatNumber(aValue.value + bValue.value + cValue.value)} cm`
    : '-';

  if (!inequalityOk) {
    ineqNote.textContent = 'Az oldalak nem alkotnak h\u00e1romsz\u00f6get.';
    ineqNote.style.color = '#f04747';
  } else {
    ineqNote.textContent = '';
    ineqNote.style.color = '';
  }
}

function updateRangeModel() {
  const aValue = parseNumberInput(rangeSideAInput.value || '');
  const bValue = parseNumberInput(rangeSideBInput.value || '');

  if (!aValue || !bValue || aValue.value <= 0 || bValue.value <= 0) {
    rangeMinOutput.textContent = '-';
    rangeMaxOutput.textContent = '-';
    rangeCountOutput.textContent = '-';
    rangeNote.textContent = 'Adj meg k\u00e9t pozit\u00edv oldalt.';
    rangeNote.style.color = '#f04747';
    return;
  }

  const minThird = Math.abs(aValue.value - bValue.value) + 1;
  const maxThird = aValue.value + bValue.value - 1;
  if (minThird > maxThird) {
    rangeMinOutput.textContent = '-';
    rangeMaxOutput.textContent = '-';
    rangeCountOutput.textContent = '0';
    rangeNote.textContent = 'Nincs lehets\u00e9ges harmadik oldal.';
    rangeNote.style.color = '#f04747';
    return;
  }

  rangeMinOutput.textContent = `${formatNumber(minThird)} cm`;
  rangeMaxOutput.textContent = `${formatNumber(maxThird)} cm`;
  rangeCountOutput.textContent = formatNumber(maxThird - minThird + 1, 0);
  rangeNote.textContent = '';
  rangeNote.style.color = '';
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

if (ineqSideAInput) ineqSideAInput.addEventListener('input', updateInequalityModel);
if (ineqSideBInput) ineqSideBInput.addEventListener('input', updateInequalityModel);
if (ineqSideCInput) ineqSideCInput.addEventListener('input', updateInequalityModel);
if (rangeSideAInput) rangeSideAInput.addEventListener('input', updateRangeModel);
if (rangeSideBInput) rangeSideBInput.addEventListener('input', updateRangeModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateInequalityModel();
updateRangeModel();
announceActiveTab(activeTab);
startTest();
window.parent.postMessage({ type: 'request-settings' }, '*');
