const TOPIC_ID = 'szogtetelek';
const TOPIC_NAME = 'Pitagorasz, befog\u00f3, magass\u00e1g';
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
  [DIFF_EASY]: ['pyth-c', 'pyth-leg'],
  [DIFF_NORMAL]: ['pyth-leg', 'cathetus', 'altitude'],
  [DIFF_HARD]: ['cathetus', 'altitude', 'projection']
};

const TRIPLES = [
  { a: 3, b: 4, c: 5 },
  { a: 5, b: 12, c: 13 },
  { a: 6, b: 8, c: 10 },
  { a: 7, b: 24, c: 25 },
  { a: 8, b: 15, c: 17 },
  { a: 9, b: 12, c: 15 },
  { a: 9, b: 40, c: 41 },
  { a: 12, b: 16, c: 20 }
];

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

const pythAInput = document.getElementById('pyth-a');
const pythBInput = document.getElementById('pyth-b');
const pythCOutput = document.getElementById('pyth-c');
const pythNote = document.getElementById('pyth-note');

const projCInput = document.getElementById('proj-c');
const projPInput = document.getElementById('proj-p');
const projQInput = document.getElementById('proj-q');
const projAOutput = document.getElementById('proj-a');
const projBOutput = document.getElementById('proj-b');
const projMOutput = document.getElementById('proj-m');
const projNote = document.getElementById('proj-note');

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

function pickTriple(difficulty) {
  const base = TRIPLES[randomInt(0, TRIPLES.length - 1)];
  const factor = difficulty === DIFF_HARD ? randomInt(1, 3) : difficulty === DIFF_NORMAL ? randomInt(1, 2) : 1;
  return {
    a: base.a * factor,
    b: base.b * factor,
    c: base.c * factor
  };
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;

  const triple = pickTriple(difficulty);
  const a = triple.a;
  const b = triple.b;
  const c = triple.c;
  const p = (a * a) / c;
  const q = (b * b) / c;
  const m = Math.sqrt(p * q);

  if (kind === 'pyth-c') {
    question = `Egy der\u00e9ksz\u00f6g\u0171 h\u00e1romsz\u00f6g befog\u00f3i ${a} cm \u00e9s ${b} cm. Mennyi az \u00e1tfog\u00f3?`;
    expectedValue = c;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'pyth-leg') {
    const knownLeg = randomInt(0, 1) === 0 ? a : b;
    const missingLeg = knownLeg === a ? b : a;
    question = `Egy der\u00e9ksz\u00f6g\u0171 h\u00e1romsz\u00f6g \u00e1tfog\u00f3ja ${c} cm, egyik befog\u00f3ja ${knownLeg} cm. Mennyi a m\u00e1sik befog\u00f3?`;
    expectedValue = missingLeg;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'cathetus') {
    const useA = randomInt(0, 1) === 0;
    const projection = useA ? p : q;
    const leg = useA ? a : b;
    question = `Az \u00e1tfog\u00f3 ${formatNumber(c)} cm, a megfelel\u0151 vet\u00fclet ${formatNumber(projection)} cm. Mennyi a befog\u00f3 hossza?`;
    expectedValue = leg;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'altitude') {
    question = `Az \u00e1tfog\u00f3 vet\u00fcletei p=${formatNumber(p)} cm \u00e9s q=${formatNumber(q)} cm. Mennyi a magass\u00e1g?`;
    expectedValue = m;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'projection') {
    question = `Egy der\u00e9ksz\u00f6g\u0171 h\u00e1romsz\u00f6gben a befog\u00f3 ${a} cm, az \u00e1tfog\u00f3 ${c} cm. Mennyi az ehhez tartoz\u00f3 vet\u00fclet?`;
    expectedValue = p;
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
  return Math.abs(parsed.value - question.expectedValue) < 0.02;
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

function updatePythModel() {
  const aValue = parseNumberInput(pythAInput.value || '');
  const bValue = parseNumberInput(pythBInput.value || '');

  if (!aValue || !bValue || aValue.value <= 0 || bValue.value <= 0) {
    pythCOutput.textContent = '-';
    pythNote.textContent = 'Adj meg mindk\u00e9t befog\u00f3t pozit\u00edv hosszal.';
    pythNote.style.color = '#f04747';
    return;
  }

  const cValue = Math.sqrt(aValue.value * aValue.value + bValue.value * bValue.value);
  pythCOutput.textContent = `${formatNumber(cValue)} cm`;
  pythNote.textContent = '';
  pythNote.style.color = '';
}

function updateProjectionModel() {
  const cValue = parseNumberInput(projCInput.value || '');
  const pValue = parseNumberInput(projPInput.value || '');
  const qValue = parseNumberInput(projQInput.value || '');

  if (!cValue || !pValue || !qValue || cValue.value <= 0 || pValue.value <= 0 || qValue.value <= 0) {
    projAOutput.textContent = '-';
    projBOutput.textContent = '-';
    projMOutput.textContent = '-';
    projNote.textContent = 'Adj meg minden adatot pozit\u00edv hosszal.';
    projNote.style.color = '#f04747';
    return;
  }

  const aValue = Math.sqrt(cValue.value * pValue.value);
  const bValue = Math.sqrt(cValue.value * qValue.value);
  const mValue = Math.sqrt(pValue.value * qValue.value);

  projAOutput.textContent = `${formatNumber(aValue)} cm`;
  projBOutput.textContent = `${formatNumber(bValue)} cm`;
  projMOutput.textContent = `${formatNumber(mValue)} cm`;

  const sum = pValue.value + qValue.value;
  if (Math.abs(sum - cValue.value) > 0.05) {
    projNote.textContent = 'Ellen\u0151rizd: p + q = c.';
    projNote.style.color = '#f04747';
  } else {
    projNote.textContent = '';
    projNote.style.color = '';
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

if (pythAInput) pythAInput.addEventListener('input', updatePythModel);
if (pythBInput) pythBInput.addEventListener('input', updatePythModel);
if (projCInput) projCInput.addEventListener('input', updateProjectionModel);
if (projPInput) projPInput.addEventListener('input', updateProjectionModel);
if (projQInput) projQInput.addEventListener('input', updateProjectionModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updatePythModel();
updateProjectionModel();
announceActiveTab(activeTab);
startTest();
window.parent.postMessage({ type: 'request-settings' }, '*');
