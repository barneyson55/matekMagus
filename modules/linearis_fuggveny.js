        const TOPIC_ID = 'linearis_fuggveny';
        const TOPIC_NAME = 'Lineáris függvény';
        const TAB_LABELS = {
            elmelet: 'Elmélet',
            vizualis: 'Vizuális modell',
            teszt: 'Teszt',
            gyakorlas: 'Gyakorlás'
        };
        const DIFFICULTY_LABELS = {
            'könnyű': 'Könnyű',
            'normál': 'Normál',
            'nehéz': 'Nehéz'
        };
        const TEST_QUESTION_COUNT = 10;
        const QUESTION_TYPES = ['value-from-equation', 'slope-from-points', 'intercept-from-point', 'x-intercept'];
        const DIFFICULTY_CONFIGS = {
            'könnyű': { m: { min: -3, max: 3, step: 1 }, b: { min: -6, max: 6, step: 1 }, x: { min: -5, max: 5, step: 1 } },
            'normál': { m: { min: -5, max: 5, step: 0.5 }, b: { min: -8, max: 8, step: 0.5 }, x: { min: -8, max: 8, step: 1 } },
            'nehéz': { m: { min: -8, max: 8, step: 0.5 }, b: { min: -10, max: 10, step: 0.5 }, x: { min: -10, max: 10, step: 1 } }
        };
        const PRACTICE_XP_REWARDS = {
            'könnyű': 1,
            'normál': 2,
            'nehéz': 3
        };

        let currentTestDifficulty = 'könnyű';
        let currentPracticeDifficulty = 'könnyű';
        let activeTab = 'elmelet';
        let currentTestAnswer = '';
        let currentPracticeAnswer = '';
        window.currentTestAnswer = '';
        window.currentPracticeAnswer = '';

        const sliderM = document.getElementById('sliderM');
        const sliderB = document.getElementById('sliderB');
        const valueM = document.getElementById('valueM');
        const valueB = document.getElementById('valueB');
        const equation = document.getElementById('equation');
        const resultPopup = document.getElementById('resultPopup');
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        const testStartBtn = document.getElementById('start-test-btn');
        const testArea = document.getElementById('test-area');
        const testQuestion = document.getElementById('test-question');
        const testAnswerInput = document.getElementById('test-answer');
        const paginationDots = document.getElementById('pagination-dots');
        const prevTestBtn = document.getElementById('prev-q');
        const nextTestBtn = document.getElementById('next-q');
        const finishTestBtn = document.getElementById('finish-test-btn');
        const practiceStartBtn = document.getElementById('start-practice-btn');
        const practiceArea = document.getElementById('practice-area');
        const practiceQuestion = document.getElementById('practice-question');
        const practiceInput = document.getElementById('practice-input');
        const practiceCheck = document.getElementById('practice-check');
        const practiceFeedback = document.getElementById('practice-feedback');
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        const practiceDifficultyInputs = document.querySelectorAll('.practice-difficulty');
        const exampleGrid = document.getElementById('example-grid');
        const randomExampleBtn = document.getElementById('random-example-btn');
        const regenExamplesBtn = document.getElementById('regen-examples-btn');

        let testQuestions = [];
        let currentTestIndex = 0;
        let correctAnswers = 0;
        let isTestRunning = false;
        let practiceActive = false;
        const PRACTICE_HISTORY_LIMIT = 6;
        const PRACTICE_RETRY_LIMIT = 12;
        const practiceHistory = [];

        const ctx = document.getElementById('functionChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 21}, (_, i) => i - 10),
                datasets: [{
                    label: 'f(x) = mx + b',
                    data: [],
                    borderColor: '#5865f2',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: '#e0e5ec' },
                        ticks: { font: { size: 14, weight: '500' } }
                    },
                    y: {
                        grid: { color: '#e0e5ec' },
                        ticks: { font: { size: 14, weight: '500' } }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });

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

        function updateFunction() {
            const m = parseFloat(sliderM.value);
            const b = parseFloat(sliderB.value);
            valueM.textContent = m;
            valueB.textContent = b;
            equation.textContent = formatEquation(m, b);
            const newData = chart.data.labels.map(x => m * x + b);
            chart.data.datasets[0].data = newData;
            chart.update();
        }

        function formatNumber(value) {
            if (!Number.isFinite(value)) return '';
            const rounded = Math.round(value * 100) / 100;
            return Number.isInteger(rounded) ? String(rounded) : String(rounded);
        }

        function formatEquation(m, b) {
            const formattedM = formatNumber(m);
            const formattedB = formatNumber(Math.abs(b));
            const sign = b >= 0 ? '+' : '-';
            return `f(x) = ${formattedM}x ${sign} ${formattedB}`;
        }

        function parseNumberInput(value) {
            const normalized = value.trim().replace(',', '.');
            if (!normalized) return null;
            const parsed = Number(normalized);
            return Number.isFinite(parsed) ? parsed : null;
        }

        function isClose(a, b) {
            return Math.abs(a - b) <= 0.01;
        }

        function randomInt(min, max, avoidZero = false) {
            let value = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!avoidZero) return value;
            while (value === 0) {
                value = Math.floor(Math.random() * (max - min + 1)) + min;
            }
            return value;
        }

        function getDifficultyConfig(difficulty) {
            return DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS['könnyű'];
        }

        function randomStep(min, max, step) {
            const totalSteps = Math.round((max - min) / step);
            const index = randomInt(0, totalSteps);
            const value = min + (index * step);
            return Math.round(value * 100) / 100;
        }

        function shuffle(list) {
            const array = list.slice();
            for (let i = array.length - 1; i > 0; i -= 1) {
                const j = randomInt(0, i);
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        function getSliderConfig(input) {
            return {
                min: parseFloat(input.min),
                max: parseFloat(input.max),
                step: parseFloat(input.step || '1')
            };
        }

        function buildExampleFromSliders() {
            const mConfig = getSliderConfig(sliderM);
            const bConfig = getSliderConfig(sliderB);
            const m = randomStep(mConfig.min, mConfig.max, mConfig.step);
            const b = randomStep(bConfig.min, bConfig.max, bConfig.step);
            return { m, b };
        }

        function applyLinearExample(m, b) {
            sliderM.value = String(m);
            sliderB.value = String(b);
            updateFunction();
        }

        function createExampleLabel(m, b) {
            return `m=${formatNumber(m)}, b=${formatNumber(b)}`;
        }

        function renderExampleGrid(examples) {
            if (!exampleGrid) return;
            exampleGrid.innerHTML = '';
            examples.forEach((example) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'example-card';
                btn.textContent = createExampleLabel(example.m, example.b);
                btn.addEventListener('click', () => applyLinearExample(example.m, example.b));
                exampleGrid.appendChild(btn);
            });
        }

        function generateExampleSet(count = 6) {
            const examples = [];
            while (examples.length < count) {
                examples.push(buildExampleFromSliders());
            }
            return examples;
        }

        function buildLinearParams(difficulty, options = {}) {
            const config = getDifficultyConfig(difficulty);
            const avoidZero = options.avoidZeroM === true;
            let m = randomStep(config.m.min, config.m.max, config.m.step);
            if (avoidZero) {
                let guard = 0;
                while (m === 0 && guard < 20) {
                    m = randomStep(config.m.min, config.m.max, config.m.step);
                    guard += 1;
                }
                if (m === 0) m = config.m.step;
            }
            const b = randomStep(config.b.min, config.b.max, config.b.step);
            const x = randomStep(config.x.min, config.x.max, config.x.step);
            return { m, b, x };
        }

        function pickDistinctX(config, avoidValue) {
            let next = randomStep(config.x.min, config.x.max, config.x.step);
            let guard = 0;
            while (next === avoidValue && guard < 20) {
                next = randomStep(config.x.min, config.x.max, config.x.step);
                guard += 1;
            }
            return next;
        }

        function buildQuestionByType(difficulty, type) {
            const config = getDifficultyConfig(difficulty);
            const requiresNonZeroM = type === 'x-intercept';
            const line = buildLinearParams(difficulty, { avoidZeroM: requiresNonZeroM });
            const eq = formatEquation(line.m, line.b);
            const x1 = randomStep(config.x.min, config.x.max, config.x.step);
            const x2 = pickDistinctX(config, x1);
            const y1 = line.m * x1 + line.b;
            const y2 = line.m * x2 + line.b;
            const x0 = randomStep(config.x.min, config.x.max, config.x.step);
            const y0 = line.m * x0 + line.b;
            const xValue = randomStep(config.x.min, config.x.max, config.x.step);
            const xIntercept = -line.b / line.m;

            if (type === 'slope-from-points') {
                const answer = line.m;
                return {
                    kind: 'slope-from-points',
                    question: `Az egyenes átmegy a (${formatNumber(x1)}, ${formatNumber(y1)}) és (${formatNumber(x2)}, ${formatNumber(y2)}) pontokon. Mi a meredeksége (m)?`,
                    answer,
                    answerString: formatNumber(answer)
                };
            }
            if (type === 'intercept-from-point') {
                const answer = line.b;
                return {
                    kind: 'intercept-from-point',
                    question: `Az egyenes meredeksége m = ${formatNumber(line.m)} és átmegy a (${formatNumber(x0)}, ${formatNumber(y0)}) ponton. Mi a tengelymetszete (b)?`,
                    answer,
                    answerString: formatNumber(answer)
                };
            }
            if (type === 'x-intercept') {
                const answer = xIntercept;
                return {
                    kind: 'x-intercept',
                    question: `Hol metszi az x-tengelyt az egyenes? (${eq}) Add meg az x értékét!`,
                    answer,
                    answerString: formatNumber(answer)
                };
            }
            const answer = line.m * xValue + line.b;
            return {
                kind: 'value-from-equation',
                question: `Mennyi f(${formatNumber(xValue)})? (${eq})`,
                answer,
                answerString: formatNumber(answer)
            };
        }

        function buildRandomQuestion(difficulty) {
            const index = randomInt(0, QUESTION_TYPES.length - 1);
            return buildQuestionByType(difficulty, QUESTION_TYPES[index]);
        }

        function buildTestQuestions(difficulty) {
            const questions = [];
            const used = new Set();
            const isValid = (question) => Number.isFinite(question.answer);
            const makeSignature = (question) => [question.kind, question.question, formatNumber(question.answer)].join('|');

            QUESTION_TYPES.forEach((type) => {
                let selected = null;
                let attempts = 0;
                while (attempts < 30) {
                    const candidate = buildQuestionByType(difficulty, type);
                    const signature = makeSignature(candidate);
                    if (isValid(candidate) && !used.has(signature)) {
                        used.add(signature);
                        selected = candidate;
                        break;
                    }
                    attempts += 1;
                }
                if (selected) questions.push(selected);
            });

            for (let safety = 0; questions.length < TEST_QUESTION_COUNT && safety < TEST_QUESTION_COUNT * 25; safety += 1) {
                const candidate = buildRandomQuestion(difficulty);
                const signature = makeSignature(candidate);
                if (isValid(candidate) && !used.has(signature)) {
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
                const parsed = parseNumberInput(q.userAnswer || '');
                const isCorrect = parsed !== null && isClose(parsed, q.answer);
                q.correctAnswer = q.answerString || formatNumber(q.answer);
                q.isCorrect = isCorrect;
                if (isCorrect) correctAnswers += 1;
            });
            const percentage = Math.round((correctAnswers / total) * 100);
            let grade = 0;
            let feedback = '';

            if (percentage < 40) { grade = 1; feedback = 'Elégtelen (1)'; }
            else if (percentage < 55) { grade = 2; feedback = 'Elégséges (2)'; }
            else if (percentage < 70) { grade = 3; feedback = 'Közepes (3)'; }
            else if (percentage < 85) { grade = 4; feedback = 'Jó (4)'; }
            else { grade = 5; feedback = 'Jeles (5)'; }

            showResultPopup(`Eredmény: ${percentage}% - ${feedback}`);

            const result = {
                topicId: TOPIC_ID,
                topicName: TOPIC_NAME,
                difficulty: currentTestDifficulty,
                grade: grade,
                percentage: percentage,
                timestamp: new Date().toISOString(),
                questions: testQuestions.map((q) => ({
                    question: q.question,
                    kind: q.kind || '',
                    userAnswer: q.userAnswer || '',
                    correctAnswer: q.correctAnswer || q.answerString || formatNumber(q.answer),
                    expectedValue: Number.isFinite(q.answer) ? q.answer : null,
                    isCorrect: Boolean(q.isCorrect)
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
            if (!list.length) return 'könnyű';
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
            const avoidKind = options.avoidKind || '';
            let pool = QUESTION_TYPES;
            if (avoidKind && QUESTION_TYPES.length > 1) {
                pool = QUESTION_TYPES.filter(type => type !== avoidKind);
                if (!pool.length) {
                    pool = QUESTION_TYPES;
                }
            }
            const index = randomInt(0, pool.length - 1);
            return buildQuestionByType(difficulty, pool[index]);
        }

        function nextPracticeQuestion() {
            const enabled = getEnabledPracticeDifficulties();
            if (!enabled.length) {
                practiceFeedback.textContent = 'Válassz legalább egy nehézségi szintet.';
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
                practiceFeedback.textContent = 'Próbáld újra!';
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
                    practiceFeedback.textContent = 'Válassz legalább egy nehézségi szintet.';
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

        sliderM.addEventListener('input', updateFunction);
        sliderB.addEventListener('input', updateFunction);

        if (randomExampleBtn) {
            randomExampleBtn.addEventListener('click', () => {
                const example = buildExampleFromSliders();
                applyLinearExample(example.m, example.b);
            });
        }
        if (regenExamplesBtn) {
            regenExamplesBtn.addEventListener('click', () => {
                renderExampleGrid(generateExampleSet());
            });
        }

        const initialDifficulty = Array.from(difficultyButtons)
            .find(btn => btn.classList.contains('active'))?.dataset.difficulty;
        if (initialDifficulty) {
            currentTestDifficulty = initialDifficulty;
        }

        updateFunction();
        renderExampleGrid(generateExampleSet());
        setActiveTab('elmelet');
