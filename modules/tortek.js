const TOPIC_ID = 'tortek';
const TOPIC_NAME = 'T\u00f6rtek \u00e9s m\u0171veletek';
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

const DENOMINATORS = {
  [DIFF_EASY]: [2, 3, 4, 5, 6, 8, 10],
  [DIFF_NORMAL]: [3, 4, 5, 6, 8, 9, 10, 12],
  [DIFF_HARD]: [4, 5, 6, 8, 9, 10, 12, 15, 16, 18]
};

const QUESTION_TYPES_BY_DIFFICULTY = {
  [DIFF_EASY]: ['simplify', 'add-same', 'sub-same', 'mul-int'],
  [DIFF_NORMAL]: ['add-diff', 'sub-diff', 'mul', 'div'],
  [DIFF_HARD]: ['add-diff', 'sub-diff', 'mul', 'div']
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

const fracANumInput = document.getElementById('frac-a-num');
const fracADenInput = document.getElementById('frac-a-den');
const fracBNumInput = document.getElementById('frac-b-num');
const fracBDenInput = document.getElementById('frac-b-den');
const operationButtons = document.querySelectorAll('.operation-btn');
const fractionResult = document.getElementById('fraction-result');
const fractionDecimalResult = document.getElementById('fraction-decimal-result');
const lcmResult = document.getElementById('lcm-result');
const fractionAExpanded = document.getElementById('fraction-a-expanded');
const fractionBExpanded = document.getElementById('fraction-b-expanded');
const fractionError = document.getElementById('fraction-error');

const simpNumInput = document.getElementById('simp-num');
const simpDenInput = document.getElementById('simp-den');
const expandMultInput = document.getElementById('expand-mult');
const simplifiedOutput = document.getElementById('simplified-output');
const expandedOutput = document.getElementById('expanded-output');
const simplifyError = document.getElementById('simplify-error');

let activeTab = 'elmelet';
let currentOperation = 'add';
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
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(a, b) {
  if (!a || !b) return 0;
  return Math.abs((a * b) / gcd(a, b));
}

function simplifyFraction(n, d) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  if (n === 0) return { n: 0, d: 1 };
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d);
  return {
    n: (n / divisor) * sign,
    d: Math.abs(d / divisor)
  };
}

