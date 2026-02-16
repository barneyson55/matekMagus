const TOPIC_ID = 'nevezetes_vonalak';
const TOPIC_NAME = 'Nevezetes vonalak';
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
  [DIFF_EASY]: ['median-centroid', 'perp-bisector', 'midsegment'],
  [DIFF_NORMAL]: ['median-centroid', 'median-midpoint', 'angle-bisector', 'altitude-height', 'perp-bisector'],
  [DIFF_HARD]: ['median-centroid', 'median-midpoint', 'angle-bisector', 'altitude-height', 'midsegment']
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

const medianLengthInput = document.getElementById('median-length');
const centroidVertexOutput = document.getElementById('centroid-vertex');
const centroidMidOutput = document.getElementById('centroid-mid');
const medianNote = document.getElementById('median-note');

const bisectorBInput = document.getElementById('bisector-b');
const bisectorCInput = document.getElementById('bisector-c');
const bisectorAInput = document.getElementById('bisector-a');
const bisectorA1Output = document.getElementById('bisector-a1');
const bisectorA2Output = document.getElementById('bisector-a2');
const bisectorNote = document.getElementById('bisector-note');

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
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
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

function pickAngleBisectorCase() {
  let attempts = 0;
  while (attempts < 40) {
    const b = randomInt(4, 12);
    const c = randomInt(4, 12);
    const g = gcd(b, c);
    if (g < 2) {
      attempts += 1;
      continue;
    }
    const base = (b + c) / g;
    const maxK = g - 1;
    const k = randomInt(1, Math.max(1, maxK));
    const a = base * k;
    if (a <= Math.abs(b - c) || a >= b + c) {
      attempts += 1;
      continue;
    }
    const segment = (a * b) / (b + c);
    if (!Number.isFinite(segment)) {
      attempts += 1;
      continue;
    }
    return { a, b, c, segment };
  }
  return { a: 10, b: 6, c: 9, segment: 4 };
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;

  if (kind === 'median-centroid') {
    const median = randomInt(2, difficulty === DIFF_EASY ? 6 : 8) * 3;
    expectedValue = (2 / 3) * median;
    question = `Egy h\u00e1romsz\u00f6gben a s\u00falyvonal hossza ${median} cm. Mekkora a cs\u00facs \u00e9s a s\u00falypont t\u00e1vols\u00e1ga?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'median-midpoint') {
    const median = randomInt(2, difficulty === DIFF_NORMAL ? 7 : 9) * 3;
    expectedValue = median / 3;
    question = `A s\u00falyvonal hossza ${median} cm. Mekkora a s\u00falypont \u00e9s a felez\u0151pont t\u00e1vols\u00e1ga?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'perp-bisector') {
    const distance = randomInt(4, difficulty === DIFF_EASY ? 9 : 12);
    expectedValue = distance;
    question = `A felez\u0151 mer\u0151leges egyik pontja A-t\u00f3l ${distance} cm-re van. Mennyi a t\u00e1vols\u00e1ga B-t\u0151l?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'midsegment') {
    let side = randomInt(6, difficulty === DIFF_EASY ? 14 : 18);
    if (side % 2 !== 0) side += 1;
    expectedValue = side / 2;
    question = `Egy h\u00e1romsz\u00f6g egyik oldala ${side} cm. Mennyi a vele p\u00e1rhuzamos k\u00f6z\u00e9pvonal hossza?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'altitude-height') {
    let base = randomInt(6, difficulty === DIFF_EASY ? 12 : 16);
    if (base % 2 !== 0) base += 1;
    const height = randomInt(4, difficulty === DIFF_HARD ? 14 : 10);
    const area = (base * height) / 2;
    expectedValue = height;
    question = `A h\u00e1romsz\u00f6g ter\u00fclete ${formatNumber(area)} cm\u00b2, az alap ${base} cm. Mennyi a hozz\u00e1 tartoz\u00f3 magass\u00e1g?`;
    answerString = formatNumber(expectedValue);
  } else if (kind === 'angle-bisector') {
    const selection = pickAngleBisectorCase();
    expectedValue = selection.segment;
    question = `Egy h\u00e1romsz\u00f6gben b=${selection.b} cm, c=${selection.c} cm, a=${selection.a} cm. Mennyi az a oldalon a b fel\u0151li szakasz hossza a sz\u00f6gfelez\u0151 szerint?`;
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

function updateMedianModel() {
  const medianValue = parseNumberInput(medianLengthInput.value || '');
  if (!medianValue || medianValue.value <= 0) {
    centroidVertexOutput.textContent = '-';
    centroidMidOutput.textContent = '-';
    medianNote.textContent = 'Adj meg pozit\u00edv hossz\u00fat.';
    medianNote.style.color = '#f04747';
    return;
  }
  const vertexDistance = (2 / 3) * medianValue.value;
  const midDistance = medianValue.value / 3;
  centroidVertexOutput.textContent = `${formatNumber(vertexDistance)} cm`;
  centroidMidOutput.textContent = `${formatNumber(midDistance)} cm`;
  medianNote.textContent = '';
  medianNote.style.color = '';
}

function updateBisectorModel() {
  const bValue = parseNumberInput(bisectorBInput.value || '');
  const cValue = parseNumberInput(bisectorCInput.value || '');
  const aValue = parseNumberInput(bisectorAInput.value || '');

  if (!aValue || !bValue || !cValue || aValue.value <= 0 || bValue.value <= 0 || cValue.value <= 0) {
    bisectorA1Output.textContent = '-';
    bisectorA2Output.textContent = '-';
    bisectorNote.textContent = 'Adj meg minden oldalhosszt.';
    bisectorNote.style.color = '#f04747';
    return;
  }
  if (aValue.value >= bValue.value + cValue.value || aValue.value <= Math.abs(bValue.value - cValue.value)) {
    bisectorA1Output.textContent = '-';
    bisectorA2Output.textContent = '-';
    bisectorNote.textContent = 'Az oldalak nem alkotnak h\u00e1romsz\u00f6get.';
    bisectorNote.style.color = '#f04747';
    return;
  }
  const total = bValue.value + cValue.value;
  const segment1 = (aValue.value * bValue.value) / total;
  const segment2 = aValue.value - segment1;
  bisectorA1Output.textContent = `${formatNumber(segment1)} cm`;
  bisectorA2Output.textContent = `${formatNumber(segment2)} cm`;
  bisectorNote.textContent = '';
  bisectorNote.style.color = '';
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

if (medianLengthInput) medianLengthInput.addEventListener('input', updateMedianModel);
if (bisectorBInput) bisectorBInput.addEventListener('input', updateBisectorModel);
if (bisectorCInput) bisectorCInput.addEventListener('input', updateBisectorModel);
if (bisectorAInput) bisectorAInput.addEventListener('input', updateBisectorModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateMedianModel();
updateBisectorModel();
announceActiveTab(activeTab);
startTest();
window.parent.postMessage({ type: 'request-settings' }, '*');
