const TOPIC_ID = 'paritas';
const TOPIC_NAME = 'Parit\u00e1s (p\u00e1ros, p\u00e1ratlan)';
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
  [DIFF_EASY]: ['parity-even-poly', 'parity-odd-poly', 'parity-abs-even'],
  [DIFF_NORMAL]: ['parity-even-poly', 'parity-odd-poly', 'parity-mixed-poly', 'symmetry'],
  [DIFF_HARD]: ['parity-rational-even', 'parity-rational-odd', 'parity-rational-mixed', 'parity-abs-mixed', 'symmetry']
};

const TEXT_ALIASES = {
  paros: ['paros'],
  paratlan: ['paratlan'],
  egyiksem: ['egyiksem', 'semleges', 'nemparos', 'nemparatlan'],
  ytengely: ['ytengely', 'ytengelyre', 'yaxis'],
  origo: ['origo', 'origora', 'origore']
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

const polyAInput = document.getElementById('poly-a');
const polyBInput = document.getElementById('poly-b');
const polyCInput = document.getElementById('poly-c');
const polyEquation = document.getElementById('poly-equation');
const polyNeg = document.getElementById('poly-neg');
const polyParity = document.getElementById('poly-parity');
const polySymmetry = document.getElementById('poly-symmetry');
const polyNote = document.getElementById('poly-note');

const absAInput = document.getElementById('abs-a');
const absBInput = document.getElementById('abs-b');
const absEquation = document.getElementById('abs-equation');
const absNeg = document.getElementById('abs-neg');
const absParity = document.getElementById('abs-parity');
const absSymmetry = document.getElementById('abs-symmetry');
const absNote = document.getElementById('abs-note');

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

function normalizeText(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/\u00e1/g, 'a')
    .replace(/\u00e9/g, 'e')
    .replace(/\u00ed/g, 'i')
    .replace(/[\u00f3\u00f6\u0151]/g, 'o')
    .replace(/[\u00fa\u00fc\u0171]/g, 'u');
}

function parseNumberInput(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value, precision = 3) {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-6) return String(rounded);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

function formatTerm(coef, base, isFirst) {
  if (Math.abs(coef) < 1e-9) return '';
  const absCoef = Math.abs(coef);
  let core = '';
  if (base) {
    if (Math.abs(absCoef - 1) < 1e-9) core = base;
    else core = `${formatNumber(absCoef, 3)}${base}`;
  } else {
    core = `${formatNumber(absCoef, 3)}`;
  }
  if (isFirst) {
    return coef < 0 ? `-${core}` : core;
  }
  const sign = coef < 0 ? ' - ' : ' + ';
  return `${sign}${core}`;
}

function formatPolynomial(terms) {
  const filtered = terms
    .filter(term => Math.abs(term.coef) > 1e-9)
    .sort((a, b) => b.power - a.power);
  if (!filtered.length) return '0';
  let expr = '';
  filtered.forEach((term) => {
    const base = term.power === 0 ? '' : term.power === 1 ? 'x' : `x^${term.power}`;
    const part = formatTerm(term.coef, base, expr.length === 0);
    if (part) expr += part;
  });
  return expr;
}

function formatAbsExpression(absCoef, constant) {
  const parts = [];
  const absTerm = formatTerm(absCoef, '|x|', parts.length === 0);
  if (absTerm) parts.push(absTerm);
  const constTerm = formatTerm(constant, '', parts.length === 0);
  if (constTerm) parts.push(constTerm);
  if (!parts.length) return '0';
  return parts.join('');
}

function formatAbsLinearExpression(absCoef, linCoef) {
  const parts = [];
  const absTerm = formatTerm(absCoef, '|x|', parts.length === 0);
  if (absTerm) parts.push(absTerm);
  const linTerm = formatTerm(linCoef, 'x', parts.length === 0);
  if (linTerm) parts.push(linTerm);
  if (!parts.length) return '0';
  return parts.join('');
}

function pickCoeffRange(difficulty) {
  if (difficulty === DIFF_EASY) return 5;
  if (difficulty === DIFF_NORMAL) return 7;
  return 9;
}

function classifyParity(hasEven, hasOdd) {
  if (!hasEven && !hasOdd) return 'mindketto';
  if (hasEven && !hasOdd) return 'paros';
  if (!hasEven && hasOdd) return 'paratlan';
  return 'egyiksem';
}

function parityLabel(parityKey) {
  if (parityKey === 'paros') return 'P\u00e1ros';
  if (parityKey === 'paratlan') return 'P\u00e1ratlan';
  if (parityKey === 'mindketto') return 'P\u00e1ros \u00e9s p\u00e1ratlan';
  return 'Egyik sem';
}

function symmetryLabel(parityKey) {
  if (parityKey === 'paros') return 'y-tengely';
  if (parityKey === 'paratlan') return 'origo';
  if (parityKey === 'mindketto') return 'y-tengely \u00e9s origo';
  return 'Egyik sem';
}

