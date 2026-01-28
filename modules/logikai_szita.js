        const TOPIC_ID = 'logikai_szita';
        const TOPIC_NAME = 'Logikai szita formula';
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
            [DIFF_EASY]: ['set-union', 'set-intersection'],
            [DIFF_NORMAL]: ['set-union', 'set-intersection', 'multiples-union'],
            [DIFF_HARD]: ['set-union', 'set-intersection', 'multiples-union', 'multiples-intersection']
        };
        const PRACTICE_XP_REWARDS = {
            [DIFF_EASY]: 1,
            [DIFF_NORMAL]: 2,
            [DIFF_HARD]: 3
        };
        const SET_RANGES = {
            [DIFF_EASY]: { min: 4, max: 14 },
            [DIFF_NORMAL]: { min: 8, max: 24 },
            [DIFF_HARD]: { min: 12, max: 34 }
        };
        const MULTIPLES_RANGES = {
            [DIFF_EASY]: { nMin: 30, nMax: 60, divisorMin: 2, divisorMax: 6 },
            [DIFF_NORMAL]: { nMin: 40, nMax: 80, divisorMin: 2, divisorMax: 10 },
            [DIFF_HARD]: { nMin: 60, nMax: 120, divisorMin: 3, divisorMax: 12 }
        };
        const unionSymbol = '\u222a';
        const intersectionSymbol = '\u2229';

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

        const setSizeA = document.getElementById('set-size-a');
        const setSizeB = document.getElementById('set-size-b');
        const setIntersectionInput = document.getElementById('set-intersection');
        const setFormulaText = document.getElementById('set-formula');
        const setUnionValue = document.getElementById('set-union-value');
        const setIntersectionValue = document.getElementById('set-intersection-value');
        const setOnlyA = document.getElementById('set-only-a');
        const setOnlyB = document.getElementById('set-only-b');
        const setExampleGrid = document.getElementById('set-example-grid');
        const randomSetBtn = document.getElementById('random-set-btn');
        const regenSetBtn = document.getElementById('regen-set-btn');

        const rangeN = document.getElementById('range-n');
        const rangeA = document.getElementById('range-a');
        const rangeB = document.getElementById('range-b');
        const rangeFormula = document.getElementById('range-formula');
        const rangeCountA = document.getElementById('range-count-a');
        const rangeCountB = document.getElementById('range-count-b');
        const rangeCountBoth = document.getElementById('range-count-both');
        const rangeCountUnion = document.getElementById('range-count-union');
        const randomRangeBtn = document.getElementById('random-range-btn');

        let activeTab = 'elmelet';
        let testQuestions = [];
        let currentTestIndex = 0;
        let currentTestDifficulty = DIFF_EASY;
        let currentTestAnswer = '';
        let correctAnswers = 0;
        let isTestRunning = false;

        let currentPracticeAnswer = '';
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

        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        function readInt(input, fallback) {
            const value = Number.parseInt(input.value, 10);
            return Number.isFinite(value) ? value : fallback;
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
            if (a === 0 || b === 0) return 0;
            return Math.abs(a * b) / gcd(a, b);
        }

        function formatNumber(value) {
            if (!Number.isFinite(value)) return '';
            const rounded = Math.round(value * 100) / 100;
            return Number.isInteger(rounded) ? String(rounded) : String(rounded);
        }

        function parseNumberInput(value) {
            const normalized = value.trim().replace(',', '.');
            if (normalized.length === 0) return null;
            const parsed = Number.parseFloat(normalized);
            return Number.isFinite(parsed) ? parsed : null;
        }

        function isClose(a, b) {
            return Math.abs(a - b) < 0.0001;
        }

        function buildSetExample(range) {
            const a = randomInt(range.min, range.max);
            const b = randomInt(range.min, range.max);
            const intersection = randomInt(0, Math.min(a, b));
            const union = a + b - intersection;
            return { a, b, intersection, union };
        }

        function buildRangeExample(range) {
            const n = randomInt(range.nMin, range.nMax);
            let a = randomInt(range.divisorMin, range.divisorMax);
            let b = randomInt(range.divisorMin, range.divisorMax);
            if (a === b) {
                b = a === range.divisorMax ? a - 1 : a + 1;
            }
            return { n, a, b };
        }

        function applySetExample(example) {
            setSizeA.value = String(example.a);
            setSizeB.value = String(example.b);
            setIntersectionInput.value = String(example.intersection);
            updateSetModel();
        }

        function applyRangeExample(example) {
            rangeN.value = String(example.n);
            rangeA.value = String(example.a);
            rangeB.value = String(example.b);
            updateRangeModel();
        }

        function generateSetExamples(count = 6) {
            const range = SET_RANGES[DIFF_NORMAL];
            const examples = [];
            for (let i = 0; i < count; i += 1) {
                examples.push(buildSetExample(range));
            }
            return examples;
        }

        function renderSetExamples(examples) {
            if (!setExampleGrid) return;
            setExampleGrid.innerHTML = '';
            examples.forEach(example => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'example-card';
                const line1 = document.createElement('strong');
                line1.textContent = `|A|=${example.a}`;
                const line2 = document.createElement('span');
                line2.textContent = `|B|=${example.b}`;
                const line3 = document.createElement('span');
                line3.textContent = `|A${intersectionSymbol}B|=${example.intersection}`;
                card.append(line1, line2, line3);
                card.addEventListener('click', () => applySetExample(example));
                setExampleGrid.appendChild(card);
            });
        }

        function updateSetModel() {
            const a = readInt(setSizeA, 12);
            const b = readInt(setSizeB, 9);
            const maxIntersection = Math.min(a, b);
            let intersection = readInt(setIntersectionInput, 4);
            intersection = clamp(intersection, 0, maxIntersection);
            setIntersectionInput.max = String(maxIntersection);
            if (setIntersectionInput.value !== String(intersection)) {
                setIntersectionInput.value = String(intersection);
            }
            const union = a + b - intersection;
            const onlyA = a - intersection;
            const onlyB = b - intersection;

            setFormulaText.textContent = `|A${unionSymbol}B| = |A| + |B| - |A${intersectionSymbol}B| = ${a} + ${b} - ${intersection} = ${union}`;
            setUnionValue.textContent = String(union);
            setIntersectionValue.textContent = String(intersection);
            setOnlyA.textContent = String(onlyA);
            setOnlyB.textContent = String(onlyB);
        }

        function updateRangeModel() {
            const n = readInt(rangeN, 50);
            const a = clamp(readInt(rangeA, 4), 1, 999);
            const b = clamp(readInt(rangeB, 6), 1, 999);
            if (rangeA.value !== String(a)) {
                rangeA.value = String(a);
            }
            if (rangeB.value !== String(b)) {
                rangeB.value = String(b);
            }
            const lcmValue = lcm(a, b);
            const countA = Math.floor(n / a);
            const countB = Math.floor(n / b);
            const countBoth = lcmValue === 0 ? 0 : Math.floor(n / lcmValue);
            const union = countA + countB - countBoth;

            rangeFormula.textContent = `|A${unionSymbol}B| = floor(N / a) + floor(N / b) - floor(N / lkkt(a,b)) = ${countA} + ${countB} - ${countBoth} = ${union}`;
            rangeCountA.textContent = String(countA);
            rangeCountB.textContent = String(countB);
            rangeCountBoth.textContent = String(countBoth);
            rangeCountUnion.textContent = String(union);
        }

        function buildSetUnionQuestion(difficulty) {
            const range = SET_RANGES[difficulty] || SET_RANGES[DIFF_EASY];
            const data = buildSetExample(range);
            return {
                question: `Adott: |A| = ${data.a}, |B| = ${data.b}, |A${intersectionSymbol}B| = ${data.intersection}. Sz\u00e1m\u00edtsd ki |A${unionSymbol}B|-t!`,
                answer: data.union,
                kind: 'set-union'
            };
        }

        function buildSetIntersectionQuestion(difficulty) {
            const range = SET_RANGES[difficulty] || SET_RANGES[DIFF_EASY];
            const data = buildSetExample(range);
            return {
                question: `Adott: |A| = ${data.a}, |B| = ${data.b}, |A${unionSymbol}B| = ${data.union}. Mennyi |A${intersectionSymbol}B|?`,
                answer: data.intersection,
                kind: 'set-intersection'
            };
        }

        function buildMultiplesUnionQuestion(difficulty) {
            const range = MULTIPLES_RANGES[difficulty] || MULTIPLES_RANGES[DIFF_NORMAL];
            const example = buildRangeExample(range);
            const lcmValue = lcm(example.a, example.b);
            const countA = Math.floor(example.n / example.a);
            const countB = Math.floor(example.n / example.b);
            const countBoth = Math.floor(example.n / lcmValue);
            const union = countA + countB - countBoth;
            return {
                question: `H\u00e1ny 1..${example.n} k\u00f6z\u00f6tti sz\u00e1m oszthat\u00f3 ${example.a}-val vagy ${example.b}-vel?`,
                answer: union,
                kind: 'multiples-union'
            };
        }

        function buildMultiplesIntersectionQuestion(difficulty) {
            const range = MULTIPLES_RANGES[difficulty] || MULTIPLES_RANGES[DIFF_HARD];
            const example = buildRangeExample(range);
            const lcmValue = lcm(example.a, example.b);
            const countBoth = Math.floor(example.n / lcmValue);
            return {
                question: `H\u00e1ny 1..${example.n} k\u00f6z\u00f6tti sz\u00e1m oszthat\u00f3 egyszerre ${example.a}-val \u00e9s ${example.b}-vel?`,
                answer: countBoth,
                kind: 'multiples-intersection'
            };
        }

        function buildQuestionByType(difficulty, type) {
            switch (type) {
                case 'set-union':
                    return buildSetUnionQuestion(difficulty);
                case 'set-intersection':
                    return buildSetIntersectionQuestion(difficulty);
                case 'multiples-union':
                    return buildMultiplesUnionQuestion(difficulty);
                case 'multiples-intersection':
                    return buildMultiplesIntersectionQuestion(difficulty);
                default:
                    return buildSetUnionQuestion(difficulty);
            }
        }

        function shuffle(list) {
            const arr = [...list];
            for (let i = arr.length - 1; i > 0; i -= 1) {
                const j = randomInt(0, i);
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        function buildTestQuestions(difficulty) {
            const allowed = QUESTION_TYPES_BY_DIFFICULTY[difficulty] || QUESTION_TYPES_BY_DIFFICULTY[DIFF_EASY];
            const questions = [];
            if (allowed.length >= 2) {
                const shuffledTypes = shuffle(allowed);
                questions.push(buildQuestionByType(difficulty, shuffledTypes[0]));
                questions.push(buildQuestionByType(difficulty, shuffledTypes[1]));
            } else if (allowed.length === 1) {
                questions.push(buildQuestionByType(difficulty, allowed[0]));
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
                grade,
                percentage,
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
                practiceFeedback.textContent = 'V\u00e1lassz legal\u00e1bb egy neh\u00e9zs\u00e9get.';
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

        if (setSizeA) setSizeA.addEventListener('input', updateSetModel);
        if (setSizeB) setSizeB.addEventListener('input', updateSetModel);
        if (setIntersectionInput) setIntersectionInput.addEventListener('input', updateSetModel);
        if (rangeN) rangeN.addEventListener('input', updateRangeModel);
        if (rangeA) rangeA.addEventListener('input', updateRangeModel);
        if (rangeB) rangeB.addEventListener('input', updateRangeModel);

        if (randomSetBtn) {
            randomSetBtn.addEventListener('click', () => {
                const example = buildSetExample(SET_RANGES[DIFF_NORMAL]);
                applySetExample(example);
            });
        }
        if (regenSetBtn) {
            regenSetBtn.addEventListener('click', () => {
                renderSetExamples(generateSetExamples());
            });
        }
        if (randomRangeBtn) {
            randomRangeBtn.addEventListener('click', () => {
                const example = buildRangeExample(MULTIPLES_RANGES[DIFF_NORMAL]);
                applyRangeExample(example);
            });
        }

        const initialDifficulty = Array.from(difficultyButtons)
            .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
        if (initialDifficulty) {
            currentTestDifficulty = initialDifficulty;
        }

        renderSetExamples(generateSetExamples());
        updateSetModel();
        updateRangeModel();
        setActiveTab('elmelet');
