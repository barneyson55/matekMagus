const TOPIC_ID = 'haromszogek_temazaro';
const TOPIC_NAME = 'Alapfogalmak \u00e9s H\u00e1romsz\u00f6gek';
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
  [DIFF_EASY]: ['angle-sum', 'perimeter', 'area', 'midsegment'],
  [DIFF_NORMAL]: ['angle-sum', 'perimeter', 'area', 'midsegment', 'ineq-max', 'ineq-min', 'perimeter-missing', 'exterior-angle'],
  [DIFF_HARD]: ['angle-sum', 'area', 'ineq-max', 'ineq-min', 'perimeter-missing', 'midsegment', 'exterior-angle']
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

const angleAInput = document.getElementById('angle-a');
const angleBInput = document.getElementById('angle-b');
const angleCOutput = document.getElementById('angle-c');
const angleNote = document.getElementById('angle-note');

const sideAInput = document.getElementById('side-a');
const sideBInput = document.getElementById('side-b');
const sideCInput = document.getElementById('side-c');
const heightAInput = document.getElementById('height-a');
const trianglePerimeter = document.getElementById('triangle-perimeter');
const triangleArea = document.getElementById('triangle-area');
const triangleIneq = document.getElementById('triangle-ineq');
const triangleNote = document.getElementById('triangle-note');

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

