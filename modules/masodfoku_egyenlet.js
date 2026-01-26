const TOPIC_ID = 'masodfoku_egyenlet';
const TOPIC_NAME = 'M\u00e1sodfok\u00fa egyenlet';
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
  [DIFF_EASY]: ['discriminant', 'root-larger', 'root-smaller'],
  [DIFF_NORMAL]: ['discriminant', 'root-larger', 'root-smaller', 'root-count'],
  [DIFF_HARD]: ['discriminant', 'root-larger', 'root-smaller', 'root-count']
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

const quadAInput = document.getElementById('quad-a');
const quadBInput = document.getElementById('quad-b');
const quadCInput = document.getElementById('quad-c');
const quadraticFormula = document.getElementById('quadratic-formula');
const discriminantValue = document.getElementById('discriminant-value');
const rootOne = document.getElementById('root-1');
const rootTwo = document.getElementById('root-2');
const rootStatus = document.getElementById('root-status');
const rootNote = document.getElementById('root-note');
const rootSum = document.getElementById('root-sum');
const rootProduct = document.getElementById('root-product');
const vietaNote = document.getElementById('vieta-note');

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

function pickRootRange(difficulty) {
  if (difficulty === DIFF_EASY) return 4;
  if (difficulty === DIFF_NORMAL) return 6;
  return 8;
}

function pickQuadraticLeading(difficulty) {
  if (difficulty === DIFF_EASY) return 1;
  if (difficulty === DIFF_NORMAL) {
    const sign = Math.random() < 0.5 ? -1 : 1;
    return sign * randomInt(1, 2);
  }
  const sign = Math.random() < 0.5 ? -1 : 1;
  return sign * randomInt(1, 3);
}

function buildQuadraticFromRoots(r1, r2, difficulty) {
  const a = pickQuadraticLeading(difficulty);
  const b = -a * (r1 + r2);
  const c = a * r1 * r2;
  return { a, b, c, r1, r2 };
}

function buildRootCountEquation(difficulty) {
  const range = pickRootRange(difficulty);
  const positive = () => {
    let r1 = randomInt(-range, range);
    let r2 = randomInt(-range, range);
    while (r2 === r1) {
      r2 = randomInt(-range, range);
    }
    const data = buildQuadraticFromRoots(r1, r2, difficulty);
    return { a: data.a, b: data.b, c: data.c, count: 2 };
  };
  const zero = () => {
    const r = randomInt(-range, range);
    const data = buildQuadraticFromRoots(r, r, difficulty);
    return { a: data.a, b: data.b, c: data.c, count: 1 };
  };
  const negative = () => {
    const a = 1;
    const b = randomInt(-5, 5);
    const c = b * b + randomInt(1, 6);
    return { a, b, c, count: 0 };
  };

  const variants = [positive, zero];
  if (difficulty !== DIFF_EASY) {
    variants.push(negative);
  }
  const pick = variants[randomInt(0, variants.length - 1)];
  return pick();
}

