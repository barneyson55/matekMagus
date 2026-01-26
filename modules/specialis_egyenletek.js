const TOPIC_ID = 'specialis_egyenletek';
const TOPIC_NAME = 'Speci\u00e1lis egyenletek';
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
  [DIFF_EASY]: ['abs-max', 'sqrt-simple', 'abs-count'],
  [DIFF_NORMAL]: ['abs-max', 'sqrt-simple', 'abs-linear', 'rational'],
  [DIFF_HARD]: ['abs-linear', 'sqrt-linear', 'rational', 'abs-count']
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

const absAInput = document.getElementById('abs-a');
const absBInput = document.getElementById('abs-b');
const absEquation = document.getElementById('abs-equation');
const absRootOne = document.getElementById('abs-root-1');
const absRootTwo = document.getElementById('abs-root-2');
const absStatus = document.getElementById('abs-status');
const absNote = document.getElementById('abs-note');

const sqrtAInput = document.getElementById('sqrt-a');
const sqrtBInput = document.getElementById('sqrt-b');
const sqrtEquation = document.getElementById('sqrt-equation');
const sqrtSolution = document.getElementById('sqrt-solution');
const sqrtCheck = document.getElementById('sqrt-check');
const sqrtStatus = document.getElementById('sqrt-status');
const sqrtNote = document.getElementById('sqrt-note');

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

function formatAbsInside(a) {
  if (a === 0) return 'x';
  if (a > 0) return `x - ${a}`;
  return `x + ${Math.abs(a)}`;
}

function formatSqrtInside(a) {
  if (a === 0) return 'x';
  if (a > 0) return `x + ${a}`;
  return `x - ${Math.abs(a)}`;
}

function formatLinearExpression(a, b) {
  const terms = [];
  const absA = Math.abs(a);
  const signA = a < 0 ? '-' : '';
  const aText = absA === 1 ? '' : String(absA);
  terms.push(`${signA}${aText}x`.trim());
  if (b !== 0) {
    const signB = b < 0 ? '-' : '+';
    terms.push(`${signB} ${Math.abs(b)}`);
  }
  return terms.join(' ');
}

function buildAbsMax(difficulty) {
  const range = difficulty === DIFF_EASY ? 6 : 8;
  const a = randomInt(-range, range);
  const b = randomInt(0, range);
  const root1 = a - b;
  const root2 = a + b;
  const maxRoot = Math.max(root1, root2);
  return {
    question: `Oldd meg: |${formatAbsInside(a)}| = ${b}. Add meg a nagyobbik megold\u00e1st.`,
    answerString: formatNumber(maxRoot, 3),
    expectedValue: maxRoot
  };
}

function buildAbsCount(difficulty) {
  const range = difficulty === DIFF_EASY ? 4 : 6;
  let a = randomInt(-range, range);
  if (a === 0) a = randomInt(1, range);
  let b = randomInt(-3, 5);
  if (difficulty === DIFF_EASY && b < 0) b = Math.abs(b);
  let count = 0;
  if (b < 0) count = 0;
  else if (b === 0) count = 1;
  else count = 2;
  return {
    question: `H\u00e1ny megold\u00e1sa van |${formatAbsInside(a)}| = ${b}?`,
    answerString: String(count),
    expectedValue: count,
    answerType: 'count'
  };
}

function buildAbsLinear(difficulty) {
  const range = difficulty === DIFF_HARD ? 9 : 7;
  const a = pickNonZero(-3, 3);
  const b = randomInt(-range, range);
  const c = randomInt(1, range);
  const num1 = c - b;
  const num2 = -c - b;
  const frac1 = simplifyFraction(num1, a) || { n: 0, d: 1 };
  const frac2 = simplifyFraction(num2, a) || { n: 0, d: 1 };
  const x1 = frac1.n / frac1.d;
  const x2 = frac2.n / frac2.d;
  const maxVal = Math.max(x1, x2);
  const chosen = maxVal === x1 ? frac1 : frac2;
  return {
    question: `Oldd meg: |${formatLinearExpression(a, b)}| = ${c}. Add meg a nagyobbik megold\u00e1st.`,
    answerString: formatFraction(chosen.n, chosen.d),
    expectedValue: maxVal,
    expectedFraction: chosen
  };
}

function buildSqrtSimple(difficulty) {
  const range = difficulty === DIFF_EASY ? 6 : 8;
  const a = randomInt(-range, range);
  const b = randomInt(0, range);
  const x = b * b - a;
  return {
    question: `Oldd meg: sqrt(${formatSqrtInside(a)}) = ${b}. Add meg x \u00e9rt\u00e9k\u00e9t.`,
    answerString: formatNumber(x, 3),
    expectedValue: x
  };
}

function buildSqrtLinear(difficulty) {
  const range = difficulty === DIFF_HARD ? 10 : 8;
  const a = randomInt(1, 4);
  const b = randomInt(-range, range);
  const c = randomInt(1, range);
  const num = c * c - b;
  const frac = simplifyFraction(num, a) || { n: 0, d: 1 };
  const x = frac.n / frac.d;
  return {
    question: `Oldd meg: sqrt(${a}x ${b < 0 ? '-' : '+'} ${Math.abs(b)}) = ${c}. Add meg x \u00e9rt\u00e9k\u00e9t.`,
    answerString: formatFraction(frac.n, frac.d),
    expectedValue: x,
    expectedFraction: frac
  };
}

