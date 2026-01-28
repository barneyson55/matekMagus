        const TOPIC_ID = 'primtenyezok';
        const TOPIC_NAME = 'Pr\u00edmt\u00e9nyez\u0151s felbont\u00e1s';
        const TAB_LABELS = {
            elmelet: 'Elm\u00e9let',
            vizualis: 'Vizu\u00e1lis modell',
            teszt: 'Teszt',
            gyakorlas: 'Gyakorl\u00e1s'
        };
        const DIFF_EASY = 'k\u00f6nny\u0171';
        const DIFF_NORMAL = 'norm\u00e1l';
        const DIFF_HARD = 'neh\u00e9z';
        const DIFFICULTY_LABELS = {
            [DIFF_EASY]: 'K\u00f6nny\u0171',
            [DIFF_NORMAL]: 'Norm\u00e1l',
            [DIFF_HARD]: 'Neh\u00e9z'
        };
        const TEST_QUESTION_COUNT = 10;
        const PRACTICE_XP_REWARDS = {
            [DIFF_EASY]: 1,
            [DIFF_NORMAL]: 2,
            [DIFF_HARD]: 3
        };
        const NUMBER_RANGES = {
            [DIFF_EASY]: { min: 20, max: 150, minFactors: 2, maxFactors: 3 },
            [DIFF_NORMAL]: { min: 60, max: 400, minFactors: 3, maxFactors: 4 },
            [DIFF_HARD]: { min: 150, max: 1200, minFactors: 4, maxFactors: 5 }
        };
        const PRIMES_BY_DIFFICULTY = {
            [DIFF_EASY]: [2, 3, 5, 7, 11],
            [DIFF_NORMAL]: [2, 3, 5, 7, 11, 13, 17],
            [DIFF_HARD]: [2, 3, 5, 7, 11, 13, 17, 19, 23]
        };

        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const testQuestion = document.getElementById('test-question');
        const testAnswerInput = document.getElementById('test-answer');
        const paginationDots = document.getElementById('pagination-dots');
        const prevTestBtn = document.getElementById('prev-q');
        const nextTestBtn = document.getElementById('next-q');
        const finishTestBtn = document.getElementById('finish-test-btn');
        const testStartBtn = document.getElementById('start-test-btn');
        const testArea = document.getElementById('test-area');
        const resultPopup = document.getElementById('resultPopup');
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');

        const practiceStartBtn = document.getElementById('start-practice-btn');
        const practiceArea = document.getElementById('practice-area');
        const practiceQuestion = document.getElementById('practice-question');
        const practiceInput = document.getElementById('practice-input');
        const practiceCheck = document.getElementById('practice-check');
        const practiceFeedback = document.getElementById('practice-feedback');
        const practiceDifficultyInputs = document.querySelectorAll('.practice-difficulty');

        const factorNumberInput = document.getElementById('factor-number');
        const factorStringEl = document.getElementById('factor-string');
        const primeFlagEl = document.getElementById('prime-flag');
        const factorListEl = document.getElementById('factor-list');
        const factorStepsEl = document.getElementById('factor-steps');

        let activeTab = 'elmelet';
        let testQuestions = [];
        let currentTestIndex = 0;
        let currentTestDifficulty = DIFF_EASY;
        let currentTestAnswer = '';
        let correctAnswers = 0;
        let isTestRunning = false;

        let currentPracticeAnswer = '';
        let currentPracticeExpected = null;
        let currentPracticeDifficulty = DIFF_EASY;
        let practiceActive = false;
        const PRACTICE_HISTORY_LIMIT = 8;
        const PRACTICE_RETRY_LIMIT = 16;
        const practiceHistory = [];

        function announceActiveTab(tabName) {
            const subtitle = TAB_LABELS[tabName] || '';
            if (window.parent) {
                window.parent.postMessage({ type: 'module-sheet', topicId: TOPIC_ID, subtitle }, '*');
            }
        }

        function setActiveTab(tabName) {
            tabButtons.forEach(btn => {
                const isActive = btn.dataset.tab === tabName;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            tabContents.forEach(section => {
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

        function isPrime(value) {
            const n = Math.abs(value);
            if (n < 2) return false;
            if (n === 2) return true;
            if (n % 2 === 0) return false;
            for (let i = 3; i * i <= n; i += 2) {
                if (n % i === 0) return false;
            }
            return true;
        }

        function factorizeNumber(value) {
            let n = Math.abs(value);
            const factors = [];
            const steps = [];
            if (!Number.isFinite(n) || n < 2) {
                return { factors, steps };
            }
            let divisor = 2;
            while (n >= divisor * divisor) {
                if (n % divisor === 0) {
                    const quotient = n / divisor;
                    steps.push(`${n} = ${divisor} * ${quotient}`);
                    factors.push(divisor);
                    n = quotient;
                } else {
                    divisor = divisor === 2 ? 3 : divisor + 2;
                }
            }
            if (n > 1) {
                factors.push(n);
                if (!steps.length) {
                    steps.push(`${n} pr\u00edm`);
                }
            }
            return { factors, steps };
        }

        function buildFactorMap(factors) {
            return factors.reduce((acc, prime) => {
                const key = String(prime);
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
        }

        function buildFactorString(map) {
            const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
            return keys.map((prime) => {
                const exp = map[String(prime)];
                return exp > 1 ? `${prime}^${exp}` : String(prime);
            }).join(' * ');
        }

        function parseFactorization(input) {
            const text = input.trim();
            if (!text) return null;
            const map = {};
            const re = /(\d+)(?:\s*\^\s*(\d+))?/g;
            let match = null;
            let found = false;
            while ((match = re.exec(text)) !== null) {
                found = true;
                const base = Number(match[1]);
                const exp = match[2] ? Number(match[2]) : 1;
                if (!Number.isFinite(base) || base < 2) return null;
                if (!Number.isFinite(exp) || !Number.isInteger(exp) || exp < 1) return null;
                if (!isPrime(base)) return null;
                const key = String(base);
                map[key] = (map[key] || 0) + exp;
            }
            if (!found) return null;
            return map;
        }

        function mapsEqual(a, b) {
            if (!a || !b) return false;
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            if (aKeys.length !== bKeys.length) return false;
            return aKeys.every(key => Number(a[key]) === Number(b[key]));
        }

        function buildComposite(difficulty) {
            const range = NUMBER_RANGES[difficulty] || NUMBER_RANGES[DIFF_EASY];
            const primes = PRIMES_BY_DIFFICULTY[difficulty] || PRIMES_BY_DIFFICULTY[DIFF_EASY];
            let attempts = 0;
            while (attempts < 60) {
                const count = randomInt(range.minFactors, range.maxFactors);
                let value = 1;
                for (let i = 0; i < count; i += 1) {
                    value *= primes[randomInt(0, primes.length - 1)];
                }
                if (value >= range.min && value <= range.max) {
                    return value;
                }
                attempts += 1;
            }
            return range.min;
        }

        function buildQuestion(difficulty) {
            const number = buildComposite(difficulty);
            const factorResult = factorizeNumber(number);
            const map = buildFactorMap(factorResult.factors);
            const answerString = buildFactorString(map);
            return {
                number,
                question: `Bontsd pr\u00edmt\u00e9nyez\u0151kre: ${number}`,
                answerMap: map,
                answerString,
                kind: 'factorization'
            };
        }

        function buildTestQuestions(difficulty) {
            const questions = [];
            const used = new Set();
            for (let safety = 0; questions.length < TEST_QUESTION_COUNT && safety < TEST_QUESTION_COUNT * 25; safety += 1) {
                const candidate = buildQuestion(difficulty);
                if (!used.has(candidate.number)) {
                    used.add(candidate.number);
                    questions.push(candidate);
                }
            }
            return shuffle(questions).slice(0, TEST_QUESTION_COUNT);
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
            window.currentTestAnswer = currentTestAnswer;
            window.currentTestKind = current.kind || '';
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
            testArea.classList.remove('is-hidden');
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
                const parsed = parseFactorization(q.userAnswer || '');
                const isCorrect = parsed && mapsEqual(parsed, q.answerMap);
                q.correctAnswer = q.answerString;
                q.isCorrect = Boolean(isCorrect);
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
                testStartBtn.innerHTML = '&Uacute;j teszt';
            }
            testAnswerInput.value = '';
            currentTestAnswer = '';
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
            return [difficulty, item.number, item.answerString].join('|');
        }

        function pushPracticeHistory(entry) {
            practiceHistory.push(entry);
            if (practiceHistory.length > PRACTICE_HISTORY_LIMIT) {
                practiceHistory.shift();
            }
        }

        function buildPracticeQuestion(difficulty, options = {}) {
            const avoidNumber = options.avoidNumber;
            let candidate = null;
            let attempts = 0;
            while (attempts < 30) {
                const next = buildQuestion(difficulty);
                if (!avoidNumber || next.number !== avoidNumber) {
                    candidate = next;
                    break;
                }
                attempts += 1;
            }
            return candidate || buildQuestion(difficulty);
        }

        function nextPracticeQuestion() {
            const enabled = getEnabledPracticeDifficulties();
            if (!enabled.length) return;
            const difficulty = pickRandomDifficulty(enabled);
            const lastNumber = practiceHistory.length ? practiceHistory[practiceHistory.length - 1].number : null;
            let attempts = 0;
            let nextQuestion = null;

            while (attempts < PRACTICE_RETRY_LIMIT) {
                const candidate = buildPracticeQuestion(difficulty, { avoidNumber: lastNumber });
                const signature = makePracticeSignature(difficulty, candidate);
                if (!practiceHistory.some(entry => entry.signature === signature)) {
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
            currentPracticeExpected = nextQuestion.answerMap;
            window.currentPracticeAnswer = currentPracticeAnswer;
            window.currentPracticeKind = nextQuestion.kind || '';
            practiceQuestion.textContent = nextQuestion.question;
            practiceInput.value = '';
            practiceFeedback.textContent = '';
            practiceFeedback.style.color = '';
            pushPracticeHistory({
                signature: nextQuestion.signature,
                number: nextQuestion.number
            });
        }

        function checkPracticeAnswer() {
            if (!practiceActive) return;
            const parsed = parseFactorization(practiceInput.value || '');
            if (parsed && mapsEqual(parsed, currentPracticeExpected)) {
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

        function updateModel() {
            const value = Number.parseInt(factorNumberInput.value, 10);
            if (!Number.isFinite(value) || value < 2) {
                factorStringEl.textContent = '-';
                primeFlagEl.textContent = '-';
                factorListEl.innerHTML = '';
                factorStepsEl.innerHTML = '';
                return;
            }
            const result = factorizeNumber(value);
            const map = buildFactorMap(result.factors);
            const factorString = buildFactorString(map);
            const isPrimeValue = result.factors.length === 1 && result.factors[0] === value;

            factorStringEl.textContent = factorString || '-';
            primeFlagEl.textContent = isPrimeValue ? 'Igen' : 'Nem';
            factorListEl.innerHTML = '';
            Object.keys(map).map(Number).sort((a, b) => a - b).forEach((prime) => {
                const exp = map[String(prime)];
                const chip = document.createElement('span');
                chip.className = 'factor-chip';
                chip.textContent = exp > 1 ? `${prime}^${exp}` : String(prime);
                factorListEl.appendChild(chip);
            });

            factorStepsEl.innerHTML = '';
            if (!result.steps.length) {
                const li = document.createElement('li');
                li.textContent = 'Nincs l\u00e9p\u00e9s.';
                factorStepsEl.appendChild(li);
                return;
            }
            result.steps.forEach((step) => {
                const li = document.createElement('li');
                li.textContent = step;
                factorStepsEl.appendChild(li);
            });
        }

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                setActiveTab(button.dataset.tab);
            });
        });

        difficultyButtons.forEach(button => {
            button.addEventListener('click', () => {
                const nextDifficulty = button.dataset.difficulty;
                if (!nextDifficulty) return;
                currentTestDifficulty = nextDifficulty;
                difficultyButtons.forEach(btn => {
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
                    practiceFeedback.textContent = 'V\u00e1lassz legal\u00e1bb egy neh\u00e9zs\u00e9get.';
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

        if (factorNumberInput) {
            factorNumberInput.addEventListener('input', updateModel);
        }

        const initialDifficulty = Array.from(difficultyButtons)
            .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
        if (initialDifficulty) {
            currentTestDifficulty = initialDifficulty;
        }

        updateModel();
        announceActiveTab(activeTab);
