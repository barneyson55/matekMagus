const TOPIC_ID = 'nevezetes_fuggvenyek_temazaro';
const TOPIC_NAME = 'Nevezetes f\u00fcggv\u00e9nyek';
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
  [DIFF_EASY]: ['linear-value', 'linear-zero', 'quadratic-vertex-x', 'power-value', 'exp-value', 'trig-value', 'abs-value'],
  [DIFF_NORMAL]: ['linear-value', 'linear-zero', 'quadratic-vertex-x', 'quadratic-vertex-y', 'exp-value', 'log-value', 'trig-value', 'abs-value', 'exp-monotone'],
  [DIFF_HARD]: ['linear-value', 'linear-zero', 'quadratic-vertex-y', 'quadratic-axis', 'power-value', 'exp-value', 'log-value', 'trig-value', 'abs-value', 'exp-monotone']
};

const TRIG_TABLES = {
  [DIFF_EASY]: [
    { fn: 'sin', angle: 0, value: 0 },
    { fn: 'sin', angle: 30, value: 0.5 },
    { fn: 'sin', angle: 90, value: 1 },
    { fn: 'cos', angle: 0, value: 1 },
    { fn: 'cos', angle: 60, value: 0.5 },
    { fn: 'cos', angle: 90, value: 0 }
  ],
  [DIFF_NORMAL]: [
    { fn: 'sin', angle: 0, value: 0 },
    { fn: 'sin', angle: 30, value: 0.5 },
    { fn: 'sin', angle: 210, value: -0.5 },
    { fn: 'sin', angle: 270, value: -1 },
    { fn: 'cos', angle: 0, value: 1 },
    { fn: 'cos', angle: 90, value: 0 },
    { fn: 'cos', angle: 120, value: -0.5 },
    { fn: 'cos', angle: 180, value: -1 }
  ],
  [DIFF_HARD]: [
    { fn: 'sin', angle: 30, value: 0.5 },
    { fn: 'sin', angle: 150, value: 0.5 },
    { fn: 'sin', angle: 210, value: -0.5 },
    { fn: 'sin', angle: 330, value: -0.5 },
    { fn: 'sin', angle: 270, value: -1 },
    { fn: 'cos', angle: 60, value: 0.5 },
    { fn: 'cos', angle: 120, value: -0.5 },
    { fn: 'cos', angle: 180, value: -1 },
    { fn: 'cos', angle: 300, value: 0.5 }
  ]
};

