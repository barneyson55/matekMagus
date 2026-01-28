        const TOPIC_ID = 'lnko_lkkt';
        const TOPIC_NAME = 'LNKO, LKKT';
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
        const QUESTION_TYPES_BY_DIFFICULTY = {
            [DIFF_EASY]: ['lnko', 'lkkt'],
            [DIFF_NORMAL]: ['lnko', 'lkkt'],
            [DIFF_HARD]: ['lnko', 'lkkt']
        };
        const PRACTICE_XP_REWARDS = {
            [DIFF_EASY]: 1,
            [DIFF_NORMAL]: 2,
            [DIFF_HARD]: 3
        };
        const NUMBER_RANGES = {
            [DIFF_EASY]: { min: 6, max: 48 },
            [DIFF_NORMAL]: { min: 20, max: 160 },
            [DIFF_HARD]: { min: 60, max: 360 }
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

        const numberInputA = document.getElementById('number-a');
        const numberInputB = document.getElementById('number-b');
        const gcdValue = document.getElementById('gcd-value');
        const lcmValue = document.getElementById('lcm-value');
        const euclidSteps = document.getElementById('euclid-steps');
        const gcdSummary = document.getElementById('gcd-summary');
        const lcmSummary = document.getElementById('lcm-summary');
        const randomPairBtn = document.getElementById('random-pair-btn');

        let activeTab = 'elmelet';
        let testQuestions = [];
        let currentTestIndex = 0;
        let currentTestDifficulty = DIFF_EASY;
        let currentTestAnswer = 0;
        let correctAnswers = 0;
        let isTestRunning = false;

        let currentPracticeAnswer = 0;
        let currentPracticeExpected = 0;
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

        function gcd(a, b) {
            let x = Math.abs(a);
            let y = Math.abs(b);
            while (y !== 0) {
                const temp = y;
                y = x % y;
                x = temp;
            }
            return x;
        }

        function lcm(a, b) {
            const x = Math.abs(a);
            const y = Math.abs(b);
            if (x === 0 || y === 0) return 0;
            const g = gcd(x, y);
            return Math.round((x / g) * y);
        }

        function normalizeNumber(value) {
            const cleaned = value.trim().replace(/\s+/g, '');
            if (!cleaned) return null;
            const normalized = cleaned.replace(',', '.');
            const number = Number(normalized);
            if (!Number.isFinite(number)) return null;
            if (!Number.isInteger(number)) return null;
            return number;
        }

        function buildPair(difficulty) {
            const range = NUMBER_RANGES[difficulty] || NUMBER_RANGES[DIFF_EASY];
            let a = 0;
            let b = 0;
            let attempts = 0;
            while (attempts < 30) {
                a = randomInt(range.min, range.max);
                b = randomInt(range.min, range.max);
                if (a !== b) {
                    if (gcd(a, b) > 1 || attempts > 6) {
                        break;
                    }
                }
                attempts += 1;
            }
            return { a, b };
        }

        function makeSignature(kind, pair) {
            const min = Math.min(pair.a, pair.b);
            const max = Math.max(pair.a, pair.b);
            return `${kind}:${min}:${max}`;
        }

        function buildQuestion(kind, difficulty) {
            const pair = buildPair(difficulty);
            const answer = kind === 'lnko' ? gcd(pair.a, pair.b) : lcm(pair.a, pair.b);
            const label = kind === 'lnko' ? 'LNKO' : 'LKKT';
            return {
                kind,
                a: pair.a,
                b: pair.b,
                question: `Sz\u00e1mold ki: ${label}(${pair.a}, ${pair.b})`,
                answer
            };
        }

        function buildTestQuestions(difficulty) {
            const types = QUESTION_TYPES_BY_DIFFICULTY[difficulty] || QUESTION_TYPES_BY_DIFFICULTY[DIFF_EASY];
            const questions = [];
            const used = new Set();

            types.forEach((kind) => {
                let q = null;
                let attempts = 0;
                while (attempts < 30) {
                    const candidate = buildQuestion(kind, difficulty);
                    const signature = makeSignature(kind, candidate);
                    if (!used.has(signature)) {
                        used.add(signature);
                        q = candidate;
                        break;
                    }
                    attempts += 1;
                }
                if (q) questions.push(q);
            });

            for (let safety = 0; questions.length < TEST_QUESTION_COUNT && safety < TEST_QUESTION_COUNT * 25; safety += 1) {
                const kind = types[randomInt(0, types.length - 1)];
                const candidate = buildQuestion(kind, difficulty);
                const signature = makeSignature(kind, candidate);
                if (!used.has(signature)) {
                    used.add(signature);
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
            currentTestAnswer = current.answer;
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
                const parsed = normalizeNumber(q.userAnswer || '');
                const isCorrect = parsed !== null && parsed === q.answer;
                q.correctAnswer = String(q.answer);
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
                    correctAnswer: q.correctAnswer || String(q.answer)
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
            currentTestAnswer = 0;
            window.currentTestAnswer = 0;
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
            const min = Math.min(item.a, item.b);
            const max = Math.max(item.a, item.b);
            return [difficulty, item.kind, min, max].join('|');
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
            currentPracticeAnswer = nextQuestion.answer;
            currentPracticeExpected = nextQuestion.answer;
            window.currentPracticeAnswer = currentPracticeAnswer;
            window.currentPracticeKind = nextQuestion.kind || '';
            practiceQuestion.textContent = nextQuestion.question;
            practiceInput.value = '';
            practiceFeedback.textContent = '';
            practiceFeedback.style.color = '';
            pushPracticeHistory({
                signature: nextQuestion.signature,
                kind: nextQuestion.kind,
                a: nextQuestion.a,
                b: nextQuestion.b
            });
        }

        function checkPracticeAnswer() {
            if (!practiceActive) return;
            const parsed = normalizeNumber(practiceInput.value || '');
            if (parsed !== null && parsed === currentPracticeExpected) {
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

        function buildEuclidSteps(a, b) {
            let x = Math.abs(a);
            let y = Math.abs(b);
            const steps = [];
            if (x === 0 || y === 0) return steps;
            while (y !== 0) {
                const q = Math.floor(x / y);
                const r = x % y;
                steps.push({ dividend: x, divisor: y, quotient: q, remainder: r });
                x = y;
                y = r;
            }
            return steps;
        }

        function updateModel() {
            const a = Number.parseInt(numberInputA.value, 10);
            const b = Number.parseInt(numberInputB.value, 10);
            const safeA = Number.isFinite(a) ? a : 0;
            const safeB = Number.isFinite(b) ? b : 0;
            const g = gcd(safeA, safeB);
            const l = lcm(safeA, safeB);

            gcdValue.textContent = String(g);
            lcmValue.textContent = String(l);
            gcdSummary.textContent = String(g);
            lcmSummary.textContent = String(l);

            const steps = buildEuclidSteps(safeA, safeB);
            euclidSteps.innerHTML = '';
            if (!steps.length) {
                const li = document.createElement('li');
                li.textContent = 'Nincs l\u00e9p\u00e9s.';
                euclidSteps.appendChild(li);
                return;
            }
            steps.forEach((step) => {
                const li = document.createElement('li');
                li.textContent = `${step.dividend} = ${step.quotient} * ${step.divisor} + ${step.remainder}`;
                euclidSteps.appendChild(li);
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

        if (numberInputA) numberInputA.addEventListener('input', updateModel);
        if (numberInputB) numberInputB.addEventListener('input', updateModel);
        if (randomPairBtn) {
            randomPairBtn.addEventListener('click', () => {
                const pair = buildPair(DIFF_NORMAL);
                numberInputA.value = String(pair.a);
                numberInputB.value = String(pair.b);
                updateModel();
            });
        }

        const initialDifficulty = Array.from(difficultyButtons)
            .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
        if (initialDifficulty) {
            currentTestDifficulty = initialDifficulty;
        }

        updateModel();
        announceActiveTab(activeTab);
