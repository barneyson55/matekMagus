        const TOPIC_ID = 'skatulya_elv';
        const TOPIC_NAME = 'Skatulya-elv, p\u00e1ros\u00edt\u00e1sok';
        const TEST_QUESTION_COUNT = 10;
        const PRACTICE_HISTORY_LIMIT = 12;
        const PRACTICE_RETRY_LIMIT = 8;

        const DIFF_EASY = 'k\u00f6nny\u0171';
        const DIFF_NORMAL = 'norm\u00e1l';
        const DIFF_HARD = 'neh\u00e9z';

        const DIFFICULTY_LABELS = {
            [DIFF_EASY]: 'K\u00f6nny\u0171',
            [DIFF_NORMAL]: 'Norm\u00e1l',
            [DIFF_HARD]: 'Neh\u00e9z'
        };

        const QUESTION_TYPES_BY_DIFFICULTY = {
            [DIFF_EASY]: ['min-per-box', 'pair-guarantee'],
            [DIFF_NORMAL]: ['min-per-box', 'pair-guarantee', 'k-of-same', 'remainder'],
            [DIFF_HARD]: ['min-per-box', 'pair-guarantee', 'k-of-same', 'remainder']
        };

        const PRACTICE_XP_REWARDS = {
            [DIFF_EASY]: 1,
            [DIFF_NORMAL]: 2,
            [DIFF_HARD]: 3
        };

        const MIN_PER_BOX_RANGES = {
            [DIFF_EASY]: { boxesMin: 3, boxesMax: 6, itemsMin: 12, itemsMax: 28 },
            [DIFF_NORMAL]: { boxesMin: 4, boxesMax: 10, itemsMin: 25, itemsMax: 60 },
            [DIFF_HARD]: { boxesMin: 5, boxesMax: 12, itemsMin: 50, itemsMax: 120 }
        };

        const PAIR_RANGES = {
            [DIFF_EASY]: { min: 3, max: 6 },
            [DIFF_NORMAL]: { min: 5, max: 9 },
            [DIFF_HARD]: { min: 8, max: 12 }
        };

        const K_SAME_RANGES = {
            [DIFF_EASY]: { boxesMin: 4, boxesMax: 6, kMin: 3, kMax: 3 },
            [DIFF_NORMAL]: { boxesMin: 5, boxesMax: 9, kMin: 3, kMax: 4 },
            [DIFF_HARD]: { boxesMin: 6, boxesMax: 12, kMin: 4, kMax: 6 }
        };

        const REMAINDER_RANGES = {
            [DIFF_EASY]: { modMin: 3, modMax: 6 },
            [DIFF_NORMAL]: { modMin: 5, modMax: 9 },
            [DIFF_HARD]: { modMin: 7, modMax: 12 }
        };

        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        const pigeonItemsInput = document.getElementById('pigeon-items');
        const pigeonBoxesInput = document.getElementById('pigeon-boxes');
        const pigeonMinOutput = document.getElementById('pigeon-min');
        const pigeonMaxOutput = document.getElementById('pigeon-max');
        const pigeonGrid = document.getElementById('pigeon-grid');

        const pairColorsInput = document.getElementById('pair-colors');
        const pairNeededInput = document.getElementById('pair-needed');
        const pairMinOutput = document.getElementById('pair-min');
        const pairFormulaOutput = document.getElementById('pair-formula');

        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        const testArea = document.getElementById('test-area');
        const testQuestion = document.getElementById('test-question');
        const testAnswerInput = document.getElementById('test-answer');
        const testStartBtn = document.getElementById('start-test-btn');
        const prevTestBtn = document.getElementById('prev-test-btn');
        const nextTestBtn = document.getElementById('next-test-btn');
        const finishTestBtn = document.getElementById('finish-test-btn');
        const paginationDots = document.getElementById('pagination-dots');
        const resultPopup = document.getElementById('result-popup');

        const practiceDifficultyInputs = document.querySelectorAll('.practice-difficulty');
        const practiceArea = document.getElementById('practice-area');
        const practiceQuestion = document.getElementById('practice-question');
        const practiceInput = document.getElementById('practice-input');
        const practiceFeedback = document.getElementById('practice-feedback');
        const practiceStartBtn = document.getElementById('start-practice-btn');
        const practiceCheckBtn = document.getElementById('practice-check');

        let activeTab = 'elmelet';
        let currentTestDifficulty = DIFF_EASY;
        let testQuestions = [];
        let currentTestIndex = 0;
        let isTestRunning = false;
        let currentTestAnswer = null;

        let practiceActive = false;
        let practiceHistory = [];
        let currentPracticeAnswer = null;
        let currentPracticeDifficulty = DIFF_EASY;

        function randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function shuffle(list) {
            const arr = [...list];
            for (let i = arr.length - 1; i > 0; i -= 1) {
                const j = randomInt(0, i);
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        function parseNumberInput(value) {
            if (!value) return null;
            const cleaned = value.replace(/,/g, '.').replace(/\s+/g, '');
            if (!cleaned.length) return null;
            const num = Number(cleaned);
            return Number.isFinite(num) ? num : null;
        }

        function isClose(a, b, epsilon = 1e-6) {
            return Math.abs(a - b) <= epsilon;
        }

        function formatNumber(value) {
            if (Number.isInteger(value)) return String(value);
            return String(value.toFixed(2)).replace(/\.00$/, '');
        }

        function setActiveTab(tabId) {
            activeTab = tabId;
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === tabId);
            });
            tabButtons.forEach(button => {
                const isActive = button.dataset.tab === tabId;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-selected', String(isActive));
            });
        }

        function readInt(input, fallback) {
            const parsed = Number.parseInt(input.value, 10);
            return Number.isFinite(parsed) ? parsed : fallback;
        }

        function updatePigeonholeModel() {
            if (!pigeonItemsInput || !pigeonBoxesInput) return;
            const items = clamp(readInt(pigeonItemsInput, 1), 1, 200);
            const boxes = clamp(readInt(pigeonBoxesInput, 1), 1, 40);
            pigeonItemsInput.value = String(items);
            pigeonBoxesInput.value = String(boxes);

            const minPerBox = Math.ceil(items / boxes);
            const base = Math.floor(items / boxes);
            const extra = items % boxes;
            pigeonMinOutput.textContent = String(minPerBox);
            pigeonMaxOutput.textContent = `${base} + ${extra} extra`;

            pigeonGrid.innerHTML = '';
            for (let i = 0; i < boxes; i += 1) {
                const count = base + (i < extra ? 1 : 0);
                const cell = document.createElement('div');
                cell.className = 'box-cell';
                cell.innerHTML = `<span>#${i + 1}</span><strong>${count}</strong>`;
                pigeonGrid.appendChild(cell);
            }
        }

        function updatePairModel() {
            if (!pairColorsInput || !pairNeededInput) return;
            const colors = clamp(readInt(pairColorsInput, 2), 2, 20);
            const needed = clamp(readInt(pairNeededInput, 2), 2, 10);
            pairColorsInput.value = String(colors);
            pairNeededInput.value = String(needed);
            const minPick = (needed - 1) * colors + 1;
            pairMinOutput.textContent = String(minPick);
            pairFormulaOutput.textContent = `(${needed} - 1) * ${colors} + 1 = ${minPick}`;
        }

        function buildMinPerBoxQuestion(difficulty) {
            const range = MIN_PER_BOX_RANGES[difficulty] || MIN_PER_BOX_RANGES[DIFF_EASY];
            const boxes = randomInt(range.boxesMin, range.boxesMax);
            const items = randomInt(range.itemsMin, range.itemsMax);
            const answer = Math.ceil(items / boxes);
            return {
                question: `Egy gy\u0171jtem\u00e9nyben ${items} elemet ${boxes} skatuly\u00e1ba osztunk el. Minimum h\u00e1ny elem lesz biztosan valamelyik skatuly\u00e1ban?`,
                answer,
                kind: 'min-per-box'
            };
        }

        function buildPairGuaranteeQuestion(difficulty) {
            const range = PAIR_RANGES[difficulty] || PAIR_RANGES[DIFF_EASY];
            const colors = randomInt(range.min, range.max);
            const answer = colors + 1;
            return {
                question: `Egy fi\u00f3kban ${colors} k\u00fcl\u00f6nb\u00f6z\u0151 sz\u00edn\u0171 zokni van. H\u00e1nyat kell kih\u00fazni, hogy biztosan legyen egy p\u00e1r azonos sz\u00edn\u0171?`,
                answer,
                kind: 'pair-guarantee'
            };
        }

        function buildKOfSameQuestion(difficulty) {
            const range = K_SAME_RANGES[difficulty] || K_SAME_RANGES[DIFF_NORMAL];
            const boxes = randomInt(range.boxesMin, range.boxesMax);
            const needed = randomInt(range.kMin, range.kMax);
            const answer = (needed - 1) * boxes + 1;
            return {
                question: `Egy k\u00e9szletben ${boxes} kateg\u00f3ria van. H\u00e1ny elemet kell kiv\u00e1lasztani, hogy biztosan legyen legal\u00e1bb ${needed} azonos kateg\u00f3ri\u00e1b\u00f3l?`,
                answer,
                kind: 'k-of-same'
            };
        }

        function buildRemainderQuestion(difficulty) {
            const range = REMAINDER_RANGES[difficulty] || REMAINDER_RANGES[DIFF_NORMAL];
            const mod = randomInt(range.modMin, range.modMax);
            const upper = randomInt(mod + 20, mod + 80);
            const answer = mod + 1;
            return {
                question: `H\u00e1ny eg\u00e9sz sz\u00e1mot kell kiv\u00e1lasztani az 1..${upper} intervallumb\u00f3l, hogy biztosan legyen k\u00e9t sz\u00e1m, amely ${mod}-mel osztva azonos marad\u00e9kot ad?`,
                answer,
                kind: 'remainder'
            };
        }

        function buildQuestionByType(difficulty, type) {
            switch (type) {
                case 'min-per-box':
                    return buildMinPerBoxQuestion(difficulty);
                case 'pair-guarantee':
                    return buildPairGuaranteeQuestion(difficulty);
                case 'k-of-same':
                    return buildKOfSameQuestion(difficulty);
                case 'remainder':
                    return buildRemainderQuestion(difficulty);
                default:
                    return buildMinPerBoxQuestion(difficulty);
            }
        }

        function buildTestQuestions(difficulty) {
            const allowed = QUESTION_TYPES_BY_DIFFICULTY[difficulty] || QUESTION_TYPES_BY_DIFFICULTY[DIFF_EASY];
            const questions = [];
            const shuffled = shuffle(allowed);
            if (shuffled.length >= 2) {
                questions.push(buildQuestionByType(difficulty, shuffled[0]));
                questions.push(buildQuestionByType(difficulty, shuffled[1]));
            } else if (shuffled.length === 1) {
                questions.push(buildQuestionByType(difficulty, shuffled[0]));
            }
            for (let safety = 0; questions.length < TEST_QUESTION_COUNT && safety < TEST_QUESTION_COUNT * 25; safety += 1) {
                const type = allowed[randomInt(0, allowed.length - 1)];
                questions.push(buildQuestionByType(difficulty, type));
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
            let correctAnswers = 0;
            testQuestions.forEach((q) => {
                const parsed = parseNumberInput(q.userAnswer || '');
                const isCorrect = parsed !== null && isClose(parsed, q.answer);
                q.correctAnswer = formatNumber(q.answer);
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
                    correctAnswer: q.correctAnswer || formatNumber(q.answer)
                }))
            };

            if (window.parent) {
                window.parent.postMessage({ type: 'testResult', result }, '*');
            }

            isTestRunning = false;
            if (testStartBtn) {
                testStartBtn.disabled = false;
                testStartBtn.hidden = false;
                testStartBtn.innerHTML = '&#218;j teszt';
            }
            testAnswerInput.value = '';
            currentTestAnswer = null;
            window.currentTestAnswer = null;
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
            return [difficulty, item.kind || '', item.question || '', item.answer || ''].join('|');
        }

        function pushPracticeHistory(entry) {
            practiceHistory.push(entry);
            if (practiceHistory.length > PRACTICE_HISTORY_LIMIT) {
                practiceHistory.shift();
            }
        }

        function buildPracticeQuestion(difficulty, options = {}) {
            const allowed = QUESTION_TYPES_BY_DIFFICULTY[difficulty] || QUESTION_TYPES_BY_DIFFICULTY[DIFF_EASY];
            const avoidKind = options.avoidKind || '';
            let pool = allowed;
            if (avoidKind && allowed.length > 1) {
                pool = allowed.filter(type => type !== avoidKind);
                if (!pool.length) {
                    pool = allowed;
                }
            }
            const index = randomInt(0, pool.length - 1);
            return buildQuestionByType(difficulty, pool[index]);
        }

        function nextPracticeQuestion() {
            const enabled = getEnabledPracticeDifficulties();
            if (!enabled.length) {
                practiceFeedback.textContent = 'V\u00e1lassz legal\u00e1bb egy neh\u00e9zs\u00e9gi szintet.';
                practiceFeedback.style.color = '#f04747';
                return;
            }
            currentPracticeDifficulty = pickRandomDifficulty(enabled);
            window.currentPracticeDifficulty = currentPracticeDifficulty;
            const label = DIFFICULTY_LABELS[currentPracticeDifficulty] || currentPracticeDifficulty;
            const lastKind = practiceHistory.length ? practiceHistory[practiceHistory.length - 1].kind : '';
            let attempts = 0;
            let practiceItem = null;
            let signature = '';
            while (attempts < PRACTICE_RETRY_LIMIT) {
                practiceItem = buildPracticeQuestion(currentPracticeDifficulty, { avoidKind: lastKind });
                signature = makePracticeSignature(currentPracticeDifficulty, practiceItem);
                if (!practiceHistory.some(entry => entry.signature === signature)) {
                    break;
                }
                attempts += 1;
            }
            if (!practiceItem) {
                practiceItem = buildPracticeQuestion(currentPracticeDifficulty, { avoidKind: lastKind });
                signature = makePracticeSignature(currentPracticeDifficulty, practiceItem);
            }
            currentPracticeAnswer = practiceItem.answer;
            window.currentPracticeAnswer = currentPracticeAnswer;
            const practiceKind = practiceItem.kind || '';
            window.currentPracticeKind = practiceKind;
            pushPracticeHistory({ signature, kind: practiceKind });
            practiceQuestion.textContent = `${label} feladat: ${practiceItem.question}`;
            practiceInput.value = '';
            practiceFeedback.textContent = '';
            practiceFeedback.style.color = '#2c3e50';
        }

        function checkPracticeAnswer() {
            if (!practiceActive) return;
            const rawInput = practiceInput.value.trim();
            const parsed = parseNumberInput(rawInput);
            if (parsed !== null && isClose(parsed, currentPracticeAnswer)) {
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
                if (isTestRunning) {
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
                practiceHistory = [];
                practiceArea.classList.remove('is-hidden');
                nextPracticeQuestion();
            });
        }

        if (practiceCheckBtn) practiceCheckBtn.addEventListener('click', checkPracticeAnswer);
        if (practiceInput) {
            practiceInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    checkPracticeAnswer();
                }
            });
        }

        if (pigeonItemsInput) pigeonItemsInput.addEventListener('input', updatePigeonholeModel);
        if (pigeonBoxesInput) pigeonBoxesInput.addEventListener('input', updatePigeonholeModel);
        if (pairColorsInput) pairColorsInput.addEventListener('input', updatePairModel);
        if (pairNeededInput) pairNeededInput.addEventListener('input', updatePairModel);

        updatePigeonholeModel();
        updatePairModel();
        setActiveTab('elmelet');
