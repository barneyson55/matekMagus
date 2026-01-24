const TOPIC_ID = 'masodfoku_fuggveny';
const TOPIC_NAME = 'M\u00e1sodfok\u00fa f\u00fcggv\u00e9ny';
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
  [DIFF_EASY]: ['axis-x', 'y-intercept', 'value-at-x'],
  [DIFF_NORMAL]: ['axis-x', 'vertex-y', 'discriminant', 'value-at-x'],
  [DIFF_HARD]: ['axis-x', 'vertex-y', 'root-larger', 'root-smaller', 'value-at-x']
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

const quadAInput = document.getElementById('quadf-a');
const quadBInput = document.getElementById('quadf-b');
const quadCInput = document.getElementById('quadf-c');
const parabolaEquation = document.getElementById('parabola-equation');
const parabolaAxis = document.getElementById('parabola-axis');
const parabolaVertex = document.getElementById('parabola-vertex');
const parabolaOpening = document.getElementById('parabola-opening');
const parabolaRange = document.getElementById('parabola-range');
const parabolaDiscriminant = document.getElementById('parabola-discriminant');
const parabolaRootOne = document.getElementById('parabola-root-1');
const parabolaRootTwo = document.getElementById('parabola-root-2');
const parabolaRootStatus = document.getElementById('parabola-root-status');
const parabolaYIntercept = document.getElementById('parabola-y-intercept');
const parabolaNote = document.getElementById('parabola-note');

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