function buildDiscriminantEquation(difficulty) {
  if (difficulty === DIFF_EASY) {
    const range = pickRootRange(difficulty);
    let r1 = randomInt(-range, range);
    let r2 = randomInt(-range, range);
    while (r2 === r1) {
      r2 = randomInt(-range, range);
    }
    return buildQuadraticFromRoots(r1, r2, difficulty);
  }

  const roll = Math.random();
  if (difficulty === DIFF_NORMAL && roll < 0.6) {
    const range = pickRootRange(difficulty);
    let r1 = randomInt(-range, range);
    let r2 = randomInt(-range, range);
    while (r2 === r1) {
      r2 = randomInt(-range, range);
    }
    return buildQuadraticFromRoots(r1, r2, difficulty);
  }

  if (difficulty === DIFF_HARD && roll < 0.4) {
    const range = pickRootRange(difficulty);
    let r1 = randomInt(-range, range);
    let r2 = randomInt(-range, range);
    while (r2 === r1) {
      r2 = randomInt(-range, range);
    }
    return buildQuadraticFromRoots(r1, r2, difficulty);
  }

  const coefRange = difficulty === DIFF_HARD ? 10 : 8;
  const a = pickNonZero(-3, 3);
  const b = randomInt(-coefRange, coefRange);
  const c = randomInt(-coefRange, coefRange);
  return { a, b, c };
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answerString = '';
  let expectedValue = null;
  let answerType = '';

  if (kind === 'discriminant') {
    const data = buildDiscriminantEquation(difficulty);
    const dValue = data.b * data.b - 4 * data.a * data.c;
    question = `Sz\u00e1m\u00edtsd ki a diszkrimin\u00e1nst: ${formatQuadraticExpression(data.a, data.b, data.c)} = 0.`;
    expectedValue = dValue;
    answerString = formatNumber(dValue, 3);
  } else if (kind === 'root-larger' || kind === 'root-smaller') {
    const range = pickRootRange(difficulty);
    let r1 = randomInt(-range, range);
    let r2 = randomInt(-range, range);
    while (r2 === r1) {
      r2 = randomInt(-range, range);
    }
    const data = buildQuadraticFromRoots(r1, r2, difficulty);
    const target = kind === 'root-larger' ? Math.max(r1, r2) : Math.min(r1, r2);
    const label = kind === 'root-larger' ? 'nagyobbik' : 'kisebbik';
    question = `Oldd meg: ${formatQuadraticExpression(data.a, data.b, data.c)} = 0. Add meg a ${label} gy\u00f6k\u00f6t.`;
    expectedValue = target;
    answerString = formatNumber(target, 3);
  } else if (kind === 'root-count') {
    const info = buildRootCountEquation(difficulty);
    question = `H\u00e1ny val\u00f3s gy\u00f6ke van: ${formatQuadraticExpression(info.a, info.b, info.c)} = 0?`;
    expectedValue = info.count;
    answerString = String(info.count);
    answerType = 'count';
  }

  if (expectedValue !== null && !answerString) {
    answerString = formatNumber(expectedValue, 3);
  }

  return {
    kind,
    question,
    answerString,
    expectedValue,
    answerType
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
  if (question.answerType === 'count') {
    if (!Number.isFinite(parsed.value)) return false;
    const rounded = Math.round(parsed.value);
    return Math.abs(parsed.value - rounded) < 1e-6 && rounded === question.expectedValue;
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

function updateQuadraticModel() {
  const a = parseNumberInput(quadAInput.value || '');
  const b = parseNumberInput(quadBInput.value || '');
  const c = parseNumberInput(quadCInput.value || '');
  if (a === null || b === null || c === null) {
    quadraticFormula.textContent = '-';
    discriminantValue.textContent = '-';
    rootOne.textContent = '-';
    rootTwo.textContent = '-';
    rootStatus.textContent = '-';
    rootSum.textContent = '-';
    rootProduct.textContent = '-';
    rootNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    rootNote.style.color = '#f04747';
    vietaNote.textContent = '';
    return;
  }

  quadraticFormula.textContent = `${formatQuadraticExpression(a, b, c)} = 0`;

  if (a === 0) {
    discriminantValue.textContent = '-';
    rootOne.textContent = '-';
    rootTwo.textContent = '-';
    rootStatus.textContent = '-';
    rootSum.textContent = '-';
    rootProduct.textContent = '-';
    rootNote.textContent = 'Ez nem m\u00e1sodfok\u00fa egyenlet.';
    rootNote.style.color = '#f04747';
    vietaNote.textContent = '';
    return;
  }

  const dValue = b * b - 4 * a * c;
  discriminantValue.textContent = formatNumber(dValue, 3);

  rootSum.textContent = formatNumber(-b / a, 3);
  rootProduct.textContent = formatNumber(c / a, 3);
  vietaNote.textContent = '';

  if (dValue < 0) {
    rootOne.textContent = '-';
    rootTwo.textContent = '-';
    rootStatus.textContent = 'Nincs val\u00f3s gy\u00f6k';
    rootNote.textContent = 'A diszkrimin\u00e1ns negat\u00edv.';
    rootNote.style.color = '#f04747';
    return;
  }

  if (Math.abs(dValue) < 1e-9) {
    const root = -b / (2 * a);
    rootOne.textContent = formatNumber(root, 3);
    rootTwo.textContent = formatNumber(root, 3);
    rootStatus.textContent = 'K\u00e9tszeres gy\u00f6k';
    rootNote.textContent = '';
    rootNote.style.color = '';
    return;
  }

  const sqrtD = Math.sqrt(dValue);
  const x1 = (-b - sqrtD) / (2 * a);
  const x2 = (-b + sqrtD) / (2 * a);
  rootOne.textContent = formatNumber(x1, 3);
  rootTwo.textContent = formatNumber(x2, 3);
  rootStatus.textContent = 'K\u00e9t val\u00f3s gy\u00f6k';
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

if (quadAInput) quadAInput.addEventListener('input', updateQuadraticModel);
if (quadBInput) quadBInput.addEventListener('input', updateQuadraticModel);
if (quadCInput) quadCInput.addEventListener('input', updateQuadraticModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateQuadraticModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
