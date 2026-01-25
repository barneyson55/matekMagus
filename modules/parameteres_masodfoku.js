const TOPIC_ID = 'parameteres_masodfoku';
const TOPIC_NAME = 'Param\u00e9teres m\u00e1sodfok\u00fa egyenletek';
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
  [DIFF_EASY]: ['product-param', 'sum-param', 'root-param'],
  [DIFF_NORMAL]: ['product-param', 'sum-param', 'double-root', 'root-param'],
  [DIFF_HARD]: ['double-root', 'disc-param', 'root-param-advanced', 'sum-param-advanced']
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

const paramMInput = document.getElementById('param-m-input');
const paramEquation = document.getElementById('param-equation');
const paramDiscriminant = document.getElementById('param-discriminant');
const paramRootOne = document.getElementById('param-root-1');
const paramRootTwo = document.getElementById('param-root-2');
const paramStatus = document.getElementById('param-status');
const paramNote = document.getElementById('param-note');

const rootValueInput = document.getElementById('root-value-input');
const rootMOutput = document.getElementById('root-m-output');
const rootCheck = document.getElementById('root-check');
const rootNote = document.getElementById('root-note');

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

function formatParamLinear(k) {
  if (k === 0) return 'm';
  if (k > 0) return `m + ${k}`;
  return `m - ${Math.abs(k)}`;
}

function formatParamConstant(k) {
  if (k === 0) return 'm';
  if (k > 0) return `m + ${k}`;
  return `m - ${Math.abs(k)}`;
}

function pickLinearA(difficulty) {
  if (difficulty === DIFF_EASY) return 1;
  if (difficulty === DIFF_NORMAL) {
    const sign = Math.random() < 0.2 ? -1 : 1;
    return sign * randomInt(1, 2);
  }
  const sign = Math.random() < 0.5 ? -1 : 1;
  return sign * randomInt(1, 3);
}

function buildProductParam(difficulty) {
  const a = difficulty === DIFF_EASY ? randomInt(1, 3) : pickLinearA(difficulty);
  let b = randomInt(-6, 6);
  if (b === 0) b = randomInt(1, 6);
  let product = randomInt(-6, 6);
  if (product === 0) product = randomInt(1, 6);
  const mValue = a * product;
  const base = formatQuadraticExpression(a, b, 0);
  return {
    question: `Az egyenlet: ${base} + m = 0. A gy\u00f6k\u00f6k szorzata ${product}. Mennyi m?`,
    expectedValue: mValue,
    answerString: formatNumber(mValue, 3)
  };
}

function buildSumParam(difficulty, advanced) {
  const a = advanced ? pickLinearA(difficulty) : (difficulty === DIFF_EASY ? 1 : pickLinearA(difficulty));
  let c = randomInt(-7, 7);
  if (c === 0) c = randomInt(1, 6);
  let offset = randomInt(-5, 5);
  if (!advanced && offset === 0) offset = randomInt(1, 5);
  const sum = randomInt(-6, 6);
  const mValue = -a * sum - offset;
  const linear = formatParamLinear(offset);
  let equation = '';
  if (a === 1) equation = `x^2 + (${linear})x`;
  else if (a === -1) equation = `-x^2 + (${linear})x`;
  else equation = `${a}x^2 + (${linear})x`;
  equation += c < 0 ? ` - ${Math.abs(c)}` : ` + ${c}`;
  equation += ' = 0';
  return {
    question: `Az egyenlet: ${equation}. A gy\u00f6k\u00f6k \u00f6sszege ${sum}. Mennyi m?`,
    expectedValue: mValue,
    answerString: formatNumber(mValue, 3)
  };
}

function buildRootParam(difficulty, advanced) {
  const a = advanced ? pickLinearA(difficulty) : (difficulty === DIFF_EASY ? 1 : pickLinearA(difficulty));
  let b = randomInt(-6, 6);
  if (b === 0) b = randomInt(1, 6);
  const root = randomInt(-5, 5);
  const mValue = -a * root * root - b * root;
  const base = formatQuadraticExpression(a, b, 0);
  return {
    question: `Az egyenlet: ${base} + m = 0. Az egyik gy\u00f6k ${root}. Mennyi m?`,
    expectedValue: mValue,
    answerString: formatNumber(mValue, 3)
  };
}

function buildDoubleRoot(difficulty) {
  const a = difficulty === DIFF_EASY ? 1 : (Math.random() < 0.5 ? 1 : 2);
  let b = 0;
  if (a === 1) {
    const evenPool = [-8, -6, -4, -2, 2, 4, 6, 8];
    b = evenPool[randomInt(0, evenPool.length - 1)];
  } else {
    const evenPool = [-8, -4, 4, 8];
    b = evenPool[randomInt(0, evenPool.length - 1)];
  }
  const mValue = (b * b) / (4 * a);
  const base = formatQuadraticExpression(a, b, 0);
  return {
    question: `Az egyenlet: ${base} + m = 0. Milyen m eset\u00e9n lesz kett\u0151s gy\u00f6k?`,
    expectedValue: mValue,
    answerString: formatNumber(mValue, 3)
  };
}

