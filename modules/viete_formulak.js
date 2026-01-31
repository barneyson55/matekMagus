const TOPIC_ID = 'viete_formulak';
const TOPIC_NAME = 'Vi\u00e8te-formul\u00e1k';
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
  [DIFF_EASY]: ['sum-equation', 'product-equation', 'missing-root-sum'],
  [DIFF_NORMAL]: ['sum-equation', 'product-equation', 'missing-root-sum', 'missing-root-product', 'coeff-b'],
  [DIFF_HARD]: ['sum-equation', 'product-equation', 'missing-root-product', 'coeff-b', 'coeff-c']
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

const rootOneInput = document.getElementById('root-1-input');
const rootTwoInput = document.getElementById('root-2-input');
const leadAInput = document.getElementById('lead-a-input');
const rootSumOutput = document.getElementById('root-sum-output');
const rootProductOutput = document.getElementById('root-product-output');
const coeffBOutput = document.getElementById('coeff-b-output');
const coeffCOutput = document.getElementById('coeff-c-output');
const equationOutput = document.getElementById('equation-output');
const rootsNote = document.getElementById('roots-note');

const coefAInput = document.getElementById('coef-a-input');
const coefBInput = document.getElementById('coef-b-input');
const coefCInput = document.getElementById('coef-c-input');
const vietaSumOutput = document.getElementById('vieta-sum-output');
const vietaProductOutput = document.getElementById('vieta-product-output');
const coeffNote = document.getElementById('coeff-note');

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