function parityToSymmetry(parityKey) {
  if (parityKey === 'paros') return 'y-tengely';
  if (parityKey === 'paratlan') return 'origo';
  if (parityKey === 'mindketto') return 'y-tengely es origo';
  return 'egyik sem';
}

function makeParityQuestion(expression, parityKey, kind) {
  const answer = parityKey === 'paros'
    ? 'paros'
    : parityKey === 'paratlan'
      ? 'paratlan'
      : 'egyik sem';
  return {
    kind,
    question: `A f(x) = ${expression} f\u00fcggv\u00e9ny p\u00e1ros, p\u00e1ratlan vagy egyik sem? (p\u00e1ros/p\u00e1ratlan/egyik sem)`,
    answerString: answer,
    answerType: 'text',
    expectedText: answer
  };
}

function makeSymmetryQuestion(expression, parityKey, kind) {
  const symmetry = parityToSymmetry(parityKey);
  return {
    kind,
    question: `Melyik szimmetri\u00e1t mutatja a f(x) = ${expression} f\u00fcggv\u00e9ny grafikonja? (y-tengely/orig\u00f3/egyik sem)`,
    answerString: symmetry,
    answerType: 'text',
    expectedText: symmetry
  };
}

function buildEvenPolynomial(difficulty) {
  const range = pickCoeffRange(difficulty);
  const a = pickNonZero(-range, range);
  let c = randomInt(-range, range);
  if (Math.random() < 0.35) c = 0;
  const expression = formatPolynomial([
    { coef: a, power: 2 },
    { coef: c, power: 0 }
  ]);
  return { expression, parityKey: 'paros' };
}

function buildOddPolynomial(difficulty) {
  const range = pickCoeffRange(difficulty);
  let a = pickNonZero(-range, range);
  let b = pickNonZero(-range, range);
  if (Math.random() < 0.3) {
    if (Math.random() < 0.5) a = 0;
    else b = 0;
  }
  if (a === 0 && b === 0) b = pickNonZero(-range, range);
  const expression = formatPolynomial([
    { coef: a, power: 3 },
    { coef: b, power: 1 }
  ]);
  return { expression, parityKey: 'paratlan' };
}

function buildMixedPolynomial(difficulty) {
  const range = pickCoeffRange(difficulty);
  const a = pickNonZero(-range, range);
  const b = pickNonZero(-range, range);
  let c = randomInt(-range, range);
  if (Math.random() < 0.35) c = 0;
  const expression = formatPolynomial([
    { coef: a, power: 2 },
    { coef: b, power: 1 },
    { coef: c, power: 0 }
  ]);
  return { expression, parityKey: 'egyiksem' };
}

function buildAbsEven(difficulty) {
  const range = pickCoeffRange(difficulty);
  const a = pickNonZero(-range, range);
  let b = randomInt(-range, range);
  if (Math.random() < 0.3) b = 0;
  const expression = formatAbsExpression(a, b);
  return { expression, parityKey: 'paros' };
}

function buildAbsMixed(difficulty) {
  const range = pickCoeffRange(difficulty);
  const a = pickNonZero(-range, range);
  const b = pickNonZero(-range, range);
  const expression = formatAbsLinearExpression(a, b);
  return { expression, parityKey: 'egyiksem' };
}

function buildRationalEven(difficulty) {
  const range = pickCoeffRange(difficulty);
  const a = pickNonZero(-range, range);
  let c = randomInt(-range, range);
  if (Math.random() < 0.35) c = 0;
  const b = randomInt(-range, range);
  const numerator = formatPolynomial([
    { coef: a, power: 2 },
    { coef: c, power: 0 }
  ]);
  const denominator = formatPolynomial([
    { coef: 1, power: 2 },
    { coef: b, power: 0 }
  ]);
  return { expression: `(${numerator})/(${denominator})`, parityKey: 'paros' };
}

function buildRationalOdd(difficulty) {
  const range = pickCoeffRange(difficulty);
  const a = pickNonZero(-range, range);
  const b = randomInt(-range, range);
  const numerator = formatPolynomial([{ coef: a, power: 1 }]);
  const denominator = formatPolynomial([
    { coef: 1, power: 2 },
    { coef: b, power: 0 }
  ]);
  return { expression: `(${numerator})/(${denominator})`, parityKey: 'paratlan' };
}

function buildRationalMixed(difficulty) {
  const range = pickCoeffRange(difficulty);
  const a = pickNonZero(-range, range);
  const b = pickNonZero(-range, range);
  const c = randomInt(-range, range);
  const numerator = formatPolynomial([
    { coef: a, power: 2 },
    { coef: b, power: 1 }
  ]);
  const denominator = formatPolynomial([
    { coef: 1, power: 2 },
    { coef: c, power: 0 }
  ]);
  return { expression: `(${numerator})/(${denominator})`, parityKey: 'egyiksem' };
}