function buildDiscParam(difficulty) {
  let b = randomInt(-7, 7);
  if (b === 0) b = randomInt(2, 7);
  let targetD = randomInt(1, 49);
  let numerator = b * b - targetD;
  let attempts = 0;
  while (attempts < 30) {
    numerator = b * b - targetD;
    const divisible = numerator % 4 === 0;
    if (difficulty === DIFF_HARD) {
      if (!divisible) break;
    } else {
      if (divisible) break;
    }
    targetD = randomInt(1, 49);
    attempts += 1;
  }
  const fraction = simplifyFraction(numerator, 4) || { n: 0, d: 1 };
  const mValue = numerator / 4;
  const base = formatQuadraticExpression(1, b, 0);
  const answerString = fraction.d === 1 ? formatNumber(mValue, 3) : formatFraction(fraction.n, fraction.d);
  return {
    question: `Az egyenlet: ${base} + m = 0. A diszkrimin\u00e1ns ${targetD}. Mennyi m?`,
    expectedValue: mValue,
    expectedFraction: fraction.d === 1 ? null : fraction,
    answerString
  };
}

function buildQuestion(kind, difficulty) {
  let result = null;

  if (kind === 'product-param') {
    result = buildProductParam(difficulty);
  } else if (kind === 'sum-param') {
    result = buildSumParam(difficulty, false);
  } else if (kind === 'sum-param-advanced') {
    result = buildSumParam(difficulty, true);
  } else if (kind === 'root-param') {
    result = buildRootParam(difficulty, false);
  } else if (kind === 'root-param-advanced') {
    result = buildRootParam(difficulty, true);
  } else if (kind === 'double-root') {
    result = buildDoubleRoot(difficulty);
  } else if (kind === 'disc-param') {
    result = buildDiscParam(difficulty);
  }

  return {
    kind,
    question: result.question,
    answerString: result.answerString,
    expectedValue: result.expectedValue,
    expectedFraction: result.expectedFraction || null
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

  while (questions.length < poolTarget) {
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

function updateParameterModel() {
  const mValue = parseNumberInput(paramMInput.value || '');
  if (mValue === null) {
    paramEquation.textContent = '-';
    paramDiscriminant.textContent = '-';
    paramRootOne.textContent = '-';
    paramRootTwo.textContent = '-';
    paramStatus.textContent = '-';
    paramNote.textContent = 'Adj meg \u00e9rv\u00e9nyes m \u00e9rt\u00e9ket.';
    paramNote.style.color = '#f04747';
    return;
  }

  const a = 1;
  const b = -4;
  const c = mValue;
  paramEquation.textContent = 'x^2 - 4x + m = 0';
  const dValue = b * b - 4 * a * c;
  paramDiscriminant.textContent = formatNumber(dValue, 3);

  if (dValue < 0) {
    paramRootOne.textContent = '-';
    paramRootTwo.textContent = '-';
    paramStatus.textContent = 'Nincs val\u00f3s gy\u00f6k';
    paramNote.textContent = 'A diszkrimin\u00e1ns negat\u00edv.';
    paramNote.style.color = '#f04747';
    return;
  }

  if (Math.abs(dValue) < 1e-9) {
    const root = -b / (2 * a);
    paramRootOne.textContent = formatNumber(root, 3);
    paramRootTwo.textContent = formatNumber(root, 3);
    paramStatus.textContent = 'K\u00e9tszeres gy\u00f6k';
    paramNote.textContent = '';
    paramNote.style.color = '';
    return;
  }

  const sqrtD = Math.sqrt(dValue);
  const x1 = (-b - sqrtD) / (2 * a);
  const x2 = (-b + sqrtD) / (2 * a);
  paramRootOne.textContent = formatNumber(x1, 3);
  paramRootTwo.textContent = formatNumber(x2, 3);
  paramStatus.textContent = 'K\u00e9t val\u00f3s gy\u00f6k';
  paramNote.textContent = '';
  paramNote.style.color = '';
}

function updateRootParameterModel() {
  const root = parseNumberInput(rootValueInput.value || '');
  if (root === null) {
    rootMOutput.textContent = '-';
    rootCheck.textContent = '-';
    rootNote.textContent = 'Adj meg \u00e9rv\u00e9nyes gy\u00f6k\u00f6t.';
    rootNote.style.color = '#f04747';
    return;
  }

  const mValue = -root * root + 4 * root;
  rootMOutput.textContent = formatNumber(mValue, 3);
  const checkValue = root * root - 4 * root + mValue;
  rootCheck.textContent = `${formatNumber(checkValue, 3)} = 0`;
  rootNote.textContent = '';
  rootNote.style.color = '';
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

if (paramMInput) paramMInput.addEventListener('input', updateParameterModel);
if (rootValueInput) rootValueInput.addEventListener('input', updateRootParameterModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateParameterModel();
updateRootParameterModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