function pickFrom(list) {
  return list[randomInt(0, list.length - 1)];
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

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

function simplifyFraction(n, d) {
  if (d === 0) return null;
  const sign = d < 0 ? -1 : 1;
  const nn = n * sign;
  const dd = Math.abs(d);
  const g = gcd(nn, dd);
  return {
    n: nn / g,
    d: dd / g
  };
}

function parseAnswer(value) {
  const raw = normalizeInput(value);
  if (!raw) return null;
  if (/^-?\d+\/-?\d+$/.test(raw)) {
    const parts = raw.split('/');
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    const fraction = simplifyFraction(num, den);
    return fraction ? { value: fraction.n / fraction.d, fraction } : null;
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? { value: parsed, fraction: null } : null;
}

function parseNumberInput(value) {
  const parsed = parseAnswer(value);
  return parsed ? parsed.value : null;
}

function formatNumber(value, precision = 3) {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function formatValue(value) {
  if (value < 0) return `(${value})`;
  return String(value);
}

function formatTerm(coef, variable, power, isFirst) {
  const absCoef = Math.abs(coef);
  const sign = coef < 0 ? '-' : (isFirst ? '' : '+');
  const signText = sign ? `${sign} ` : '';
  let coefText = '';
  if (!(variable && absCoef === 1)) {
    coefText = String(absCoef);
  }
  let variableText = '';
  if (variable) {
    variableText = power === 1 ? variable : `${variable}^${power}`;
  }
  return `${signText}${coefText}${variableText}`.trim();
}

function formatPolynomial(terms) {
  const filtered = terms.filter(term => term.coef !== 0);
  if (!filtered.length) return '0';
  return filtered
    .map((term, index) => formatTerm(term.coef, term.variable, term.power, index === 0))
    .join(' ');
}

function formatQuadraticExpression(a, b, c) {
  return formatPolynomial([
    { coef: a, variable: 'x', power: 2 },
    { coef: b, variable: 'x', power: 1 },
    { coef: c, variable: '', power: 0 }
  ]);
}

function pickLeading(difficulty) {
  if (difficulty === DIFF_EASY) {
    return pickFrom([-2, -1, 1, 2]);
  }
  if (difficulty === DIFF_NORMAL) {
    return pickFrom([-3, -2, -1, 1, 2, 3]);
  }
  return pickFrom([-4, -3, -2, -1, 1, 2, 3, 4]);
}

function buildVertexData(difficulty) {
  const a = pickLeading(difficulty);
  const hRange = difficulty === DIFF_EASY ? 3 : (difficulty === DIFF_NORMAL ? 4 : 5);
  const kRange = difficulty === DIFF_EASY ? 5 : (difficulty === DIFF_NORMAL ? 7 : 9);
  const h = randomInt(-hRange, hRange);
  const k = randomInt(-kRange, kRange);
  const b = -2 * a * h;
  const c = a * h * h + k;
  return { a, b, c, h, k };
}

function buildDiscriminantData(difficulty) {
  const a = pickLeading(difficulty);
  const range = difficulty === DIFF_EASY ? 5 : 7;
  const b = randomInt(-range, range);
  const c = randomInt(-range, range);
  return { a, b, c };
}

function buildRootData(difficulty) {
  const range = difficulty === DIFF_EASY ? 4 : (difficulty === DIFF_NORMAL ? 6 : 8);
  let r1 = randomInt(-range, range);
  let r2 = randomInt(-range, range);
  while (r2 === r1) {
    r2 = randomInt(-range, range);
  }
  const a = pickLeading(difficulty);
  const b = -a * (r1 + r2);
  const c = a * r1 * r2;
  return { a, b, c, r1, r2 };
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;

  if (kind === 'axis-x') {
    const data = buildVertexData(difficulty);
    question = `Add meg a parabola szimmetriatengely\u00e9t: f(x) = ${formatQuadraticExpression(data.a, data.b, data.c)}.`;
    expectedValue = data.h;
    answerString = formatNumber(data.h, 3);
  } else if (kind === 'vertex-y') {
    const data = buildVertexData(difficulty);
    question = `Add meg a cs\u00facspont y-koordin\u00e1t\u00e1j\u00e1t: f(x) = ${formatQuadraticExpression(data.a, data.b, data.c)}.`;
    expectedValue = data.k;
    answerString = formatNumber(data.k, 3);
  } else if (kind === 'y-intercept') {
    const data = buildVertexData(difficulty);
    question = `Mekkora a f\u00fcggv\u00e9ny y-metszete (f(0))? f(x) = ${formatQuadraticExpression(data.a, data.b, data.c)}.`;
    expectedValue = data.c;
    answerString = formatNumber(data.c, 3);
  } else if (kind === 'value-at-x') {
    const data = buildVertexData(difficulty);
    const x0 = randomInt(-3, 3);
    const value = data.a * x0 * x0 + data.b * x0 + data.c;
    question = `Sz\u00e1mold ki: f(${formatValue(x0)}) = ? ha f(x) = ${formatQuadraticExpression(data.a, data.b, data.c)}.`;
    expectedValue = value;
    answerString = formatNumber(value, 3);
  } else if (kind === 'discriminant') {
    const data = buildDiscriminantData(difficulty);
    const dValue = data.b * data.b - 4 * data.a * data.c;
    question = `Sz\u00e1m\u00edtsd ki a diszkrimin\u00e1nst: f(x) = ${formatQuadraticExpression(data.a, data.b, data.c)}.`;
    expectedValue = dValue;
    answerString = formatNumber(dValue, 3);
  } else if (kind === 'root-larger' || kind === 'root-smaller') {
    const data = buildRootData(difficulty);
    const target = kind === 'root-larger' ? Math.max(data.r1, data.r2) : Math.min(data.r1, data.r2);
    const label = kind === 'root-larger' ? 'nagyobbik' : 'kisebbik';
    question = `Add meg a ${label} z\u00e9rushelyet: f(x) = ${formatQuadraticExpression(data.a, data.b, data.c)}.`;
    expectedValue = target;
    answerString = formatNumber(target, 3);
  }

  if (expectedValue !== null && !answerString) {
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
  const parsed = parseAnswer(userAnswer || '');
  if (!parsed || question.expectedValue === null || question.expectedValue === undefined) return false;
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
    grade,
    percentage,
    timestamp: new Date().toISOString(),
    questions: testQuestions.map((q) => ({
      question: q.question,
      kind: q.kind,
      expectedValue: q.expectedValue,
      userAnswer: q.userAnswer || '',
      correctAnswer: q.correctAnswer || q.answerString,
      isCorrect: q.isCorrect
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

function updateParabolaModel() {
  const a = parseNumberInput(quadAInput.value || '');
  const b = parseNumberInput(quadBInput.value || '');
  const c = parseNumberInput(quadCInput.value || '');
  if (a === null || b === null || c === null) {
    parabolaEquation.textContent = '-';
    parabolaAxis.textContent = '-';
    parabolaVertex.textContent = '-';
    parabolaOpening.textContent = '-';
    parabolaRange.textContent = '-';
    parabolaDiscriminant.textContent = '-';
    parabolaRootOne.textContent = '-';
    parabolaRootTwo.textContent = '-';
    parabolaRootStatus.textContent = '-';
    parabolaYIntercept.textContent = '-';
    parabolaNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    parabolaNote.style.color = '#f04747';
    return;
  }

  parabolaEquation.textContent = `f(x) = ${formatQuadraticExpression(a, b, c)}`;

  if (a === 0) {
    parabolaAxis.textContent = '-';
    parabolaVertex.textContent = '-';
    parabolaOpening.textContent = '-';
    parabolaRange.textContent = '-';
    parabolaDiscriminant.textContent = '-';
    parabolaRootOne.textContent = '-';
    parabolaRootTwo.textContent = '-';
    parabolaRootStatus.textContent = '-';
    parabolaYIntercept.textContent = '-';
    parabolaNote.textContent = 'Ez nem m\u00e1sodfok\u00fa f\u00fcggv\u00e9ny.';
    parabolaNote.style.color = '#f04747';
    return;
  }

  const axis = -b / (2 * a);
  const vertexY = a * axis * axis + b * axis + c;
  const dValue = b * b - 4 * a * c;

  parabolaAxis.textContent = `x = ${formatNumber(axis, 3)}`;
  parabolaVertex.textContent = `(${formatNumber(axis, 3)}, ${formatNumber(vertexY, 3)})`;
  parabolaOpening.textContent = a > 0 ? 'Felfel\u00e9' : 'Lefel\u00e9';
  parabolaRange.textContent = `y ${a > 0 ? '>=' : '<='} ${formatNumber(vertexY, 3)}`;
  parabolaDiscriminant.textContent = formatNumber(dValue, 3);
  parabolaYIntercept.textContent = formatNumber(c, 3);
  parabolaNote.textContent = '';
  parabolaNote.style.color = '';

  if (dValue < -1e-9) {
    parabolaRootOne.textContent = '-';
    parabolaRootTwo.textContent = '-';
    parabolaRootStatus.textContent = 'Nincs val\u00f3s z\u00e9rushely';
    return;
  }

  if (Math.abs(dValue) < 1e-9) {
    const root = -b / (2 * a);
    parabolaRootOne.textContent = formatNumber(root, 3);
    parabolaRootTwo.textContent = formatNumber(root, 3);
    parabolaRootStatus.textContent = 'Egy z\u00e9rushely';
    return;
  }

  const sqrtD = Math.sqrt(dValue);
  const x1 = (-b - sqrtD) / (2 * a);
  const x2 = (-b + sqrtD) / (2 * a);
  parabolaRootOne.textContent = formatNumber(x1, 3);
  parabolaRootTwo.textContent = formatNumber(x2, 3);
  parabolaRootStatus.textContent = 'K\u00e9t val\u00f3s z\u00e9rushely';
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

if (quadAInput) quadAInput.addEventListener('input', updateParabolaModel);
if (quadBInput) quadBInput.addEventListener('input', updateParabolaModel);
if (quadCInput) quadCInput.addEventListener('input', updateParabolaModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateParabolaModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