function buildRational(difficulty) {
  const range = difficulty === DIFF_HARD ? 6 : 5;
  const a = randomInt(-range, range);
  let b = randomInt(-4, 4);
  while (b === 0) {
    b = randomInt(-4, 4);
  }
  const numerator = a * b + 1;
  const frac = simplifyFraction(numerator, b) || { n: 0, d: 1 };
  const x = frac.n / frac.d;
  return {
    question: `Oldd meg: 1/(x - ${a}) = ${b}. Add meg x \u00e9rt\u00e9k\u00e9t.`,
    answerString: formatFraction(frac.n, frac.d),
    expectedValue: x,
    expectedFraction: frac
  };
}

function buildQuestion(kind, difficulty) {
  let result = null;

  if (kind === 'abs-max') {
    result = buildAbsMax(difficulty);
  } else if (kind === 'abs-count') {
    result = buildAbsCount(difficulty);
  } else if (kind === 'abs-linear') {
    result = buildAbsLinear(difficulty);
  } else if (kind === 'sqrt-simple') {
    result = buildSqrtSimple(difficulty);
  } else if (kind === 'sqrt-linear') {
    result = buildSqrtLinear(difficulty);
  } else if (kind === 'rational') {
    result = buildRational(difficulty);
  }

  return {
    kind,
    question: result.question,
    answerString: result.answerString,
    expectedValue: result.expectedValue,
    expectedFraction: result.expectedFraction || null,
    answerType: result.answerType || ''
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
    const rounded = Math.round(parsed.value);
    return Math.abs(parsed.value - rounded) < 1e-6 && rounded === question.expectedValue;
  }
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

function updateAbsModel() {
  const a = parseNumberInput(absAInput.value || '');
  const b = parseNumberInput(absBInput.value || '');
  if (a === null || b === null) {
    absEquation.textContent = '-';
    absRootOne.textContent = '-';
    absRootTwo.textContent = '-';
    absStatus.textContent = '-';
    absNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    absNote.style.color = '#f04747';
    return;
  }

  absEquation.textContent = `|${formatAbsInside(a)}| = ${formatNumber(b, 3)}`;

  if (b < 0) {
    absRootOne.textContent = '-';
    absRootTwo.textContent = '-';
    absStatus.textContent = 'Nincs megold\u00e1s.';
    absNote.textContent = 'A jobb oldal nem lehet negat\u00edv.';
    absNote.style.color = '#f04747';
    return;
  }

  if (Math.abs(b) < 1e-9) {
    const root = a;
    absRootOne.textContent = formatNumber(root, 3);
    absRootTwo.textContent = formatNumber(root, 3);
    absStatus.textContent = 'Egy megold\u00e1s';
    absNote.textContent = '';
    absNote.style.color = '';
    return;
  }

  const root1 = a - b;
  const root2 = a + b;
  const min = Math.min(root1, root2);
  const max = Math.max(root1, root2);
  absRootOne.textContent = formatNumber(min, 3);
  absRootTwo.textContent = formatNumber(max, 3);
  absStatus.textContent = 'K\u00e9t megold\u00e1s';
  absNote.textContent = '';
  absNote.style.color = '';
}

function updateSqrtModel() {
  const a = parseNumberInput(sqrtAInput.value || '');
  const b = parseNumberInput(sqrtBInput.value || '');
  if (a === null || b === null) {
    sqrtEquation.textContent = '-';
    sqrtSolution.textContent = '-';
    sqrtCheck.textContent = '-';
    sqrtStatus.textContent = '-';
    sqrtNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    sqrtNote.style.color = '#f04747';
    return;
  }

  sqrtEquation.textContent = `sqrt(${formatSqrtInside(a)}) = ${formatNumber(b, 3)}`;

  if (b < 0) {
    sqrtSolution.textContent = '-';
    sqrtCheck.textContent = '-';
    sqrtStatus.textContent = 'Nincs megold\u00e1s.';
    sqrtNote.textContent = 'A jobb oldal nem lehet negat\u00edv.';
    sqrtNote.style.color = '#f04747';
    return;
  }

  const x = b * b - a;
  sqrtSolution.textContent = formatNumber(x, 3);
  sqrtCheck.textContent = `${formatNumber(b, 3)}^2 - ${formatNumber(a, 3)} = ${formatNumber(x, 3)}`;
  sqrtStatus.textContent = 'OK';
  sqrtNote.textContent = '';
  sqrtNote.style.color = '';
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

if (absAInput) absAInput.addEventListener('input', updateAbsModel);
if (absBInput) absBInput.addEventListener('input', updateAbsModel);
if (sqrtAInput) sqrtAInput.addEventListener('input', updateSqrtModel);
if (sqrtBInput) sqrtBInput.addEventListener('input', updateSqrtModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateAbsModel();
updateSqrtModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
