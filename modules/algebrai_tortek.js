const TOPIC_ID = 'algebrai_tortek';
const TOPIC_NAME = 'Algebrai t\u00f6rtek';
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
  [DIFF_EASY]: ['eval-integer', 'eval-fraction'],
  [DIFF_NORMAL]: ['eval-fraction', 'eval-simplify', 'eval-integer'],
  [DIFF_HARD]: ['eval-fraction', 'eval-simplify', 'eval-integer']
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

const fracAInput = document.getElementById('frac-a');
const fracBInput = document.getElementById('frac-b');
const fracCInput = document.getElementById('frac-c');
const fracDInput = document.getElementById('frac-d');
const fracXInput = document.getElementById('frac-x');
const fractionFormula = document.getElementById('fraction-formula');
const fractionSimplified = document.getElementById('fraction-simplified');
const fractionValue = document.getElementById('fraction-value');
const fractionError = document.getElementById('fraction-error');

const numeratorValue = document.getElementById('numerator-value');
const denominatorValue = document.getElementById('denominator-value');
const excludedX = document.getElementById('excluded-x');
const domainNote = document.getElementById('domain-note');

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
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function formatFraction(n, d) {
  if (d === 1) return String(n);
  return `${n}/${d}`;
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

function formatLinearExpression(a, b) {
  return formatPolynomial([a, b]);
}

function pickRange(difficulty) {
  if (difficulty === DIFF_EASY) return 4;
  if (difficulty === DIFF_NORMAL) return 6;
  return 8;
}

function pickX(difficulty) {
  if (difficulty === DIFF_EASY) return randomInt(-3, 3);
  if (difficulty === DIFF_NORMAL) return randomInt(-4, 4);
  return randomInt(-5, 5);
}

function buildFractionParams(difficulty, options = {}) {
  const range = pickRange(difficulty);
  let attempts = 0;
  while (attempts < 60) {
    let a = pickNonZero(-range, range);
    let b = randomInt(-range, range);
    let c = pickNonZero(-range, range);
    let d = randomInt(-range, range);
    const x = pickX(difficulty);
    let denom = c * x + d;
    if (denom === 0) {
      attempts += 1;
      continue;
    }

    if (options.integer) {
      const k = pickNonZero(-6, 6);
      b = k * denom - a * x;
      if (Math.abs(b) > range * 3) {
        attempts += 1;
        continue;
      }
    }

    if (options.simplify) {
      const scale = randomInt(2, 4);
      a *= scale;
      b *= scale;
      c *= scale;
      d *= scale;
      denom = c * x + d;
      if (denom === 0) {
        attempts += 1;
        continue;
      }
    }

    const numerator = a * x + b;
    const fraction = simplifyFraction(numerator, denom);
    if (!fraction) {
      attempts += 1;
      continue;
    }

    if (options.fraction && fraction.d === 1) {
      attempts += 1;
      continue;
    }

    return {
      a,
      b,
      c,
      d,
      x,
      numerator,
      denominator: denom,
      fraction
    };
  }

  const fallback = {
    a: 1,
    b: 1,
    c: 1,
    d: 0,
    x: 1
  };
  fallback.numerator = fallback.a * fallback.x + fallback.b;
  fallback.denominator = fallback.c * fallback.x + fallback.d;
  fallback.fraction = simplifyFraction(fallback.numerator, fallback.denominator);
  return fallback;
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;
  let expectedFraction = null;

  let params = null;
  if (kind === 'eval-integer') {
    params = buildFractionParams(difficulty, { integer: true });
  } else if (kind === 'eval-simplify') {
    params = buildFractionParams(difficulty, { simplify: true, fraction: true });
  } else {
    params = buildFractionParams(difficulty, { fraction: true });
  }

  expectedValue = params.numerator / params.denominator;
  expectedFraction = params.fraction;
  const numeratorText = formatLinearExpression(params.a, params.b);
  const denomText = formatLinearExpression(params.c, params.d);
  question = `Sz\u00e1m\u00edtsd ki: (${numeratorText}) / (${denomText}), ha x = ${params.x}.`;
  answerString = formatFraction(expectedFraction.n, expectedFraction.d);

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

function buildExcludedX(c, d) {
  if (c === 0 && d === 0) return 'minden x tiltott';
  if (c === 0) return 'nincs tiltott x';
  const fraction = simplifyFraction(-d, c);
  return `x != ${formatFraction(fraction.n, fraction.d)}`;
}

function updateFractionModel() {
  const a = parseNumberInput(fracAInput.value || '');
  const b = parseNumberInput(fracBInput.value || '');
  const c = parseNumberInput(fracCInput.value || '');
  const d = parseNumberInput(fracDInput.value || '');
  const x = parseNumberInput(fracXInput.value || '');
  if (a === null || b === null || c === null || d === null || x === null) {
    fractionFormula.textContent = '-';
    fractionSimplified.textContent = '-';
    fractionValue.textContent = '-';
    numeratorValue.textContent = '-';
    denominatorValue.textContent = '-';
    excludedX.textContent = '-';
    fractionError.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    fractionError.style.color = '#f04747';
    domainNote.textContent = '';
    return;
  }

  const numerator = a * x + b;
  const denominator = c * x + d;
  const numeratorText = formatLinearExpression(a, b);
  const denomText = formatLinearExpression(c, d);
  fractionFormula.textContent = `(${numeratorText}) / (${denomText})`;
  numeratorValue.textContent = formatNumber(numerator, 3);
  denominatorValue.textContent = formatNumber(denominator, 3);
  excludedX.textContent = buildExcludedX(c, d);

  if (denominator === 0) {
    fractionSimplified.textContent = '-';
    fractionValue.textContent = '-';
    fractionError.textContent = 'A nevez\u0151 nem lehet 0.';
    fractionError.style.color = '#f04747';
    domainNote.textContent = 'Ebben az x-ben a t\u00f6rt nem \u00e9rtelmezett.';
    return;
  }

  const simplified = simplifyFraction(numerator, denominator);
  if (!simplified) {
    fractionSimplified.textContent = '-';
    fractionValue.textContent = '-';
    fractionError.textContent = 'Nem siker\u00fclt egyszer\u0171s\u00edteni.';
    fractionError.style.color = '#f04747';
    domainNote.textContent = '';
    return;
  }

  fractionSimplified.textContent = formatFraction(simplified.n, simplified.d);
  fractionValue.textContent = formatNumber(numerator / denominator, 3);
  fractionError.textContent = '';
  fractionError.style.color = '';
  domainNote.textContent = '';
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

if (fracAInput) fracAInput.addEventListener('input', updateFractionModel);
if (fracBInput) fracBInput.addEventListener('input', updateFractionModel);
if (fracCInput) fracCInput.addEventListener('input', updateFractionModel);
if (fracDInput) fracDInput.addEventListener('input', updateFractionModel);
if (fracXInput) fracXInput.addEventListener('input', updateFractionModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateFractionModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
