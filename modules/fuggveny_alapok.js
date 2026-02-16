const TOPIC_ID = 'fuggveny_alapok';
const TOPIC_NAME = '\u00c9rtelmez\u00e9si tartom\u00e1ny, \u00e9rt\u00e9kk\u00e9szlet';
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
  [DIFF_EASY]: ['domain-linear', 'domain-sqrt', 'range-sqrt'],
  [DIFF_NORMAL]: ['domain-rational', 'range-linear', 'range-parabola'],
  [DIFF_HARD]: ['domain-root-linear', 'range-rational', 'range-parabola-hard']
};

const TEXT_ALIASES = {
  r: ['r', 'valos', 'real', 'valosak']
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

const rootAInput = document.getElementById('root-a');
const rootBInput = document.getElementById('root-b');
const rootEquation = document.getElementById('root-equation');
const rootDomain = document.getElementById('root-domain');
const rootRange = document.getElementById('root-range');
const rootBoundary = document.getElementById('root-boundary');
const rootNote = document.getElementById('root-note');

const ratAInput = document.getElementById('rat-a');
const ratBInput = document.getElementById('rat-b');
const ratEquation = document.getElementById('rat-equation');
const ratDomain = document.getElementById('rat-domain');
const ratRange = document.getElementById('rat-range');
const ratAsymptotes = document.getElementById('rat-asymptotes');
const ratNote = document.getElementById('rat-note');

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

function formatSigned(value) {
  if (Math.abs(value) < 1e-9) return '';
  if (value > 0) return ` + ${formatNumber(value, 3)}`;
  return ` - ${formatNumber(Math.abs(value), 3)}`;
}

function formatLinearExpression(a, b) {
  if (Math.abs(a) < 1e-9) return formatNumber(b, 3);
  let term = '';
  if (a === 1) term = 'x';
  else if (a === -1) term = '-x';
  else term = `${formatNumber(a, 3)}x`;
  if (Math.abs(b) < 1e-9) return term;
  const sign = b > 0 ? ' + ' : ' - ';
  return `${term}${sign}${formatNumber(Math.abs(b), 3)}`;
}

function formatRootInside(a) {
  if (Math.abs(a) < 1e-9) return 'x';
  if (a > 0) return `x + ${formatNumber(a, 3)}`;
  return `x - ${formatNumber(Math.abs(a), 3)}`;
}

function formatRationalInside(a) {
  if (Math.abs(a) < 1e-9) return 'x';
  if (a > 0) return `x - ${formatNumber(a, 3)}`;
  return `x + ${formatNumber(Math.abs(a), 3)}`;
}

function formatShiftedX(h) {
  if (Math.abs(h) < 1e-9) return 'x';
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

function pickLinearRange(difficulty) {
  if (difficulty === DIFF_EASY) return 6;
  if (difficulty === DIFF_NORMAL) return 8;
  return 10;
}

function pickParabolaRange(difficulty) {
  if (difficulty === DIFF_EASY) return 4;
  if (difficulty === DIFF_NORMAL) return 6;
  return 8;
}

function buildDomainLinear(difficulty) {
  const range = pickLinearRange(difficulty);
  const a = pickNonZero(-range, range);
  const b = randomInt(-range, range);
  return {
    question: `Mi a f(x) = ${formatLinearExpression(a, b)} f\u00fcggv\u00e9ny \u00e9rtelmez\u00e9si tartom\u00e1nya? (R)`,
    answerString: 'R',
    answerType: 'text',
    expectedText: 'R'
  };
}

function buildRangeLinear(difficulty) {
  const range = pickLinearRange(difficulty);
  let a = pickNonZero(-range, range);
  if (Math.random() < 0.35) a = 0;
  const b = randomInt(-range, range);
  const isConstant = Math.abs(a) < 1e-9;
  const rangeText = isConstant ? `{${formatNumber(b, 3)}}` : 'R';
  return {
    question: `Mi a f(x) = ${formatLinearExpression(a, b)} f\u00fcggv\u00e9ny \u00e9rt\u00e9kk\u00e9szlete? V\u00e1lasz: R vagy {${formatNumber(b, 3)}}.`,
    answerString: rangeText,
    answerType: isConstant ? 'set' : 'text',
    expectedText: rangeText,
    expectedValue: isConstant ? b : null
  };
}

function buildDomainSqrt(difficulty) {
  const range = difficulty === DIFF_EASY ? 6 : 8;
  const a = randomInt(-range, range);
  const boundary = -a;
  return {
    question: `Mi a legkisebb x, amire f(x) = sqrt(${formatRootInside(a)}) \u00e9rtelmezett?`,
    answerString: formatNumber(boundary, 3),
    expectedValue: boundary
  };
}

function buildRangeSqrt(difficulty) {
  const range = difficulty === DIFF_EASY ? 6 : 8;
  const a = randomInt(-range, range);
  const b = randomInt(-range, range);
  return {
    question: `Mi a f(x) = sqrt(${formatRootInside(a)})${formatSigned(b)} f\u00fcggv\u00e9ny legkisebb \u00e9rt\u00e9ke?`,
    answerString: formatNumber(b, 3),
    expectedValue: b
  };
}

function buildDomainRational(difficulty) {
  const range = difficulty === DIFF_HARD ? 9 : 7;
  const a = randomInt(-range, range);
  const b = randomInt(-range, range);
  return {
    question: `Melyik x \u00e9rt\u00e9k tiltott a f(x) = 1/(${formatRationalInside(a)})${formatSigned(b)} f\u00fcggv\u00e9nyben?`,
    answerString: formatNumber(a, 3),
    expectedValue: a
  };
}

function buildRangeRational(difficulty) {
  const range = difficulty === DIFF_HARD ? 9 : 7;
  const a = randomInt(-range, range);
  const b = randomInt(-range, range);
  return {
    question: `Melyik y \u00e9rt\u00e9k nem lehet a f(x) = 1/(${formatRationalInside(a)})${formatSigned(b)} \u00e9rt\u00e9kk\u00e9szlet\u00e9ben?`,
    answerString: formatNumber(b, 3),
    expectedValue: b
  };
}

function buildRangeParabola(difficulty, forceNegative) {
  const range = pickParabolaRange(difficulty);
  let a = randomInt(1, difficulty === DIFF_HARD ? 3 : 2);
  if (forceNegative || Math.random() < 0.4) a *= -1;
  const h = randomInt(-range, range);
  const k = randomInt(-range, range);
  const extremumLabel = a > 0 ? 'minimuma' : 'maximuma';
  return {
    question: `Mi a f(x) = ${formatParabolaExpression(a, h, k)} parabola ${extremumLabel}?`,
    answerString: formatNumber(k, 3),
    expectedValue: k
  };
}

function buildRootBoundary(difficulty) {
  const range = difficulty === DIFF_HARD ? 8 : 6;
  const a = pickNonZero(-4, 4);
  const b = randomInt(-range, range);
  const boundary = simplifyFraction(-b, a) || { n: 0, d: 1 };
  return {
    question: `A f(x) = sqrt(${formatLinearExpression(a, b)}) f\u00fcggv\u00e9nyben hol lesz a gy\u00f6k alatti kifejez\u00e9s 0? Add meg x-et.`,
    answerString: formatFraction(boundary.n, boundary.d),
    expectedValue: boundary.n / boundary.d,
    expectedFraction: boundary
  };
}

function buildQuestion(kind, difficulty) {
  let result = null;

  if (kind === 'domain-linear') {
    result = buildDomainLinear(difficulty);
  } else if (kind === 'range-linear') {
    result = buildRangeLinear(difficulty);
  } else if (kind === 'domain-sqrt') {
    result = buildDomainSqrt(difficulty);
  } else if (kind === 'range-sqrt') {
    result = buildRangeSqrt(difficulty);
  } else if (kind === 'domain-rational') {
    result = buildDomainRational(difficulty);
  } else if (kind === 'range-rational') {
    result = buildRangeRational(difficulty);
  } else if (kind === 'range-parabola') {
    result = buildRangeParabola(difficulty, false);
  } else if (kind === 'range-parabola-hard') {
    result = buildRangeParabola(difficulty, true);
  } else if (kind === 'domain-root-linear') {
    result = buildRootBoundary(difficulty);
  }

  return {
    kind,
    question: result.question,
    answerString: result.answerString,
    answerType: result.answerType || '',
    expectedValue: result.expectedValue ?? null,
    expectedFraction: result.expectedFraction || null,
    expectedText: result.expectedText || ''
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
    const expectedRaw = question.answerString || '';
    const actual = normalizeText(userAnswer);
    if (!actual) return false;
    const expected = normalizeText(expectedRaw);
    const aliases = TEXT_ALIASES[expected] || [expected];
    return aliases.includes(actual);
  }

  if (question.answerType === 'set') {
    const raw = normalizeInput(userAnswer);
    const inner = raw.startsWith('{') && raw.endsWith('}') ? raw.slice(1, -1) : raw;
    const parsed = parseAnswer(inner);
    if (!parsed || question.expectedValue === null) return false;
    return Math.abs(parsed.value - question.expectedValue) < 0.01;
  }

  const parsed = parseAnswer(userAnswer);
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

function updateRootModel() {
  const a = parseNumberInput(rootAInput.value || '');
  const b = parseNumberInput(rootBInput.value || '');
  if (a === null || b === null) {
    rootEquation.textContent = '-';
    rootDomain.textContent = '-';
    rootRange.textContent = '-';
    rootBoundary.textContent = '-';
    rootNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    rootNote.style.color = '#f04747';
    return;
  }

  const boundary = -a;
  rootEquation.textContent = `f(x) = sqrt(${formatRootInside(a)})${formatSigned(b)}`;
  rootDomain.textContent = `x >= ${formatNumber(boundary, 3)}`;
  rootRange.textContent = `y >= ${formatNumber(b, 3)}`;
  rootBoundary.textContent = `(${formatNumber(boundary, 3)}, ${formatNumber(b, 3)})`;
  rootNote.textContent = '';
  rootNote.style.color = '';
}

function updateRationalModel() {
  const a = parseNumberInput(ratAInput.value || '');
  const b = parseNumberInput(ratBInput.value || '');
  if (a === null || b === null) {
    ratEquation.textContent = '-';
    ratDomain.textContent = '-';
    ratRange.textContent = '-';
    ratAsymptotes.textContent = '-';
    ratNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    ratNote.style.color = '#f04747';
    return;
  }

  ratEquation.textContent = `f(x) = 1/(${formatRationalInside(a)})${formatSigned(b)}`;
  ratDomain.textContent = `x != ${formatNumber(a, 3)}`;
  ratRange.textContent = `y != ${formatNumber(b, 3)}`;
  ratAsymptotes.textContent = `x = ${formatNumber(a, 3)}, y = ${formatNumber(b, 3)}`;
  ratNote.textContent = '';
  ratNote.style.color = '';
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

if (rootAInput) rootAInput.addEventListener('input', updateRootModel);
if (rootBInput) rootBInput.addEventListener('input', updateRootModel);
if (ratAInput) ratAInput.addEventListener('input', updateRationalModel);
if (ratBInput) ratBInput.addEventListener('input', updateRationalModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateRootModel();
updateRationalModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
