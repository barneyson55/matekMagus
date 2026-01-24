const TOPIC_ID = 'szinusz_koszinusz_tetel';
const TOPIC_NAME = 'Szinuszt\u00e9tel, Koszinuszt\u00e9tel';
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
  [DIFF_EASY]: ['sine-side', 'cosine-side'],
  [DIFF_NORMAL]: ['sine-side', 'sine-angle', 'cosine-side'],
  [DIFF_HARD]: ['sine-angle', 'cosine-side', 'cosine-angle']
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

const sinSideAInput = document.getElementById('sin-side-a');
const sinAngleAInput = document.getElementById('sin-angle-a');
const sinAngleBInput = document.getElementById('sin-angle-b');
const sinSideBOutput = document.getElementById('sin-side-b');
const sinAngleCOutput = document.getElementById('sin-angle-c');
const sinNote = document.getElementById('sin-note');

const cosSideAInput = document.getElementById('cos-side-a');
const cosSideBInput = document.getElementById('cos-side-b');
const cosAngleCInput = document.getElementById('cos-angle-c');
const cosSideCOutput = document.getElementById('cos-side-c');
const cosNote = document.getElementById('cos-note');

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

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function generateAngles() {
  let a = randomInt(25, 70);
  let b = randomInt(30, 85);
  let attempts = 0;
  while (a + b >= 170 && attempts < 20) {
    a = randomInt(25, 70);
    b = randomInt(30, 85);
    attempts += 1;
  }
  return { a, b, c: 180 - a - b };
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;

  if (kind === 'sine-side') {
    const angles = generateAngles();
    const sideA = randomInt(6, difficulty === DIFF_HARD ? 14 : 12);
    const sideB = (sideA * Math.sin(toRadians(angles.b))) / Math.sin(toRadians(angles.a));
    question = `Egy h\u00e1romsz\u00f6gben A=${angles.a}\u00b0, B=${angles.b}\u00b0, a=${sideA} cm. Mennyi a b oldal hossza?`;
    expectedValue = sideB;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'sine-angle') {
    const angles = generateAngles();
    const sideA = randomInt(6, difficulty === DIFF_HARD ? 16 : 13);
    const sideB = (sideA * Math.sin(toRadians(angles.b))) / Math.sin(toRadians(angles.a));
    question = `Egy h\u00e1romsz\u00f6gben A=${angles.a}\u00b0, a=${sideA} cm, b=${formatNumber(sideB)} cm. Mennyi a B sz\u00f6g?`;
    expectedValue = angles.b;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'cosine-side') {
    const sideA = randomInt(5, difficulty === DIFF_EASY ? 11 : 14);
    const sideB = randomInt(6, difficulty === DIFF_EASY ? 12 : 15);
    const angleC = randomInt(40, difficulty === DIFF_HARD ? 130 : 110);
    const cSquared = sideA * sideA + sideB * sideB - 2 * sideA * sideB * Math.cos(toRadians(angleC));
    const sideC = Math.sqrt(Math.max(0, cSquared));
    question = `Egy h\u00e1romsz\u00f6gben a=${sideA} cm, b=${sideB} cm, C=${angleC}\u00b0. Mennyi a c oldal?`;
    expectedValue = sideC;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'cosine-angle') {
    const angles = generateAngles();
    const sideA = randomInt(6, 12);
    const sideB = randomInt(7, 13);
    const sideC = Math.sqrt(sideA * sideA + sideB * sideB - 2 * sideA * sideB * Math.cos(toRadians(angles.c)));
    const cosC = clamp((sideA * sideA + sideB * sideB - sideC * sideC) / (2 * sideA * sideB), -1, 1);
    const angleC = toDegrees(Math.acos(cosC));
    question = `Egy h\u00e1romsz\u00f6gben a=${sideA} cm, b=${sideB} cm, c=${formatNumber(sideC)} cm. Mennyi a C sz\u00f6g?`;
    expectedValue = angleC;
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
  const parsed = parseNumberInput(userAnswer || '');
  if (!parsed || question.expectedValue === null) return false;
  return Math.abs(parsed.value - question.expectedValue) < 0.05;
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

function updateSineModel() {
  const sideA = parseNumberInput(sinSideAInput.value || '');
  const angleA = parseNumberInput(sinAngleAInput.value || '');
  const angleB = parseNumberInput(sinAngleBInput.value || '');

  if (!sideA || !angleA || !angleB || sideA.value <= 0 || angleA.value <= 0 || angleB.value <= 0) {
    sinSideBOutput.textContent = '-';
    sinAngleCOutput.textContent = '-';
    sinNote.textContent = 'Adj meg pozit\u00edv oldalt \u00e9s sz\u00f6geket.';
    sinNote.style.color = '#f04747';
    return;
  }

  const sumAngles = angleA.value + angleB.value;
  if (sumAngles >= 180) {
    sinSideBOutput.textContent = '-';
    sinAngleCOutput.textContent = '-';
    sinNote.textContent = 'A sz\u00f6gek \u00f6sszege legyen kisebb 180\u00b0-n\u00e1l.';
    sinNote.style.color = '#f04747';
    return;
  }

  const sideB = (sideA.value * Math.sin(toRadians(angleB.value))) / Math.sin(toRadians(angleA.value));
  const angleC = 180 - sumAngles;

  sinSideBOutput.textContent = `${formatNumber(sideB)} cm`;
  sinAngleCOutput.textContent = `${formatNumber(angleC)}\u00b0`;
  sinNote.textContent = '';
  sinNote.style.color = '';
}

function updateCosineModel() {
  const sideA = parseNumberInput(cosSideAInput.value || '');
  const sideB = parseNumberInput(cosSideBInput.value || '');
  const angleC = parseNumberInput(cosAngleCInput.value || '');

  if (!sideA || !sideB || !angleC || sideA.value <= 0 || sideB.value <= 0 || angleC.value <= 0) {
    cosSideCOutput.textContent = '-';
    cosNote.textContent = 'Adj meg minden adatot pozit\u00edv hosszal.';
    cosNote.style.color = '#f04747';
    return;
  }

  if (angleC.value >= 180) {
    cosSideCOutput.textContent = '-';
    cosNote.textContent = 'A sz\u00f6g legyen kisebb 180\u00b0-n\u00e1l.';
    cosNote.style.color = '#f04747';
    return;
  }

  const cSquared = sideA.value * sideA.value + sideB.value * sideB.value
    - 2 * sideA.value * sideB.value * Math.cos(toRadians(angleC.value));
  const sideC = Math.sqrt(Math.max(0, cSquared));

  cosSideCOutput.textContent = `${formatNumber(sideC)} cm`;
  cosNote.textContent = '';
  cosNote.style.color = '';
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

if (sinSideAInput) sinSideAInput.addEventListener('input', updateSineModel);
if (sinAngleAInput) sinAngleAInput.addEventListener('input', updateSineModel);
if (sinAngleBInput) sinAngleBInput.addEventListener('input', updateSineModel);
if (cosSideAInput) cosSideAInput.addEventListener('input', updateCosineModel);
if (cosSideBInput) cosSideBInput.addEventListener('input', updateCosineModel);
if (cosAngleCInput) cosAngleCInput.addEventListener('input', updateCosineModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateSineModel();
updateCosineModel();
announceActiveTab(activeTab);
startTest();
window.parent.postMessage({ type: 'request-settings' }, '*');
