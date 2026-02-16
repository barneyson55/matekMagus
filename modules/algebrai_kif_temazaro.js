const TOPIC_ID = 'algebrai_kif_temazaro';
const TOPIC_NAME = 'Algebrai kifejez\u00e9sek';
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
  [DIFF_EASY]: ['linear', 'quadratic', 'identity-plus', 'identity-minus'],
  [DIFF_NORMAL]: ['linear', 'quadratic', 'identity-plus', 'identity-product', 'fraction'],
  [DIFF_HARD]: ['quadratic', 'cubic', 'identity-minus', 'identity-product', 'fraction', 'mixed']
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

const polyAInput = document.getElementById('poly-a');
const polyBInput = document.getElementById('poly-b');
const polyCInput = document.getElementById('poly-c');
const polyXInput = document.getElementById('poly-x');
const polyFormula = document.getElementById('poly-formula');
const polyOutput = document.getElementById('poly-output');
const polyError = document.getElementById('poly-error');

const idAInput = document.getElementById('id-a');
const idBInput = document.getElementById('id-b');
const idFormula = document.getElementById('id-formula');
const idOutput = document.getElementById('id-output');
const idError = document.getElementById('id-error');
const identityButtons = document.querySelectorAll('.operation-btn');

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

function parseDecimalInput(value) {
  const raw = normalizeInput(value);
  if (!raw) return null;
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
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

function parseNumberInput(value) {
  const raw = normalizeInput(value);
  if (!raw) return null;
  if (/^-?\d+\/-?\d+$/.test(raw)) {
    const [nRaw, dRaw] = raw.split('/');
    const n = Number(nRaw);
    const d = Number(dRaw);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    const simplified = simplifyFraction(n, d);
    return simplified ? { value: simplified.n / simplified.d, fraction: simplified } : null;
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? { value: parsed, fraction: null } : null;
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

function formatLinearExpression(a, b) {
  return formatPolynomial([
    { coef: a, variable: 'x', power: 1 },
    { coef: b, variable: '', power: 0 }
  ]);
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;
  let expectedFraction = null;

  if (kind === 'linear') {
    let a = pickNonZero(-5, 5);
    let b = randomInt(-9, 9);
    let x = randomInt(-4, 4);
    if (difficulty === DIFF_NORMAL) {
      a = pickNonZero(-7, 7);
      b = randomInt(-12, 12);
      x = randomInt(-5, 5);
    } else if (difficulty === DIFF_HARD) {
      a = pickNonZero(-9, 9);
      b = randomInt(-14, 14);
      x = randomInt(-6, 6);
    }
    const expression = formatLinearExpression(a, b);
    expectedValue = a * x + b;
    question = `Sz\u00e1m\u00edtsd ki: ${expression}, ha x = ${x}`;
  } else if (kind === 'quadratic') {
    let a = pickNonZero(-4, 4);
    let b = randomInt(-6, 6);
    let c = randomInt(-8, 8);
    let x = randomInt(-3, 3);
    if (difficulty === DIFF_NORMAL) {
      a = pickNonZero(-5, 5);
      b = randomInt(-8, 8);
      c = randomInt(-10, 10);
      x = randomInt(-4, 4);
    } else if (difficulty === DIFF_HARD) {
      a = pickNonZero(-6, 6);
      b = randomInt(-9, 9);
      c = randomInt(-12, 12);
      x = randomInt(-5, 5);
    }
    const expression = formatPolynomial([
      { coef: a, variable: 'x', power: 2 },
      { coef: b, variable: 'x', power: 1 },
      { coef: c, variable: '', power: 0 }
    ]);
    expectedValue = a * x * x + b * x + c;
    question = `Sz\u00e1m\u00edtsd ki: ${expression}, ha x = ${x}`;
  } else if (kind === 'cubic') {
    const a = pickNonZero(-3, 3);
    const b = randomInt(-5, 5);
    const c = randomInt(-6, 6);
    const d = randomInt(-10, 10);
    const x = randomInt(-3, 3);
    const expression = formatPolynomial([
      { coef: a, variable: 'x', power: 3 },
      { coef: b, variable: 'x', power: 2 },
      { coef: c, variable: 'x', power: 1 },
      { coef: d, variable: '', power: 0 }
    ]);
    expectedValue = a * x ** 3 + b * x ** 2 + c * x + d;
    question = `Sz\u00e1m\u00edtsd ki: ${expression}, ha x = ${x}`;
  } else if (kind === 'mixed') {
    const a = pickNonZero(-6, 6);
    const b = randomInt(-8, 8);
    const c = randomInt(-10, 10);
    const x = randomInt(-4, 4);
    const inner = b === 0 ? 'x' : `x ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
    let expression = `${formatValue(a)}(${inner})`;
    if (c !== 0) {
      expression += ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
    }
    expectedValue = a * (x + b) + c;
    question = `Sz\u00e1m\u00edtsd ki: ${expression}, ha x = ${x}`;
  } else if (kind === 'identity-plus') {
    const a = randomInt(1, 9);
    const b = randomInt(1, 9);
    expectedValue = (a + b) ** 2;
    question = `Sz\u00e1m\u00edtsd ki: (${formatValue(a)} + ${formatValue(b)})^2`;
  } else if (kind === 'identity-minus') {
    const a = randomInt(2, 10);
    const b = randomInt(1, 9);
    expectedValue = (a - b) ** 2;
    question = `Sz\u00e1m\u00edtsd ki: (${formatValue(a)} - ${formatValue(b)})^2`;
  } else if (kind === 'identity-product') {
    const a = randomInt(2, 10);
    const b = randomInt(1, 9);
    expectedValue = a * a - b * b;
    question = `Sz\u00e1m\u00edtsd ki: (${formatValue(a)} + ${formatValue(b)})(${formatValue(a)} - ${formatValue(b)})`;
  } else if (kind === 'fraction') {
    let a = pickNonZero(-5, 5);
    let b = randomInt(-8, 8);
    let c = pickNonZero(-5, 5);
    let d = randomInt(-8, 8);
    let x = randomInt(-4, 4);
    if (difficulty === DIFF_NORMAL) {
      a = pickNonZero(-7, 7);
      b = randomInt(-10, 10);
      c = pickNonZero(-7, 7);
      d = randomInt(-10, 10);
      x = randomInt(-5, 5);
    } else if (difficulty === DIFF_HARD) {
      a = pickNonZero(-9, 9);
      b = randomInt(-12, 12);
      c = pickNonZero(-9, 9);
      d = randomInt(-12, 12);
      x = randomInt(-6, 6);
    }
    let denom = c * x + d;
    let attempts = 0;
    while (denom === 0 && attempts < 10) {
      x = randomInt(-6, 6);
      denom = c * x + d;
      attempts += 1;
    }
    if (denom === 0) {
      d += 1;
      denom = c * x + d;
    }
    const numerator = a * x + b;
    const fraction = simplifyFraction(numerator, denom);
    expectedFraction = fraction;
    expectedValue = numerator / denom;
    const numeratorText = formatLinearExpression(a, b);
    const denomText = formatLinearExpression(c, d);
    question = `Sz\u00e1m\u00edtsd ki: (${numeratorText}) / (${denomText}), ha x = ${x}`;
  }

  if (expectedValue !== null) {
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
  const parsed = parseNumberInput(userAnswer || '');
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
  if (!practiceActive || !currentPracticeExpected) return;
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

function updatePolynomialModel() {
  const a = parseDecimalInput(polyAInput.value || '');
  const b = parseDecimalInput(polyBInput.value || '');
  const c = parseDecimalInput(polyCInput.value || '');
  const x = parseDecimalInput(polyXInput.value || '');
  if (a === null || b === null || c === null || x === null) {
    polyFormula.textContent = '-';
    polyOutput.textContent = '-';
    polyError.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    polyError.style.color = '#f04747';
    return;
  }
  const value = a * x * x + b * x + c;
  const expression = formatPolynomial([
    { coef: a, variable: 'x', power: 2 },
    { coef: b, variable: 'x', power: 1 },
    { coef: c, variable: '', power: 0 }
  ]);
  polyFormula.textContent = expression;
  polyOutput.textContent = formatNumber(value, 3);
  polyError.textContent = '';
  polyError.style.color = '';
}

function updateIdentityModel() {
  const a = parseDecimalInput(idAInput.value || '');
  const b = parseDecimalInput(idBInput.value || '');
  if (a === null || b === null) {
    idFormula.textContent = '-';
    idOutput.textContent = '-';
    idError.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    idError.style.color = '#f04747';
    return;
  }
  let expression = '';
  let value = 0;
  if (activeIdentity === 'square-minus') {
    expression = `(${formatValue(a)} - ${formatValue(b)})^2`;
    value = (a - b) ** 2;
  } else if (activeIdentity === 'product') {
    expression = `(${formatValue(a)} + ${formatValue(b)})(${formatValue(a)} - ${formatValue(b)})`;
    value = a * a - b * b;
  } else {
    expression = `(${formatValue(a)} + ${formatValue(b)})^2`;
    value = (a + b) ** 2;
  }
  idFormula.textContent = expression;
  idOutput.textContent = formatNumber(value, 3);
  idError.textContent = '';
  idError.style.color = '';
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

identityButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeIdentity = button.dataset.op || 'square-plus';
    identityButtons.forEach((btn) => {
      btn.classList.toggle('active', btn === button);
    });
    updateIdentityModel();
  });
});

if (polyAInput) polyAInput.addEventListener('input', updatePolynomialModel);
if (polyBInput) polyBInput.addEventListener('input', updatePolynomialModel);
if (polyCInput) polyCInput.addEventListener('input', updatePolynomialModel);
if (polyXInput) polyXInput.addEventListener('input', updatePolynomialModel);
if (idAInput) idAInput.addEventListener('input', updateIdentityModel);
if (idBInput) idBInput.addEventListener('input', updateIdentityModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updatePolynomialModel();
updateIdentityModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