const TEXT_ALIASES = {
  novegvo: ['novegvo', 'novekvo'],
  csokkeno: ['csokkeno']
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

const linAInput = document.getElementById('lin-a');
const linBInput = document.getElementById('lin-b');
const linXInput = document.getElementById('lin-x');
const linEquation = document.getElementById('lin-equation');
const linValue = document.getElementById('lin-value');
const linZero = document.getElementById('lin-zero');
const linNote = document.getElementById('lin-note');

const quadAInput = document.getElementById('quad-a');
const quadBInput = document.getElementById('quad-b');
const quadCInput = document.getElementById('quad-c');
const quadEquation = document.getElementById('quad-equation');
const quadVertex = document.getElementById('quad-vertex');
const quadAxis = document.getElementById('quad-axis');
const quadDiscriminant = document.getElementById('quad-discriminant');
const quadRoots = document.getElementById('quad-roots');
const quadNote = document.getElementById('quad-note');

const expBaseInput = document.getElementById('exp-base');
const expExpInput = document.getElementById('exp-exp');
const expValue = document.getElementById('exp-value');
const expLog = document.getElementById('exp-log');
const expGrowth = document.getElementById('exp-growth');
const expNote = document.getElementById('exp-note');

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

function normalizeText(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\u00e1/g, 'a')
    .replace(/\u00e9/g, 'e')
    .replace(/\u00ed/g, 'i')
    .replace(/[\u00f3\u00f6\u0151]/g, 'o')
    .replace(/[\u00fa\u00fc\u0171]/g, 'u');
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

function formatFraction(n, d) {
  if (d === 1) return String(n);
  return `${n}/${d}`;
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

function formatLinearExpression(a, b) {
  if (a === 0) return formatNumber(b, 3);
  let term = '';
  if (a === 1) term = 'x';
  else if (a === -1) term = '-x';
  else term = `${formatNumber(a, 3)}x`;
  if (b === 0) return term;
  const sign = b > 0 ? ' + ' : ' - ';
  return `${term}${sign}${formatNumber(Math.abs(b), 3)}`;
}

function formatShiftedX(h) {
  if (h === 0) return 'x';
  if (h > 0) return `x - ${formatNumber(h, 3)}`;
  return `x + ${formatNumber(Math.abs(h), 3)}`;
}

function formatParabolaExpression(a, h, k) {
  const core = `(${formatShiftedX(h)})^2`;
  let expr = '';
  if (a === 1) expr = core;
  else if (a === -1) expr = `-${core}`;
  else expr = `${formatNumber(a, 3)}${core}`;
  if (k > 0) expr += ` + ${formatNumber(k, 3)}`;
  else if (k < 0) expr += ` - ${formatNumber(Math.abs(k), 3)}`;
  return expr;
}

function formatAbsExpression(a, h, k) {
  const core = `|${formatShiftedX(h)}|`;
  let expr = '';
  if (a === 1) expr = core;
  else if (a === -1) expr = `-${core}`;
  else expr = `${formatNumber(a, 3)}${core}`;
  if (k > 0) expr += ` + ${formatNumber(k, 3)}`;
  else if (k < 0) expr += ` - ${formatNumber(Math.abs(k), 3)}`;
  return expr;
}

function pickLinearRange(difficulty) {
  if (difficulty === DIFF_EASY) return 5;
  if (difficulty === DIFF_NORMAL) return 7;
  return 10;
}

function pickParabolaRange(difficulty) {
  if (difficulty === DIFF_EASY) return 4;
  if (difficulty === DIFF_NORMAL) return 6;
  return 8;
}

function pickParabolaParams(difficulty) {
  const range = pickParabolaRange(difficulty);
  let a = randomInt(1, difficulty === DIFF_HARD ? 3 : 2);
  if (Math.random() < 0.5) a *= -1;
  const h = randomInt(-range, range);
  const k = randomInt(-range, range);
  return { a, h, k };
}

function buildLinearValue(difficulty) {
  const range = pickLinearRange(difficulty);
  const a = pickNonZero(-range, range);
  const b = randomInt(-range, range);
  const x = randomInt(-range, range);
  const y = a * x + b;
  return {
    question: `Sz\u00e1m\u00edtsd ki: f(x) = ${formatLinearExpression(a, b)}. Mennyi f(${formatNumber(x, 3)})?`,
    answerString: formatNumber(y, 3),
    answerType: 'number',
    expectedValue: y
  };
}

function buildLinearZero(difficulty) {
  const range = pickLinearRange(difficulty);
  const a = pickNonZero(-range, range);
  const b = randomInt(-range, range);
  const fraction = simplifyFraction(-b, a);
  const answerValue = fraction ? fraction.n / fraction.d : -b / a;
  const answerString = fraction ? formatFraction(fraction.n, fraction.d) : formatNumber(answerValue, 3);
  return {
    question: `Add meg a f(x) = ${formatLinearExpression(a, b)} f\u00fcggv\u00e9ny z\u00e9rushely\u00e9t.`,
    answerString,
    answerType: 'number',
    expectedValue: answerValue
  };
}

function buildQuadraticVertexX(difficulty) {
  const params = pickParabolaParams(difficulty);
  return {
    question: `A f(x) = ${formatParabolaExpression(params.a, params.h, params.k)} parabol\u00e1nak mennyi a cs\u00facs\u00e1nak x koordin\u00e1t\u00e1ja?`,
    answerString: formatNumber(params.h, 3),
    answerType: 'number',
    expectedValue: params.h
  };
}

function buildQuadraticVertexY(difficulty) {
  const params = pickParabolaParams(difficulty);
  return {
    question: `A f(x) = ${formatParabolaExpression(params.a, params.h, params.k)} parabol\u00e1nak mennyi a cs\u00facs\u00e1nak y koordin\u00e1t\u00e1ja?`,
    answerString: formatNumber(params.k, 3),
    answerType: 'number',
    expectedValue: params.k
  };
}

function buildQuadraticAxis(difficulty) {
  const params = pickParabolaParams(difficulty);
  return {
    question: `A f(x) = ${formatParabolaExpression(params.a, params.h, params.k)} parabol\u00e1nak mi a tengelye? Add meg x \u00e9rt\u00e9ket.`,
    answerString: formatNumber(params.h, 3),
    answerType: 'number',
    expectedValue: params.h
  };
}

function buildPowerValue(difficulty) {
  const range = difficulty === DIFF_EASY ? 3 : (difficulty === DIFF_NORMAL ? 4 : 5);
  const base = randomInt(-range, range);
  const exp = difficulty === DIFF_EASY ? randomInt(2, 3) : randomInt(2, 4);
  const value = Math.pow(base, exp);
  return {
    question: `Sz\u00e1m\u00edtsd ki: ${base}^${exp}`,
    answerString: formatNumber(value, 3),
    answerType: 'number',
    expectedValue: value
  };
}

function buildExpValue(difficulty) {
  const base = difficulty === DIFF_HARD ? randomInt(2, 6) : randomInt(2, 5);
  const exp = difficulty === DIFF_EASY ? randomInt(2, 3) : randomInt(2, 4);
  const value = Math.pow(base, exp);
  return {
    question: `Sz\u00e1m\u00edtsd ki: ${base}^${exp}`,
    answerString: formatNumber(value, 3),
    answerType: 'number',
    expectedValue: value
  };
}

function buildLogValue(difficulty) {
  const base = difficulty === DIFF_HARD ? randomInt(2, 6) : randomInt(2, 5);
  const exp = difficulty === DIFF_EASY ? 2 : randomInt(2, 4);
  const value = Math.pow(base, exp);
  return {
    question: `Sz\u00e1m\u00edtsd ki: log_${base}(${value})`,
    answerString: formatNumber(exp, 3),
    answerType: 'number',
    expectedValue: exp
  };
}

function buildTrigValue(difficulty) {
  const table = TRIG_TABLES[difficulty] || TRIG_TABLES[DIFF_EASY];
  const item = table[randomInt(0, table.length - 1)];
  return {
    question: `Sz\u00e1m\u00edtsd ki: ${item.fn}(${item.angle} fok)`,
    answerString: formatNumber(item.value, 3),
    answerType: 'number',
    expectedValue: item.value
  };
}

function buildAbsValue(difficulty) {
  const range = difficulty === DIFF_EASY ? 4 : (difficulty === DIFF_NORMAL ? 6 : 8);
  const a = difficulty === DIFF_EASY ? 1 : (Math.random() < 0.5 ? 1 : -1);
  const h = randomInt(-range, range);
  const k = difficulty === DIFF_EASY ? 0 : randomInt(-range, range);
  const x = randomInt(-range, range);
  const value = a * Math.abs(x - h) + k;
  return {
    question: `Sz\u00e1m\u00edtsd ki: f(x) = ${formatAbsExpression(a, h, k)}. Mennyi f(${formatNumber(x, 3)})?`,
    answerString: formatNumber(value, 3),
    answerType: 'number',
    expectedValue: value
  };
}

function buildExpMonotone() {
  const useDecreasing = Math.random() < 0.5;
  const baseLabel = useDecreasing ? '1/2' : '2';
  const answer = useDecreasing ? 'csokkeno' : 'novegvo';
  return {
    question: `A f(x) = ${baseLabel}^x f\u00fcggv\u00e9ny n\u00f6vekv\u0151 vagy cs\u00f6kken\u0151? (n\u00f6vekv\u0151/cs\u00f6kken\u0151)`,
    answerString: answer,
    answerType: 'text',
    expectedText: answer
  };
}

function buildQuestion(kind, difficulty) {
  let result = null;

  if (kind === 'linear-value') {
    result = buildLinearValue(difficulty);
  } else if (kind === 'linear-zero') {
    result = buildLinearZero(difficulty);
  } else if (kind === 'quadratic-vertex-x') {
    result = buildQuadraticVertexX(difficulty);
  } else if (kind === 'quadratic-vertex-y') {
    result = buildQuadraticVertexY(difficulty);
  } else if (kind === 'quadratic-axis') {
    result = buildQuadraticAxis(difficulty);
  } else if (kind === 'power-value') {
    result = buildPowerValue(difficulty);
  } else if (kind === 'exp-value') {
    result = buildExpValue(difficulty);
  } else if (kind === 'log-value') {
    result = buildLogValue(difficulty);
  } else if (kind === 'trig-value') {
    result = buildTrigValue(difficulty);
  } else if (kind === 'abs-value') {
    result = buildAbsValue(difficulty);
  } else if (kind === 'exp-monotone') {
    result = buildExpMonotone();
  }

  return {
    kind,
    question: result.question,
    answerString: result.answerString,
    answerType: result.answerType || 'number',
    expectedValue: result.expectedValue ?? null,
    expectedText: result.expectedText ?? ''
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
  if (!userAnswer) return false;
  if (question.answerType === 'text') {
    const expectedRaw = question.answerString || question.expectedText || '';
    const actual = normalizeText(userAnswer);
    if (!actual) return false;
    const expected = normalizeText(expectedRaw);
    const aliases = TEXT_ALIASES[expected] || [expected];
    return aliases.includes(actual);
  }
  const parsed = parseAnswer(userAnswer);
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

function updateLinearModel() {
  const a = parseNumberInput(linAInput.value || '');
  const b = parseNumberInput(linBInput.value || '');
  const x0 = parseNumberInput(linXInput.value || '');
  if (a === null || b === null || x0 === null) {
    linEquation.textContent = '-';
    linValue.textContent = '-';
    linZero.textContent = '-';
    linNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    linNote.style.color = '#f04747';
    return;
  }

  linEquation.textContent = `f(x) = ${formatLinearExpression(a, b)}`;
  linValue.textContent = formatNumber(a * x0 + b, 3);

  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) < 1e-9) {
      linZero.textContent = 'Minden x';
    } else {
      linZero.textContent = 'Nincs';
    }
    linNote.textContent = 'A meredeks\u00e9g nulla, a f\u00fcggv\u00e9ny konstans.';
    linNote.style.color = '#f04747';
    return;
  }

  const fraction = simplifyFraction(-b, a);
  linZero.textContent = fraction ? formatFraction(fraction.n, fraction.d) : formatNumber(-b / a, 3);
  linNote.textContent = '';
  linNote.style.color = '';
}

function updateQuadraticModel() {
  const a = parseNumberInput(quadAInput.value || '');
  const b = parseNumberInput(quadBInput.value || '');
  const c = parseNumberInput(quadCInput.value || '');
  if (a === null || b === null || c === null) {
    quadEquation.textContent = '-';
    quadVertex.textContent = '-';
    quadAxis.textContent = '-';
    quadDiscriminant.textContent = '-';
    quadRoots.textContent = '-';
    quadNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    quadNote.style.color = '#f04747';
    return;
  }

  if (Math.abs(a) < 1e-9) {
    quadEquation.textContent = '-';
    quadVertex.textContent = '-';
    quadAxis.textContent = '-';
    quadDiscriminant.textContent = '-';
    quadRoots.textContent = '-';
    quadNote.textContent = 'Ez nem m\u00e1sodfok\u00fa f\u00fcggv\u00e9ny.';
    quadNote.style.color = '#f04747';
    return;
  }

  quadEquation.textContent = `f(x) = ${formatNumber(a, 3)}x^2 ${b >= 0 ? '+ ' : '- '}${formatNumber(Math.abs(b), 3)}x ${c >= 0 ? '+ ' : '- '}${formatNumber(Math.abs(c), 3)}`;
  const h = -b / (2 * a);
  const k = a * h * h + b * h + c;
  quadVertex.textContent = `(${formatNumber(h, 3)}, ${formatNumber(k, 3)})`;
  quadAxis.textContent = `x = ${formatNumber(h, 3)}`;
  const disc = b * b - 4 * a * c;
  quadDiscriminant.textContent = formatNumber(disc, 3);
  if (disc > 1e-9) {
    quadRoots.textContent = '2 val\u00f3s gy\u00f6k';
  } else if (Math.abs(disc) <= 1e-9) {
    quadRoots.textContent = '1 val\u00f3s gy\u00f6k';
  } else {
    quadRoots.textContent = 'Nincs val\u00f3s gy\u00f6k';
  }
  quadNote.textContent = '';
  quadNote.style.color = '';
}

function updateExpModel() {
  const base = parseNumberInput(expBaseInput.value || '');
  const exp = parseNumberInput(expExpInput.value || '');
  if (base === null || exp === null || base <= 0 || base === 1) {
    expValue.textContent = '-';
    expLog.textContent = '-';
    expGrowth.textContent = '-';
    expNote.textContent = 'Adj meg \u00e9rv\u00e9nyes alapot \u00e9s kitev\u0151t.';
    expNote.style.color = '#f04747';
    return;
  }
  const value = Math.pow(base, exp);
  expValue.textContent = formatNumber(value, 3);
  expLog.textContent = `log_${formatNumber(base, 3)}(${formatNumber(value, 3)}) = ${formatNumber(exp, 3)}`;
  expGrowth.textContent = base > 1 ? 'N\u00f6vekv\u0151' : 'Cs\u00f6kken\u0151';
  expNote.textContent = '';
  expNote.style.color = '';
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

if (linAInput) linAInput.addEventListener('input', updateLinearModel);
if (linBInput) linBInput.addEventListener('input', updateLinearModel);
if (linXInput) linXInput.addEventListener('input', updateLinearModel);

if (quadAInput) quadAInput.addEventListener('input', updateQuadraticModel);
if (quadBInput) quadBInput.addEventListener('input', updateQuadraticModel);
if (quadCInput) quadCInput.addEventListener('input', updateQuadraticModel);

if (expBaseInput) expBaseInput.addEventListener('input', updateExpModel);
if (expExpInput) expExpInput.addEventListener('input', updateExpModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateLinearModel();
updateQuadraticModel();
updateExpModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
