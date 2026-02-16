        const TOPIC_ID = 'oszthatosag';
        const TOPIC_NAME = 'Oszthat\u00f3s\u00e1gi szab\u00e1lyok';
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
        const DIVISORS_BY_DIFFICULTY = {
            [DIFF_EASY]: [2, 3, 5, 10],
            [DIFF_NORMAL]: [4, 6, 8, 9, 12],
            [DIFF_HARD]: [11, 15, 25]
        };
        const NUMBER_RANGES = {
            [DIFF_EASY]: { min: 20, max: 999 },
            [DIFF_NORMAL]: { min: 200, max: 9999 },
            [DIFF_HARD]: { min: 1000, max: 99999 }
        };
        const RULE_STATUS_IDS = {
            2: 'rule-2-status',
            3: 'rule-3-status',
            4: 'rule-4-status',
            5: 'rule-5-status',
            6: 'rule-6-status',
            8: 'rule-8-status',
            9: 'rule-9-status',
            10: 'rule-10-status',
            11: 'rule-11-status',
            12: 'rule-12-status',
            15: 'rule-15-status',
            25: 'rule-25-status'
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

        const checkNumberInput = document.getElementById('check-number');
        const digitSumEl = document.getElementById('digit-sum');
        const lastTwoEl = document.getElementById('last-two');
        const lastThreeEl = document.getElementById('last-three');
        const altSumEl = document.getElementById('alt-sum');
        const ruleStatusElements = Object.values(RULE_STATUS_IDS)
            .map((id) => [id, document.getElementById(id)])
            .reduce((acc, pair) => {
                acc[pair[0]] = pair[1];
                return acc;
            }, {});

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
        const PRACTICE_HISTORY_LIMIT = 6;
        const PRACTICE_RETRY_LIMIT = 12;
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

        function normalizeYesNo(value) {
            const normalized = value.trim().toLowerCase();
            if (!normalized) return null;
            if (['igen', 'i', 'ig', 'y', 'yes', 'true', '1'].includes(normalized)) return true;
            if (['nem', 'n', 'no', 'false', '0'].includes(normalized)) return false;
            return null;
        }

        function buildNumber(divisor, range, mustDivide) {
            const min = range.min;
            const max = range.max;
            if (mustDivide) {
                const minK = Math.ceil(min / divisor);
                const maxK = Math.floor(max / divisor);
                if (minK > maxK) return min;
                const k = randomInt(minK, maxK);
                return k * divisor;
            }
            let n = randomInt(min, max);
            let attempts = 0;
            while (attempts < 20 && n % divisor === 0) {
                n = randomInt(min, max);
                attempts += 1;
            }
            if (n % divisor === 0) {
                n = (n + 1 <= max) ? n + 1 : n - 1;
            }
            return n;
        }

        function buildDivisibilityQuestion(difficulty, divisor) {
            const range = NUMBER_RANGES[difficulty] || NUMBER_RANGES[DIFF_EASY];
            const mustDivide = Math.random() < 0.5;
            const number = buildNumber(divisor, range, mustDivide);
            const isDivisible = number % divisor === 0;
            const answerText = isDivisible ? 'igen' : 'nem';
            return {
                question: `D\u00f6ntsd el: ${number} oszthat\u00f3-e ${divisor}-vel? \u00cdrd be: igen / nem.`,
                answer: isDivisible,
                answerText,
                divisor,
                number,
                kind: `divisible-${divisor}`
            };
        }

        function buildTestQuestions(difficulty) {
            const allowed = DIVISORS_BY_DIFFICULTY[difficulty] || DIVISORS_BY_DIFFICULTY[DIFF_EASY];
            const questions = [];
            const shuffled = shuffle(allowed);
            shuffled.slice(0, Math.min(2, shuffled.length)).forEach((divisor) => {
                questions.push(buildDivisibilityQuestion(difficulty, divisor));
            });
            for (let safety = 0; questions.length < TEST_QUESTION_COUNT && safety < TEST_QUESTION_COUNT * 25; safety += 1) {
                const divisor = allowed[randomInt(0, allowed.length - 1)];
                questions.push(buildDivisibilityQuestion(difficulty, divisor));
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
            currentTestAnswer = current.answerText;
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
                const parsed = normalizeYesNo(q.userAnswer || '');
                const isCorrect = parsed !== null && parsed === q.answer;
                q.correctAnswer = q.answerText;
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
                    correctAnswer: q.correctAnswer || q.answerText
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
            return [difficulty, item.divisor || '', item.number || '', item.answerText || ''].join('|');
        }

        function pushPracticeHistory(entry) {
            practiceHistory.push(entry);
            if (practiceHistory.length > PRACTICE_HISTORY_LIMIT) {
                practiceHistory.shift();
            }
        }

        function buildPracticeQuestion(difficulty, options = {}) {
            const allowed = DIVISORS_BY_DIFFICULTY[difficulty] || DIVISORS_BY_DIFFICULTY[DIFF_EASY];
            const avoidDivisor = options.avoidDivisor;
            let pool = allowed;
            if (avoidDivisor && allowed.length > 1) {
                pool = allowed.filter(divisor => divisor !== avoidDivisor);
                if (!pool.length) {
                    pool = allowed;
                }
            }
            const divisor = pool[randomInt(0, pool.length - 1)];
            return buildDivisibilityQuestion(difficulty, divisor);
        }

        function nextPracticeQuestion() {
            const enabled = getEnabledPracticeDifficulties();
            if (!enabled.length) return;
            const difficulty = pickRandomDifficulty(enabled);
            const lastDivisor = practiceHistory.length ? practiceHistory[practiceHistory.length - 1].divisor : null;
            let attempts = 0;
            let nextQuestion = null;

            while (attempts < PRACTICE_RETRY_LIMIT) {
                const candidate = buildPracticeQuestion(difficulty, { avoidDivisor: lastDivisor });
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
            currentPracticeAnswer = nextQuestion.answerText;
            currentPracticeExpected = nextQuestion.answer;
            window.currentPracticeAnswer = currentPracticeAnswer;
            window.currentPracticeKind = nextQuestion.kind || '';
            practiceQuestion.textContent = nextQuestion.question;
            practiceInput.value = '';
            practiceFeedback.textContent = '';
            practiceFeedback.style.color = '';
            pushPracticeHistory({ signature: nextQuestion.signature, divisor: nextQuestion.divisor });
        }

        function checkPracticeAnswer() {
            if (!practiceActive) return;
            const parsed = normalizeYesNo(practiceInput.value || '');
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

        function computeDigitSum(n) {
            return Math.abs(n).toString().split('').reduce((sum, digit) => sum + Number(digit || 0), 0);
        }

        function computeAltSum(n) {
            const digits = Math.abs(n).toString().split('').reverse();
            let sum = 0;
            digits.forEach((digit, index) => {
                const value = Number(digit || 0);
                sum += (index % 2 === 0) ? value : -value;
            });
            return sum;
        }

        function updateRuleStatus(divisor, isDivisible) {
            const id = RULE_STATUS_IDS[divisor];
            const element = ruleStatusElements[id];
            if (!element) return;
            element.textContent = isDivisible ? 'Oszthat\u00f3' : 'Nem oszthat\u00f3';
            element.classList.toggle('status-ok', isDivisible);
            element.classList.toggle('status-bad', !isDivisible);
        }

        function updateModel() {
            const raw = checkNumberInput.value;
            const number = Number.parseInt(raw, 10);
            const n = Number.isFinite(number) ? number : 0;
            const digitSum = computeDigitSum(n);
            const lastTwo = Math.abs(n) % 100;
            const lastThree = Math.abs(n) % 1000;
            const altSum = computeAltSum(n);

            digitSumEl.textContent = String(digitSum);
            lastTwoEl.textContent = String(lastTwo).padStart(2, '0');
            lastThreeEl.textContent = String(lastThree).padStart(3, '0');
            altSumEl.textContent = String(altSum);

            Object.keys(RULE_STATUS_IDS).forEach((key) => {
                const divisor = Number(key);
                const divisible = divisor ? (n % divisor === 0) : false;
                updateRuleStatus(divisor, divisible);
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

        if (testStartBtn) testStartBtn.addEventListener('click', startTest);
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

        if (checkNumberInput) checkNumberInput.addEventListener('input', updateModel);

        const initialDifficulty = Array.from(difficultyButtons)
            .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
        if (initialDifficulty) {
            currentTestDifficulty = initialDifficulty;
        }

        updateModel();
        setActiveTab('elmelet');
