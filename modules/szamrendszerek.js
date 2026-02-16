        const TOPIC_ID = 'szamrendszerek';
        const TOPIC_NAME = 'Sz\u00e1mrendszerek';
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
            [DIFF_EASY]: { min: 6, max: 63 },
            [DIFF_NORMAL]: { min: 20, max: 255 },
            [DIFF_HARD]: { min: 60, max: 4095 }
        };
        const QUESTION_TYPES_BY_DIFFICULTY = {
            [DIFF_EASY]: ['dec-to-bin', 'bin-to-dec'],
            [DIFF_NORMAL]: ['dec-to-bin', 'bin-to-dec', 'dec-to-oct', 'oct-to-dec'],
            [DIFF_HARD]: ['dec-to-hex', 'hex-to-dec', 'bin-to-hex', 'hex-to-bin', 'dec-to-bin', 'bin-to-dec']
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

        const decimalInput = document.getElementById('decimal-input');
        const binaryOutput = document.getElementById('binary-output');
        const octalOutput = document.getElementById('octal-output');
        const hexOutput = document.getElementById('hex-output');
        const powerSumEl = document.getElementById('power-sum');
        const baseInput = document.getElementById('base-input');
        const baseDecimalOutput = document.getElementById('base-decimal-output');
        const baseError = document.getElementById('base-error');

        let activeTab = 'elmelet';
        let testQuestions = [];
        let currentTestIndex = 0;
        let currentTestDifficulty = DIFF_EASY;
        let currentTestAnswer = '';
        let correctAnswers = 0;
        let isTestRunning = false;

        let currentPracticeAnswer = '';
        let currentPracticeExpected = null;
        let currentPracticeAnswerBase = 10;
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

        function normalizeRawInput(value) {
            return value.trim().replace(/[\s_]/g, '').toUpperCase();
        }

        function stripPrefix(value, base) {
            const raw = value.toUpperCase();
            if (base === 2 && raw.startsWith('0B')) return raw.slice(2);
            if (base === 8 && raw.startsWith('0O')) return raw.slice(2);
            if (base === 16 && raw.startsWith('0X')) return raw.slice(2);
            return raw;
        }

        function parseBaseValue(rawValue, base) {
            const cleaned = stripPrefix(normalizeRawInput(rawValue), base);
            if (!cleaned) return null;
            let regex = null;
            if (base === 2) regex = /^[01]+$/;
            if (base === 8) regex = /^[0-7]+$/;
            if (base === 10) regex = /^\d+$/;
            if (base === 16) regex = /^[0-9A-F]+$/;
            if (!regex || !regex.test(cleaned)) return null;
            const parsed = parseInt(cleaned, base);
            return Number.isFinite(parsed) ? parsed : null;
        }

        function formatBase(value, base) {
            return base === 10 ? String(value) : value.toString(base).toUpperCase();
        }

        function buildPowerSum(value) {
            if (!Number.isFinite(value) || value <= 0) return '0';
            const binary = value.toString(2);
            const terms = [];
            const len = binary.length;
            for (let i = 0; i < len; i += 1) {
                if (binary[i] === '1') {
                    const power = len - 1 - i;
                    terms.push(String(2 ** power));
                }
            }
            return terms.length ? terms.join(' + ') : '0';
        }

        function pickValueForDifficulty(difficulty) {
            const range = NUMBER_RANGES[difficulty] || NUMBER_RANGES[DIFF_EASY];
            return randomInt(range.min, range.max);
        }

        function buildQuestion(kind, difficulty) {
            const value = pickValueForDifficulty(difficulty);
            let question = '';
            let answerBase = 10;
            let answerString = '';
            if (kind === 'dec-to-bin') {
                question = `Alak\u00edtsd \u00e1t kettesbe: ${value} (10)`;
                answerBase = 2;
                answerString = formatBase(value, 2);
            } else if (kind === 'bin-to-dec') {
                const bin = formatBase(value, 2);
                question = `Alak\u00edtsd \u00e1t t\u00edzesbe: ${bin} (2)`;
                answerBase = 10;
                answerString = String(value);
            } else if (kind === 'dec-to-oct') {
                question = `Alak\u00edtsd \u00e1t nyolcasba: ${value} (10)`;
                answerBase = 8;
                answerString = formatBase(value, 8);
            } else if (kind === 'oct-to-dec') {
                const oct = formatBase(value, 8);
                question = `Alak\u00edtsd \u00e1t t\u00edzesbe: ${oct} (8)`;
                answerBase = 10;
                answerString = String(value);
            } else if (kind === 'dec-to-hex') {
                question = `Alak\u00edtsd \u00e1t tizenhatosba: ${value} (10)`;
                answerBase = 16;
                answerString = formatBase(value, 16);
            } else if (kind === 'hex-to-dec') {
                const hex = formatBase(value, 16);
                question = `Alak\u00edtsd \u00e1t t\u00edzesbe: ${hex} (16)`;
                answerBase = 10;
                answerString = String(value);
            } else if (kind === 'bin-to-hex') {
                const bin = formatBase(value, 2);
                question = `Alak\u00edtsd \u00e1t tizenhatosba: ${bin} (2)`;
                answerBase = 16;
                answerString = formatBase(value, 16);
            } else if (kind === 'hex-to-bin') {
                const hex = formatBase(value, 16);
                question = `Alak\u00edtsd \u00e1t kettesbe: ${hex} (16)`;
                answerBase = 2;
                answerString = formatBase(value, 2);
            }

            return {
                kind,
                number: value,
                question,
                expectedValue: value,
                answerBase,
                answerString
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
                    const signature = `${kind}:${candidate.number}`;
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
                const signature = `${kind}:${candidate.number}`;
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
                const parsed = parseBaseValue(q.userAnswer || '', q.answerBase);
                const isCorrect = parsed !== null && parsed === q.expectedValue;
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
            return [difficulty, item.kind, item.number].join('|');
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
            currentPracticeAnswer = nextQuestion.answerString;
            currentPracticeExpected = nextQuestion.expectedValue;
            currentPracticeAnswerBase = nextQuestion.answerBase;
            window.currentPracticeAnswer = currentPracticeAnswer;
            window.currentPracticeKind = nextQuestion.kind || '';
            practiceQuestion.textContent = nextQuestion.question;
            practiceInput.value = '';
            practiceFeedback.textContent = '';
            practiceFeedback.style.color = '';
            pushPracticeHistory({
                signature: nextQuestion.signature,
                kind: nextQuestion.kind,
                number: nextQuestion.number
            });
        }

        function checkPracticeAnswer() {
            if (!practiceActive) return;
            const parsed = parseBaseValue(practiceInput.value || '', currentPracticeAnswerBase);
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

        function updateDecimalModel() {
            const value = Number.parseInt(decimalInput.value, 10);
            if (!Number.isFinite(value)) {
                binaryOutput.textContent = '-';
                octalOutput.textContent = '-';
                hexOutput.textContent = '-';
                powerSumEl.textContent = '-';
                return;
            }
            binaryOutput.textContent = formatBase(value, 2);
            octalOutput.textContent = formatBase(value, 8);
            hexOutput.textContent = formatBase(value, 16);
            const sum = buildPowerSum(value);
            powerSumEl.textContent = `${formatBase(value, 2)} (2) = ${sum}`;
        }

        function updateBaseModel() {
            const base = Number(document.querySelector('input[name="base-select"]:checked')?.value || 2);
            const parsed = parseBaseValue(baseInput.value || '', base);
            if (parsed === null) {
                baseDecimalOutput.textContent = '-';
                baseError.textContent = 'Adj meg \u00e9rv\u00e9nyes sz\u00e1mot.';
                baseError.style.color = '#f04747';
                return;
            }
            baseDecimalOutput.textContent = String(parsed);
            baseError.textContent = '';
            baseError.style.color = '';
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

        if (decimalInput) decimalInput.addEventListener('input', updateDecimalModel);
        if (baseInput) baseInput.addEventListener('input', updateBaseModel);
        document.querySelectorAll('input[name="base-select"]').forEach((radio) => {
            radio.addEventListener('change', updateBaseModel);
        });

        const initialDifficulty = Array.from(difficultyButtons)
            .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
        if (initialDifficulty) {
            currentTestDifficulty = initialDifficulty;
        }

        updateDecimalModel();
        updateBaseModel();
        announceActiveTab(activeTab);