function formatFraction(n, d) {
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

function formatDecimal(value, precision = 4) {
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function parseFractionInput(value) {
  const raw = value.trim();
  if (!raw) return null;
  const mixedMatch = raw.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    const absWhole = Math.abs(whole);
    const numerator = sign * (absWhole * den + num);
    return simplifyFraction(numerator, den);
  }
  const cleaned = raw.replace(/\s+/g, '').replace(/:/g, '/');
  if (/^-?\d+$/.test(cleaned)) {
    return simplifyFraction(Number(cleaned), 1);
  }
  if (/^-?\d+\/-?\d+$/.test(cleaned)) {
    const parts = cleaned.split('/');
    const n = Number(parts[0]);
    const d = Number(parts[1]);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return simplifyFraction(n, d);
  }
  return null;
}

function pickDenominator(difficulty) {
  const pool = DENOMINATORS[difficulty] || DENOMINATORS[DIFF_EASY];
  return pool[randomInt(0, pool.length - 1)];
}

function pickSimplifiedFraction(difficulty) {
  let attempts = 0;
  while (attempts < 30) {
    const den = pickDenominator(difficulty);
    const num = randomInt(1, den - 1);
    if (gcd(num, den) === 1) {
      return { n: num, d: den };
    }
    attempts += 1;
  }
  return simplifyFraction(1, pickDenominator(difficulty));
}

function pickProperFraction(difficulty) {
  const den = pickDenominator(difficulty);
  const num = randomInt(1, den - 1);
  return simplifyFraction(num, den);
}

function compareFractions(a, b) {
  return a.n * b.d - b.n * a.d;
}

function buildQuestion(kind, difficulty) {
  let question = '';
  let answer = null;

  if (kind === 'simplify') {
    const base = pickSimplifiedFraction(difficulty);
    const factor = randomInt(2, 6);
    const rawNum = base.n * factor;
    const rawDen = base.d * factor;
    question = `Egyszer\u0171s\u00edtsd: ${rawNum}/${rawDen}`;
    answer = simplifyFraction(rawNum, rawDen);
  } else if (kind === 'add-same') {
    const den = pickDenominator(difficulty);
    const a = randomInt(1, den - 1);
    const b = randomInt(1, den - 1);
    question = `Sz\u00e1m\u00edtsd ki: ${a}/${den} + ${b}/${den}`;
    answer = simplifyFraction(a + b, den);
  } else if (kind === 'sub-same') {
    const den = pickDenominator(difficulty);
    const a = randomInt(1, den - 1);
    const b = randomInt(1, den - 1);
    const top = Math.max(a, b);
    const bottom = Math.min(a, b);
    question = `Sz\u00e1m\u00edtsd ki: ${top}/${den} - ${bottom}/${den}`;
    answer = simplifyFraction(top - bottom, den);
  } else if (kind === 'mul-int') {
    const frac = pickProperFraction(difficulty);
    const multiplier = randomInt(2, 6);
    question = `Sz\u00e1m\u00edtsd ki: ${formatFraction(frac.n, frac.d)} \u00d7 ${multiplier}`;
    answer = simplifyFraction(frac.n * multiplier, frac.d);
  } else if (kind === 'add-diff') {
    const a = pickProperFraction(difficulty);
    const b = pickProperFraction(difficulty);
    question = `Sz\u00e1m\u00edtsd ki: ${formatFraction(a.n, a.d)} + ${formatFraction(b.n, b.d)}`;
    answer = simplifyFraction(a.n * b.d + b.n * a.d, a.d * b.d);
  } else if (kind === 'sub-diff') {
    let a = pickProperFraction(difficulty);
    let b = pickProperFraction(difficulty);
    if (compareFractions(a, b) < 0) {
      const temp = a;
      a = b;
      b = temp;
    }
    question = `Sz\u00e1m\u00edtsd ki: ${formatFraction(a.n, a.d)} - ${formatFraction(b.n, b.d)}`;
    answer = simplifyFraction(a.n * b.d - b.n * a.d, a.d * b.d);
  } else if (kind === 'mul') {
    const a = pickProperFraction(difficulty);
    const b = pickProperFraction(difficulty);
    question = `Sz\u00e1m\u00edtsd ki: ${formatFraction(a.n, a.d)} \u00d7 ${formatFraction(b.n, b.d)}`;
    answer = simplifyFraction(a.n * b.n, a.d * b.d);
  } else if (kind === 'div') {
    const a = pickProperFraction(difficulty);
    let b = pickProperFraction(difficulty);
    if (b.n === 0) {
      b = { n: 1, d: b.d };
    }
    question = `Sz\u00e1m\u00edtsd ki: ${formatFraction(a.n, a.d)} \u00f7 ${formatFraction(b.n, b.d)}`;
    answer = simplifyFraction(a.n * b.d, a.d * b.n);
  }

  const normalized = answer ? simplifyFraction(answer.n, answer.d) : null;
  return {
    kind,
    question,
    answer: normalized,
    answerString: normalized ? formatFraction(normalized.n, normalized.d) : '',
    signature: `${kind}:${question}`
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
      const signature = candidate.signature || `${kind}:${candidate.question}`;
      if (!used.has(signature) && candidate.answer) {
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
    const signature = candidate.signature || `${kind}:${candidate.question}`;
    if (!used.has(signature) && candidate.answer) {
      used.add(signature);
      questions.push(candidate);
    }
  }

  return shuffle(questions).slice(0, TEST_QUESTION_COUNT);
}

function checkAnswer(userAnswer, question) {
  if (!userAnswer || !question || !question.answer) return false;
  const parsed = parseFractionInput(userAnswer);
  if (!parsed) return false;
  return parsed.n === question.answer.n && parsed.d === question.answer.d;
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
  return [difficulty, item.kind, item.answerString].join('|');
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
    if (!practiceHistory.some(entry => entry.signature === signature) && candidate.answer) {
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

function updateOperationModel() {
  const aNum = Number.parseInt(fracANumInput.value, 10);
  const aDen = Number.parseInt(fracADenInput.value, 10);
  const bNum = Number.parseInt(fracBNumInput.value, 10);
  const bDen = Number.parseInt(fracBDenInput.value, 10);

  if (!Number.isFinite(aNum) || !Number.isFinite(aDen) || !Number.isFinite(bNum) || !Number.isFinite(bDen) || aDen === 0 || bDen === 0) {
    fractionResult.textContent = '-';
    fractionDecimalResult.textContent = '-';
    lcmResult.textContent = '-';
    fractionAExpanded.textContent = '-';
    fractionBExpanded.textContent = '-';
    fractionError.textContent = 'Adj meg \u00e9rv\u00e9nyes t\u00f6rteket.';
    fractionError.style.color = '#f04747';
    return;
  }

  const a = simplifyFraction(aNum, aDen);
  const b = simplifyFraction(bNum, bDen);
  if (!a || !b) {
    fractionResult.textContent = '-';
    fractionDecimalResult.textContent = '-';
    lcmResult.textContent = '-';
    fractionAExpanded.textContent = '-';
    fractionBExpanded.textContent = '-';
    fractionError.textContent = 'Adj meg \u00e9rv\u00e9nyes t\u00f6rteket.';
    fractionError.style.color = '#f04747';
    return;
  }

  let result = null;
  if (currentOperation === 'add') {
    result = simplifyFraction(a.n * b.d + b.n * a.d, a.d * b.d);
  } else if (currentOperation === 'sub') {
    result = simplifyFraction(a.n * b.d - b.n * a.d, a.d * b.d);
  } else if (currentOperation === 'mul') {
    result = simplifyFraction(a.n * b.n, a.d * b.d);
  } else if (currentOperation === 'div') {
    result = simplifyFraction(a.n * b.d, a.d * b.n);
  }

  if (!result) {
    fractionResult.textContent = '-';
    fractionDecimalResult.textContent = '-';
    lcmResult.textContent = '-';
    fractionAExpanded.textContent = '-';
    fractionBExpanded.textContent = '-';
    fractionError.textContent = 'Nem oszthatsz 0-val.';
    fractionError.style.color = '#f04747';
    return;
  }

  fractionResult.textContent = formatFraction(result.n, result.d);
  fractionDecimalResult.textContent = formatDecimal(result.n / result.d);

  if (currentOperation === 'add' || currentOperation === 'sub') {
    const common = lcm(a.d, b.d);
    lcmResult.textContent = String(common || '-');
    if (common) {
      const aExpandedNum = a.n * (common / a.d);
      const bExpandedNum = b.n * (common / b.d);
      fractionAExpanded.textContent = formatFraction(aExpandedNum, common);
      fractionBExpanded.textContent = formatFraction(bExpandedNum, common);
    } else {
      fractionAExpanded.textContent = '-';
      fractionBExpanded.textContent = '-';
    }
  } else {
    lcmResult.textContent = '-';
    fractionAExpanded.textContent = '-';
    fractionBExpanded.textContent = '-';
  }

  fractionError.textContent = '';
  fractionError.style.color = '';
}

function updateSimplifyModel() {
  const num = Number.parseInt(simpNumInput.value, 10);
  const den = Number.parseInt(simpDenInput.value, 10);
  const mult = Number.parseInt(expandMultInput.value, 10);

  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    simplifiedOutput.textContent = '-';
    expandedOutput.textContent = '-';
    simplifyError.textContent = 'Adj meg \u00e9rv\u00e9nyes t\u00f6rtet.';
    simplifyError.style.color = '#f04747';
    return;
  }

  const simplified = simplifyFraction(num, den);
  if (!simplified) {
    simplifiedOutput.textContent = '-';
    expandedOutput.textContent = '-';
    simplifyError.textContent = 'Adj meg \u00e9rv\u00e9nyes t\u00f6rtet.';
    simplifyError.style.color = '#f04747';
    return;
  }

  simplifiedOutput.textContent = formatFraction(simplified.n, simplified.d);
  if (Number.isFinite(mult) && mult > 0) {
    expandedOutput.textContent = formatFraction(simplified.n * mult, simplified.d * mult);
  } else {
    expandedOutput.textContent = '-';
  }

  simplifyError.textContent = '';
  simplifyError.style.color = '';
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveTab(button.dataset.tab);
  });
});

operationButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextOp = button.dataset.op;
    if (!nextOp) return;
    currentOperation = nextOp;
    operationButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.op === currentOperation);
    });
    updateOperationModel();
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

if (fracANumInput) fracANumInput.addEventListener('input', updateOperationModel);
if (fracADenInput) fracADenInput.addEventListener('input', updateOperationModel);
if (fracBNumInput) fracBNumInput.addEventListener('input', updateOperationModel);
if (fracBDenInput) fracBDenInput.addEventListener('input', updateOperationModel);

if (simpNumInput) simpNumInput.addEventListener('input', updateSimplifyModel);
if (simpDenInput) simpDenInput.addEventListener('input', updateSimplifyModel);
if (expandMultInput) expandMultInput.addEventListener('input', updateSimplifyModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updateOperationModel();
updateSimplifyModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