function generateTriangleSides(min, max) {
  let attempts = 0;
  while (attempts < 40) {
    const a = randomInt(min, max);
    const b = randomInt(min, max);
    const c = randomInt(min, max);
    if (a + b > c && a + c > b && b + c > a) {
      return { a, b, c };
    }
    attempts += 1;
  }
  return { a: min + 1, b: min + 2, c: min + 2 };
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;

  if (kind === 'angle-sum') {
    let a = randomInt(30, 100);
    let b = randomInt(30, 100);
    let c = 180 - (a + b);
    let attempts = 0;
    while ((c <= 0 || c >= 160) && attempts < 20) {
      a = randomInt(25, 95);
      b = randomInt(25, 95);
      c = 180 - (a + b);
      attempts += 1;
    }
    question = `Egy h\u00e1romsz\u00f6gben k\u00e9t sz\u00f6g m\u00e9rete ${a}\u00b0 \u00e9s ${b}\u00b0. Mennyi a harmadik sz\u00f6g m\u00e9rete?`;
    expectedValue = c;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'exterior-angle') {
    const angle = randomInt(30, 150);
    const exterior = 180 - angle;
    question = `Egy h\u00e1romsz\u00f6g egyik bels\u0151 sz\u00f6ge ${angle}\u00b0. Mennyi a hozz\u00e1 tartoz\u00f3 k\u00fcls\u0151 sz\u00f6g?`;
    expectedValue = exterior;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'perimeter') {
    const sides = generateTriangleSides(3, difficulty === DIFF_EASY ? 9 : 12);
    expectedValue = sides.a + sides.b + sides.c;
    question = `Egy h\u00e1romsz\u00f6g oldalai a=${sides.a} cm, b=${sides.b} cm, c=${sides.c} cm. Mennyi a ker\u00fclete?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'perimeter-missing') {
    const sides = generateTriangleSides(4, difficulty === DIFF_HARD ? 15 : 12);
    const perimeter = sides.a + sides.b + sides.c;
    expectedValue = sides.c;
    question = `Egy h\u00e1romsz\u00f6g ker\u00fclete ${perimeter} cm, k\u00e9t oldala ${sides.a} cm \u00e9s ${sides.b} cm. Mennyi a harmadik oldal hossza?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'area') {
    let base = randomInt(4, difficulty === DIFF_EASY ? 12 : 16);
    let height = randomInt(4, difficulty === DIFF_EASY ? 10 : 14);
    if (difficulty === DIFF_EASY && base % 2 !== 0) base += 1;
    const area = (base * height) / 2;
    expectedValue = area;
    question = `Egy h\u00e1romsz\u00f6g alapja ${base} cm, a hozz\u00e1 tartoz\u00f3 magass\u00e1g ${height} cm. Mennyi a ter\u00fclete?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'midsegment') {
    let base = randomInt(6, difficulty === DIFF_EASY ? 14 : 18);
    if (difficulty === DIFF_EASY && base % 2 !== 0) base += 1;
    expectedValue = base / 2;
    question = `Egy h\u00e1romsz\u00f6g egyik oldala ${base} cm. Mennyi a hozz\u00e1 p\u00e1rhuzamos k\u00f6z\u00e9pvonal hossza?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'ineq-max') {
    let a = randomInt(4, difficulty === DIFF_EASY ? 10 : 14);
    let b = randomInt(4, difficulty === DIFF_EASY ? 10 : 14);
    if (a === b) b += 1;
    expectedValue = a + b - 1;
    question = `K\u00e9t oldal hossza ${a} cm \u00e9s ${b} cm. Mennyi lehet a harmadik oldal legnagyobb eg\u00e9sz hossza?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'ineq-min') {
    let a = randomInt(4, difficulty === DIFF_EASY ? 10 : 14);
    let b = randomInt(4, difficulty === DIFF_EASY ? 10 : 14);
    if (a === b) b += 2;
    expectedValue = Math.abs(a - b) + 1;
    question = `K\u00e9t oldal hossza ${a} cm \u00e9s ${b} cm. Mennyi lehet a harmadik oldal legkisebb eg\u00e9sz hossza?`;
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

function updateAngleModel() {
  const aValue = parseNumberInput(angleAInput.value || '');
  const bValue = parseNumberInput(angleBInput.value || '');
  if (!aValue || !bValue || aValue.value <= 0 || bValue.value <= 0) {
    angleCOutput.textContent = '-';
    angleNote.textContent = 'Adj meg k\u00e9t pozit\u00edv sz\u00f6get.';
    angleNote.style.color = '#f04747';
    return;
  }
  const sum = aValue.value + bValue.value;
  if (sum >= 180) {
    angleCOutput.textContent = '-';
    angleNote.textContent = 'A k\u00e9t sz\u00f6g \u00f6sszege legyen kisebb 180\u00b0-n\u00e1l.';
    angleNote.style.color = '#f04747';
    return;
  }
  const cValue = 180 - sum;
  angleCOutput.textContent = `${formatNumber(cValue)}\u00b0`;
  angleNote.textContent = '';
  angleNote.style.color = '';
}

function updateTriangleModel() {
  const aValue = parseNumberInput(sideAInput.value || '');
  const bValue = parseNumberInput(sideBInput.value || '');
  const cValue = parseNumberInput(sideCInput.value || '');
  const hValue = parseNumberInput(heightAInput.value || '');

  let noteText = '';
  let noteColor = '';

  if (aValue && bValue && cValue && aValue.value > 0 && bValue.value > 0 && cValue.value > 0) {
    const perim = aValue.value + bValue.value + cValue.value;
    trianglePerimeter.textContent = `${formatNumber(perim)} cm`;
    const inequalityOk = (aValue.value + bValue.value > cValue.value)
      && (aValue.value + cValue.value > bValue.value)
      && (bValue.value + cValue.value > aValue.value);
    triangleIneq.textContent = inequalityOk ? 'Teljes\u00fcl' : 'Nem teljes\u00fcl';
    if (!inequalityOk) {
      noteText = 'Az oldalak nem alkotnak h\u00e1romsz\u00f6get.';
      noteColor = '#f04747';
    }
  } else {
    trianglePerimeter.textContent = '-';
    triangleIneq.textContent = '-';
    noteText = 'Adj meg minden oldalt.';
    noteColor = '#f04747';
  }

  if (aValue && hValue && aValue.value > 0 && hValue.value > 0) {
    const area = (aValue.value * hValue.value) / 2;
    triangleArea.textContent = `${formatNumber(area)} cm\u00b2`;
  } else {
    triangleArea.textContent = '-';
    if (!noteText) {
      noteText = 'Adj meg alapot \u00e9s magass\u00e1got is.';
      noteColor = '#f04747';
    }
  }

  triangleNote.textContent = noteText;
  triangleNote.style.color = noteColor;
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

if (angleAInput) angleAInput.addEventListener('input', updateAngleModel);
if (angleBInput) angleBInput.addEventListener('input', updateAngleModel);
if (sideAInput) sideAInput.addEventListener('input', updateTriangleModel);
if (sideBInput) sideBInput.addEventListener('input', updateTriangleModel);
if (sideCInput) sideCInput.addEventListener('input', updateTriangleModel);
if (heightAInput) heightAInput.addEventListener('input', updateTriangleModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateAngleModel();
updateTriangleModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