function formatFraction(n, d) {
  if (d === 1) return String(n);
  return `${n}/${d}`;
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

function pickRootRange(difficulty) {
  if (difficulty === DIFF_EASY) return 5;
  if (difficulty === DIFF_NORMAL) return 7;
  return 9;
}

function pickLeadingA(difficulty) {
  if (difficulty === DIFF_EASY) return 1;
  if (difficulty === DIFF_NORMAL) {
    return (Math.random() < 0.5 ? -1 : 1) * randomInt(1, 2);
  }
  return (Math.random() < 0.5 ? -1 : 1) * randomInt(1, 3);
}

function pickRoots(range, options = {}) {
  let r1 = randomInt(-range, range);
  let r2 = randomInt(-range, range);
  let attempts = 0;
  while (attempts < 50) {
    if (options.nonZero && r1 === 0) {
      r1 = randomInt(-range, range);
      attempts += 1;
      continue;
    }
    if (options.nonZeroBoth && (r1 === 0 || r2 === 0)) {
      r1 = randomInt(-range, range);
      r2 = randomInt(-range, range);
      attempts += 1;
      continue;
    }
    if (options.distinct && r1 === r2) {
      r2 = randomInt(-range, range);
      attempts += 1;
      continue;
    }
    break;
  }
  return { r1, r2 };
}

function buildEquationFromRoots(difficulty, options = {}) {
  const range = pickRootRange(difficulty);
  const roots = pickRoots(range, options);
  const a = pickLeadingA(difficulty);
  const sum = roots.r1 + roots.r2;
  const product = roots.r1 * roots.r2;
  const b = -a * sum;
  const c = a * product;
  return { a, b, c, r1: roots.r1, r2: roots.r2, sum, product };
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;
  let expectedFraction = null;

  if (kind === 'sum-equation') {
    const data = buildEquationFromRoots(difficulty, { distinct: true });
    question = `Sz\u00e1m\u00edtsd ki a gy\u00f6k\u00f6k \u00f6sszeg\u00e9t: ${formatQuadraticExpression(data.a, data.b, data.c)} = 0.`;
    expectedValue = data.sum;
    answerString = formatNumber(data.sum, 3);
  } else if (kind === 'product-equation') {
    const data = buildEquationFromRoots(difficulty, { distinct: true });
    question = `Sz\u00e1m\u00edtsd ki a gy\u00f6k\u00f6k szorzat\u00e1t: ${formatQuadraticExpression(data.a, data.b, data.c)} = 0.`;
    expectedValue = data.product;
    answerString = formatNumber(data.product, 3);
  } else if (kind === 'missing-root-sum') {
    const range = pickRootRange(difficulty);
    const roots = pickRoots(range, { distinct: true });
    const sum = roots.r1 + roots.r2;
    question = `A gy\u00f6k\u00f6k \u00f6sszege ${sum}, az egyik gy\u00f6k ${roots.r1}. Mennyi a m\u00e1sik gy\u00f6k?`;
    expectedValue = roots.r2;
    answerString = formatNumber(roots.r2, 3);
  } else if (kind === 'missing-root-product') {
    const range = pickRootRange(difficulty);
    const roots = pickRoots(range, { nonZero: true, distinct: true });
    const product = roots.r1 * roots.r2;
    question = `A gy\u00f6k\u00f6k szorzata ${product}, az egyik gy\u00f6k ${roots.r1}. Mennyi a m\u00e1sik gy\u00f6k?`;
    expectedValue = roots.r2;
    answerString = formatNumber(roots.r2, 3);
  } else if (kind === 'coeff-b') {
    const data = buildEquationFromRoots(difficulty, { distinct: true });
    question = `Az egyenlet gy\u00f6kei ${data.r1} \u00e9s ${data.r2}, a = ${data.a}. Mennyi b az ax^2 + bx + c = 0 alakban?`;
    expectedValue = data.b;
    answerString = formatNumber(data.b, 3);
  } else if (kind === 'coeff-c') {
    const data = buildEquationFromRoots(difficulty, { distinct: true });
    question = `Az egyenlet gy\u00f6kei ${data.r1} \u00e9s ${data.r2}, a = ${data.a}. Mennyi c az ax^2 + bx + c = 0 alakban?`;
    expectedValue = data.c;
    answerString = formatNumber(data.c, 3);
  }

  if (expectedValue !== null && !answerString) {
    answerString = expectedFraction
      ? formatFraction(expectedFraction.n, expectedFraction.d)
      : formatNumber(expectedValue, 3);
  }

  return {
    kind,
    question,
    answerString,
    expectedValue,
    expectedFraction
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
  const parsed = parseAnswer(userAnswer || '');
  if (!parsed || question.expectedValue === null) return false;
  if (question.expectedFraction && parsed.fraction) {
    return parsed.fraction.n === question.expectedFraction.n
      && parsed.fraction.d === question.expectedFraction.d;
  }
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

function updateRootsModel() {
  const r1 = parseNumberInput(rootOneInput.value || '');
  const r2 = parseNumberInput(rootTwoInput.value || '');
  const a = parseNumberInput(leadAInput.value || '');
  if (r1 === null || r2 === null || a === null) {
    rootSumOutput.textContent = '-';
    rootProductOutput.textContent = '-';
    coeffBOutput.textContent = '-';
    coeffCOutput.textContent = '-';
    equationOutput.textContent = '-';
    rootsNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    rootsNote.style.color = '#f04747';
    return;
  }
  if (a === 0) {
    rootSumOutput.textContent = '-';
    rootProductOutput.textContent = '-';
    coeffBOutput.textContent = '-';
    coeffCOutput.textContent = '-';
    equationOutput.textContent = '-';
    rootsNote.textContent = 'Az a egy\u00fctthat\u00f3 nem lehet 0.';
    rootsNote.style.color = '#f04747';
    return;
  }

  const sum = r1 + r2;
  const product = r1 * r2;
  const b = -a * sum;
  const c = a * product;

  rootSumOutput.textContent = formatNumber(sum, 3);
  rootProductOutput.textContent = formatNumber(product, 3);
  coeffBOutput.textContent = formatNumber(b, 3);
  coeffCOutput.textContent = formatNumber(c, 3);
  equationOutput.textContent = `${formatQuadraticExpression(a, b, c)} = 0`;
  rootsNote.textContent = '';
  rootsNote.style.color = '';
}

function updateCoefficientsModel() {
  const a = parseNumberInput(coefAInput.value || '');
  const b = parseNumberInput(coefBInput.value || '');
  const c = parseNumberInput(coefCInput.value || '');
  if (a === null || b === null || c === null) {
    vietaSumOutput.textContent = '-';
    vietaProductOutput.textContent = '-';
    coeffNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    coeffNote.style.color = '#f04747';
    return;
  }
  if (a === 0) {
    vietaSumOutput.textContent = '-';
    vietaProductOutput.textContent = '-';
    coeffNote.textContent = 'Az a egy\u00fctthat\u00f3 nem lehet 0.';
    coeffNote.style.color = '#f04747';
    return;
  }

  const sum = -b / a;
  const product = c / a;
  vietaSumOutput.textContent = formatNumber(sum, 3);
  vietaProductOutput.textContent = formatNumber(product, 3);
  coeffNote.textContent = '';
  coeffNote.style.color = '';
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

if (rootOneInput) rootOneInput.addEventListener('input', updateRootsModel);
if (rootTwoInput) rootTwoInput.addEventListener('input', updateRootsModel);
if (leadAInput) leadAInput.addEventListener('input', updateRootsModel);
if (coefAInput) coefAInput.addEventListener('input', updateCoefficientsModel);
if (coefBInput) coefBInput.addEventListener('input', updateCoefficientsModel);
if (coefCInput) coefCInput.addEventListener('input', updateCoefficientsModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateRootsModel();
updateCoefficientsModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