function buildSymmetryQuestion(difficulty) {
  const pool = difficulty === DIFF_EASY
    ? [buildEvenPolynomial, buildOddPolynomial, buildAbsEven]
    : difficulty === DIFF_NORMAL
      ? [buildEvenPolynomial, buildOddPolynomial, buildMixedPolynomial, buildAbsMixed]
      : [buildRationalEven, buildRationalOdd, buildRationalMixed, buildAbsMixed];
  const builder = pool[randomInt(0, pool.length - 1)];
  const payload = builder(difficulty);
  return makeSymmetryQuestion(payload.expression, payload.parityKey, 'symmetry');
}

function buildQuestion(kind, difficulty) {
  let payload = null;

  if (kind === 'parity-even-poly') {
    payload = buildEvenPolynomial(difficulty);
  } else if (kind === 'parity-odd-poly') {
    payload = buildOddPolynomial(difficulty);
  } else if (kind === 'parity-mixed-poly') {
    payload = buildMixedPolynomial(difficulty);
  } else if (kind === 'parity-abs-even') {
    payload = buildAbsEven(difficulty);
  } else if (kind === 'parity-abs-mixed') {
    payload = buildAbsMixed(difficulty);
  } else if (kind === 'parity-rational-even') {
    payload = buildRationalEven(difficulty);
  } else if (kind === 'parity-rational-odd') {
    payload = buildRationalOdd(difficulty);
  } else if (kind === 'parity-rational-mixed') {
    payload = buildRationalMixed(difficulty);
  } else if (kind === 'symmetry') {
    return buildSymmetryQuestion(difficulty);
  }

  if (!payload) return null;
  return makeParityQuestion(payload.expression, payload.parityKey, kind);
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
      if (!candidate) {
        attempts += 1;
        continue;
      }
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
    if (!candidate) continue;
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
  const expectedRaw = question.answerString || '';
  const actual = normalizeText(userAnswer);
  if (!actual) return false;
  const expected = normalizeText(expectedRaw);
  const aliases = TEXT_ALIASES[expected] || [expected];
  return aliases.includes(actual);
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
    if (!candidate) {
      attempts += 1;
      continue;
    }
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
    if (!nextQuestion) return;
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

function updatePolyModel() {
  const a = parseNumberInput(polyAInput.value || '');
  const b = parseNumberInput(polyBInput.value || '');
  const c = parseNumberInput(polyCInput.value || '');
  if (a === null || b === null || c === null) {
    polyEquation.textContent = '-';
    polyNeg.textContent = '-';
    polyParity.textContent = '-';
    polySymmetry.textContent = '-';
    polyNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    polyNote.style.color = '#f04747';
    return;
  }

  const expression = formatPolynomial([
    { coef: a, power: 2 },
    { coef: b, power: 1 },
    { coef: c, power: 0 }
  ]);
  const negExpression = formatPolynomial([
    { coef: a, power: 2 },
    { coef: -b, power: 1 },
    { coef: c, power: 0 }
  ]);
  const hasEven = Math.abs(a) > 1e-9 || Math.abs(c) > 1e-9;
  const hasOdd = Math.abs(b) > 1e-9;
  const parityKey = classifyParity(hasEven, hasOdd);

  polyEquation.textContent = `f(x) = ${expression}`;
  polyNeg.textContent = `f(-x) = ${negExpression}`;
  polyParity.textContent = parityLabel(parityKey);
  polySymmetry.textContent = symmetryLabel(parityKey);
  polyNote.textContent = '';
  polyNote.style.color = '';
}

function updateAbsModel() {
  const a = parseNumberInput(absAInput.value || '');
  const b = parseNumberInput(absBInput.value || '');
  if (a === null || b === null) {
    absEquation.textContent = '-';
    absNeg.textContent = '-';
    absParity.textContent = '-';
    absSymmetry.textContent = '-';
    absNote.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mokat.';
    absNote.style.color = '#f04747';
    return;
  }

  const expression = formatAbsLinearExpression(a, b);
  const negExpression = formatAbsLinearExpression(a, -b);
  const hasEven = Math.abs(a) > 1e-9;
  const hasOdd = Math.abs(b) > 1e-9;
  const parityKey = classifyParity(hasEven, hasOdd);

  absEquation.textContent = `f(x) = ${expression}`;
  absNeg.textContent = `f(-x) = ${negExpression}`;
  absParity.textContent = parityLabel(parityKey);
  absSymmetry.textContent = symmetryLabel(parityKey);
  absNote.textContent = '';
  absNote.style.color = '';
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

if (polyAInput) polyAInput.addEventListener('input', updatePolyModel);
if (polyBInput) polyBInput.addEventListener('input', updatePolyModel);
if (polyCInput) polyCInput.addEventListener('input', updatePolyModel);
if (absAInput) absAInput.addEventListener('input', updateAbsModel);
if (absBInput) absBInput.addEventListener('input', updateAbsModel);

const initialDifficulty = Array.from(difficultyButtons)
  .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
if (initialDifficulty) {
  currentTestDifficulty = initialDifficulty;
}

updatePolyModel();
updateAbsModel();
announceActiveTab(activeTab);
window.parent.postMessage({ type: 'request-settings' }, '*');
