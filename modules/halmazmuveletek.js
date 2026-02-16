        const TOPIC_ID = 'halmazmuveletek';
        const TAB_LABELS = {
            miert: 'Elmélet',
            hogyan: 'Vizuális modell',
            teszt: 'Teszt',
            gyakorlas: 'Gyakorlás'
        };
        let activeTab = 'miert';
        let currentDifficulty = 'könnyű';
        let isTestActive = false;
        let questions = [];
        let currentQuestionIndex = 0;

        const questionBanks = {
            könnyű: [
                { type: 'mc', q: "$A = \\{1, 2, 5\\}, B = \\{2, 3, 5\\}$. Mi az $A \\cup B$?", o: ["$\\{2, 5\\}$", "$\\{1, 2, 3, 5\\}$", "$\\{1, 3\\}$"], a: 1 },
                { type: 'mc', q: "$A = \\{a, b, c\\}, B = \\{b, d\\}$. Mi az $A \\cap B$?", o: ["$\\{a, c, d\\}$", "$\\{b\\}$", "$\\{a, b, c, d\\}$"], a: 1 },
                { type: 'input', q: "$A = \\{4, 8, 12\\}, B = \\{8, 10\\}$. Mi az $A \\setminus B$? Írd be az elemeket vesszővel!", a: "4,12" },
                { type: 'mc', q: "Melyik jelöli az üres halmazt?", o: ["$U$", "$\\emptyset$", "$A'$"], a: 1 },
                { type: 'mc', q: "$A = \\{1, 2\\}, B = \\{1, 2, 3\\}$. Melyik állítás igaz?", o: ["$A \\subset B$", "$B \\subset A$", "$A = B$"], a: 0 },
                { type: 'input', q: "$A = \\{10, 20\\}, B = \\{20, 30\\}$. Mi az $A \\cap B$? Írd be az elemet!", a: "20" },
                { type: 'mc', q: "Ha egy elem A-ban és B-ben is benne van, akkor eleme a ...?", o: ["metszetüknek", "csak A-nak", "különbségüknek"], a: 0 },
                { type: 'input', q: "$K = \\{a,b,c\\}, L = \\{c,d,e\\}$. Mi a $K \\cup L$? Írd be az elemeket vesszővel!", a: "a,b,c,d,e" },
                { type: 'mc', q: "Mi az $A \\setminus A$ művelet eredménye?", o: ["$A$", "$U$", "$\\emptyset$"], a: 2 },
                { type: 'mc', q: "Ha $A \\cap B = \\emptyset$, akkor a két halmaz...", o: ["egyenlő", "diszjunkt", "részhalmazai egymásnak"], a: 1 },
            ],
            normál: [
                { type: 'input', q: "$U = \\{1,2,3,4,5\\}, A = \\{1,3\\}$. Mi az $\\bar{A}$?", a: "2,4,5" },
                { type: 'mc', q: "Hány részhalmaza van egy 3 elemű halmaznak?", o: ["6", "8", "9"], a: 1 },
                { type: 'input', q: "$A=\\{1,2\\}, B=\\{3,4\\}$. Mi $(A \\cup B) \\cap A$?", a: "1,2" },
                { type: 'mc', q: "$A=\\{1,2,3\\}, B=\\{2,3,4\\}$. Hány eleme van a $(A \\setminus B) \\cup (B \\setminus A)$ halmaznak?", o: ["1", "2", "4"], a: 1 },
                { type: 'mc', q: "Melyik igaz: $A \\cup \\emptyset = $?", o: ["$A$", "$U$", "$\\emptyset$"], a: 0 },
                { type: 'mc', q: "Melyik igaz: $A \\cap U = $?", o: ["$U$", "$\\emptyset$", "$A$"], a: 2 },
                { type: 'input', q: "Páros számok halmaza ($P$), Prímszámok halmaza ($T$). Mi $P \\cap T$?", a: "2" },
                { type: 'mc', q: "Mi $(\\bar{A})$ komplementere?", o: ["$\\emptyset$", "$U$", "$A$"], a: 2 },
                { type: 'mc', q: "Hogyan nevezzük az $(A \\setminus B) \\cup (B \\setminus A)$ műveletet?", o: ["De Morgan-azonosság", "Szimmetrikus differencia", "Asszociativitás"], a: 1 },
                { type: 'input', q: "$A=\\{5,10,15\\}, B=\\{10,20\\}$. Mi $B \\setminus A$?", a: "20" },
            ],
            nehéz: [
                { type: 'mc', q: "Mivel egyenlő $(A \\cup B) \\cap A$?", o: ["$A$", "$B$", "$A \\cup B$"], a: 0 },
                { type: 'mc', q: "A De Morgan-azonosság szerint $\\overline{A \\cup B} = $...", o: ["$\\bar{A} \\cup \\bar{B}$", "$\\bar{A} \\cap \\bar{B}$", "$\\overline{A \\cap B}$"], a: 1 },
                { type: 'input', q: "$A=\\{x|x<5, x\\in\\mathbb{N}\\}, B=\\{\\text{páros számok}\\}$. Mi $A\\cap B$?", a: "2,4" },
                { type: 'mc', q: "Egy osztályban 15-en tanulnak angolt, 12-en németet. 5-en mindkettőt. Hányan tanulnak legalább egy nyelvet?", o: ["27", "22", "32"], a: 1 },
                { type: 'mc', q: "$|A|=5, |B|=4, |A\\cup B|=7$. Mennyi $|A\\cap B|$?", o: ["2", "3", "9"], a: 0 },
                { type: 'mc', q: "Mivel egyenlő $A \\cup (A \\cap B)$?", o: ["$A \\cap B$", "$B$", "$A$"], a: 2 },
                { type: 'input', q: "$U=\\{1..10\\}, A=\\{\\text{páros}\\}, B=\\{3-mal osztható\\}$. Mi $\\overline{A\\cup B}$?", a: "1,5,7" },
                { type: 'mc', q: "$|A|=10, |B|=8$, A és B diszjunktak. Mennyi $|A\\cup B|$?", o: ["Nem lehet tudni", "2", "18"], a: 2 },
                { type: 'mc', q: "Mivel egyenlő $(A \\setminus B) \\cap B$?", o: ["$A$", "$\\emptyset$", "$B$"], a: 1 },
                { type: 'input', q: "$A=\\{\\text{prímek 10-ig}\\}, B=\\{\\text{páratlanok 10-ig}\\}$. Mi $(A\\cup B)\\setminus(A\\cap B)$?", a: "1,2,9" },
            ]
        };
        const dom = {
            tabButtons: document.querySelectorAll('.tab-button'),
            tabContents: document.querySelectorAll('.tab-content'),
            difficultyBtns: document.querySelectorAll('.difficulty-btn'),
            startTestBtn: document.getElementById('start-test-btn'),
            testArea: document.getElementById('test-area'),
            dotsContainer: document.getElementById('pagination-dots'),
            questionBox: document.getElementById('question-box'),
            questionText: document.getElementById('question-text'),
            answerArea: document.getElementById('answer-area'),
            prevBtn: document.getElementById('prev-q'),
            nextBtn: document.getElementById('next-q'),
            finishTestBtn: document.getElementById('finish-test-btn'),
            resultPopup: document.getElementById('resultPopup'),
            opButtons: document.querySelectorAll('.op-button'),
            definitionBox: document.getElementById('definition-box'),
            vennSvg: document.getElementById('venn-svg'),
            instantPractice: document.getElementById('instant-practice'),
            instantQ: document.getElementById('instant-q'),
            instantInput: document.getElementById('instant-input'),
            instantCheck: document.getElementById('instant-check'),
            instantFeedback: document.getElementById('instant-feedback'),
            // practice elements
            practiceControls: document.querySelector('.practice-controls'),
            practiceQuestion: document.getElementById('practice-question'),
            practiceHint: document.getElementById('practice-hint'),
            practiceInput: document.getElementById('practice-input'),
            practiceCheck: document.getElementById('practice-check'),
            practiceFeedback: document.getElementById('practice-feedback'),
            practiceArea: document.getElementById('practice-area'),
            startPracticeBtn: document.getElementById('start-practice-btn')
        };

        function normalizeSetToken(token) {
            const trimmed = token.trim();
            if (!trimmed) return '';
            const lowered = trimmed.toLowerCase();
            if (/^-?\d+$/.test(lowered)) {
                return String(Number(lowered));
            }
            return lowered;
        }

        function parseSetInput(raw) {
            if (!raw) return [];
            const trimmed = raw.trim();
            if (!trimmed) return [];
            const collapsed = trimmed.replace(/\s+/g, '').toLowerCase();
            if (collapsed === '∅' || collapsed === 'emptyset') return [];
            let cleaned = trimmed.replace(/[{}]/g, '').replace(/[()]/g, '');
            cleaned = cleaned.replace(/;/g, ',');
            const parts = cleaned.includes(',')
                ? cleaned.split(',')
                : cleaned.trim().split(/\s+/);
            return parts.map(normalizeSetToken).filter(Boolean);
        }

        function normalizeSetInput(raw) {
            const tokens = parseSetInput(raw);
            return Array.from(new Set(tokens)).sort();
        }

        function setsEqual(expectedRaw, actualRaw) {
            const expected = normalizeSetInput(expectedRaw);
            const actual = normalizeSetInput(actualRaw);
            if (expected.length !== actual.length) return false;
            for (let i = 0; i < expected.length; i++) {
                if (expected[i] !== actual[i]) return false;
            }
            return true;
        }

        function announceActiveTab(tabName) {
            const subtitle = TAB_LABELS[tabName] || '';
            if (window.parent) {
                window.parent.postMessage({ type: 'module-sheet', topicId: TOPIC_ID, subtitle }, '*');
            }
        }

        function openTab(tabName) {
            dom.tabContents.forEach(t => t.classList.remove('active'));
            document.getElementById(tabName).classList.add('active');
            dom.tabButtons.forEach(b => b.classList.remove('active'));
            document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`).classList.add('active');
            announceActiveTab(tabName);
            activeTab = tabName;
            if (tabName === 'teszt' && !isTestActive) {
                startTest();
            }
        }

        announceActiveTab('miert');

        const operations = {
            union: {
                def: "<p><b>Unió ($A \\cup B$):</b> Azok az elemek, amelyek <b>legalább az egyik</b> halmazban benne vannak.</p>",
                regions: ['A_only', 'B_only', 'intersection'],
                practice: { q: "$A=\\{1,2\\}, B=\\{2,3\\}$. Mi az $A \\cup B$?", a: "1,2,3" }
            },
            intersection: {
                def: "<p><b>Metszet ($A \\cap B$):</b> Azok az elemek, amelyek <b>mindkét</b> halmazban benne vannak.</p>",
                regions: ['intersection'],
                practice: { q: "$A=\\{1,2\\}, B=\\{2,3\\}$. Mi az $A \\cap B$?", a: "2" }
            },
            diff_a_b: {
                def: "<p><b>Különbség ($A \\setminus B$):</b> Azok az elemek, amelyek <b>A-ban benne vannak, de B-ben nem</b>.</p>",
                regions: ['A_only'],
                practice: { q: "$A=\\{1,2\\}, B=\\{2,3\\}$. Mi az $A\\setminus B$?", a: "1" }
            },
            diff_b_a: {
                def: "<p><b>Különbség ($B \\setminus A$):</b> Azok az elemek, amelyek <b>B-ben benne vannak, de A-ban nem</b>.</p>",
                regions: ['B_only'],
                practice: { q: "$A=\\{1,2\\}, B=\\{2,3\\}$. Mi az $B\\setminus A$?", a: "3" }
            },
            comp_a: {
                def: "<p><b>Komplementer ($\\bar{A}$):</b> Azok az elemek, amelyek az alaphalmazban (U) benne vannak, de az <b>A halmazban nem</b>.</p>",
                regions: ['universe'],
                practice: { q: "$U=\\{1,2,3,4\\}, A=\\{1,2\\}$. Mi az $\\bar{A}$?", a: "3,4" }
            }
        };

        dom.opButtons.forEach(button => {
            button.addEventListener('click', () => {
                dom.opButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const op = button.dataset.op;
                document.querySelectorAll('.venn-region').forEach(r => r.classList.remove('active'));
                operations[op].regions.forEach(r => dom.vennSvg.querySelector(`[data-region="${r}"]`).classList.add('active'));
                dom.definitionBox.innerHTML = operations[op].def;
                dom.instantPractice.style.display = 'block';
                dom.instantQ.textContent = operations[op].practice.q;
                dom.instantCheck.onclick = () => checkInstantAnswer(operations[op].practice.a);
                dom.instantInput.value = '';
                dom.instantFeedback.textContent = '';
                const renderOptions = { delimiters: [ {left: '$', right: '$', display: false} ] };
                renderMathInElement(dom.definitionBox, renderOptions);
                renderMathInElement(dom.instantPractice, renderOptions);
            });
        });

        function checkInstantAnswer(correctAnswer) {
            const userAnswer = dom.instantInput.value;
            if (setsEqual(correctAnswer, userAnswer)) {
                dom.instantFeedback.textContent = "Helyes!";
                dom.instantFeedback.style.color = "var(--success)";
            } else {
                dom.instantFeedback.textContent = "Próbáld újra!";
                dom.instantFeedback.style.color = "var(--danger)";
            }
        }

        dom.instantInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                dom.instantCheck.click();
            }
        });

        dom.difficultyBtns.forEach(btn => btn.addEventListener('click', () => {
            const nextDifficulty = btn.dataset.difficulty;
            if (!nextDifficulty) return;
            currentDifficulty = nextDifficulty;
            dom.difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (activeTab === 'teszt') {
                startTest();
            }
        }));
        function startTest() {
            isTestActive = true;
            questions = [...questionBanks[currentDifficulty]].map(q => ({ ...q, userAnswer: null }));
            currentQuestionIndex = 0;
            if (dom.startTestBtn) {
                dom.startTestBtn.hidden = true;
                dom.startTestBtn.style.display = 'none';
            }
            dom.testArea.classList.remove('is-hidden');
            renderPagination();
            renderQuestion();
        }
        if (dom.startTestBtn) {
            dom.startTestBtn.addEventListener('click', () => {
                startTest();
            });
        }
        dom.prevBtn.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestion();
                renderPagination();
            }
        });
        dom.nextBtn.addEventListener('click', () => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                renderQuestion();
                renderPagination();
            }
        });

        function renderPagination() {
            dom.dotsContainer.innerHTML = '';
            questions.forEach((q, index) => {
                const dot = document.createElement('div');
                dot.className = 'dot';
                if (index === currentQuestionIndex) dot.classList.add('current');
                if (q.userAnswer !== null) dot.classList.add('answered');
                dot.addEventListener('click', () => {
                    currentQuestionIndex = index;
                    renderQuestion();
                    renderPagination();
                });
                dom.dotsContainer.appendChild(dot);
            });
        }

        function renderQuestion() {
            const q = questions[currentQuestionIndex];
            dom.questionText.innerHTML = `<p>${q.q}</p>`;
            dom.answerArea.innerHTML = '';
            if (q.type === 'mc') {
                const optionsHTML = q.o
                    .map(
                        (option, index) =>
                            `<input type="radio" name="answer" id="opt${index}" value="${index}" ${q.userAnswer === index ? 'checked' : ''} onchange="saveAnswer()"><label for="opt${index}">${option}</label>`
                    )
                    .join('');
                dom.answerArea.innerHTML = `<div class="options">${optionsHTML}</div>`;
            } else if (q.type === 'input') {
                dom.answerArea.innerHTML = `<input type="text" class="options-input module-input" placeholder="pl: 1,2,3" value="${q.userAnswer || ''}" oninput="saveAnswer()">`;
            }
            dom.prevBtn.disabled = currentQuestionIndex === 0;
            dom.nextBtn.disabled = currentQuestionIndex === questions.length - 1;
            renderMathInElement(dom.questionBox, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ]
            });
        }

        function saveAnswer() {
            const q = questions[currentQuestionIndex];
            if (q.type === 'mc') {
                const selected = document.querySelector('input[name="answer"]:checked');
                if (selected) q.userAnswer = parseInt(selected.value);
            } else if (q.type === 'input') {
                q.userAnswer = document.querySelector('.options-input').value;
            }
            renderPagination();
        }

        dom.finishTestBtn.addEventListener('click', () => {
            finishTest();
        });

        function finishTest() {
            let correct = 0;
            questions.forEach(q => {
                if (q.type === 'mc' && q.userAnswer === q.a) correct++;
                else if (q.type === 'input') {
                    if (setsEqual(q.a, q.userAnswer || '')) correct++;
                }
            });
            const percentage = (correct / questions.length) * 100;
            let grade = 0;
            let feedback = '';
            if (percentage < 40) {
                grade = 1;
                feedback = 'Elégtelen (1)';
            } else if (percentage < 55) {
                grade = 2;
                feedback = 'Elégséges (2)';
            } else if (percentage < 70) {
                grade = 3;
                feedback = 'Közepes (3)';
            } else if (percentage < 85) {
                grade = 4;
                feedback = 'Jó (4)';
            } else {
                grade = 5;
                feedback = 'Jeles (5)';
            }
            showResultPopup(`Sikeres teszt! <span>Eredmény: ${percentage.toFixed(0)}% - ${feedback}</span>`);
            const resultObject = {
                topicId: TOPIC_ID,
                topicName: 'Halmazműveletek',
                difficulty: currentDifficulty,
                grade: grade,
                percentage: percentage.toFixed(0),
                timestamp: new Date().toISOString(),
                questions: questions.map(q => ({
                    question: q.q,
                    options: q.o,
                    correctAnswer: q.a,
                    userAnswer: q.userAnswer
                }))
            };
            window.parent.postMessage({ type: 'testResult', result: resultObject }, '*');
            isTestActive = false;
            dom.testArea.classList.add('is-hidden');
            if (dom.startTestBtn) {
                dom.startTestBtn.hidden = false;
                dom.startTestBtn.style.display = 'inline-block';
                dom.startTestBtn.innerHTML = '&Uacute;j teszt';
            }
        }

        function showResultPopup(message) {
            dom.resultPopup.innerHTML = message;
            dom.resultPopup.classList.add('show');
            setTimeout(() => {
                dom.resultPopup.classList.remove('show');
            }, 4000);
        }

        // ----------------- Practice Functionality -----------------------
        // XP rewards by difficulty for practice questions
        const practiceXpRewards = { 'könnyű': 1, 'normál': 2, 'nehéz': 3 };
        let practiceActive = false;
        let currentPracticeAnswer = '';
        let currentPracticeDifficulty = '';
        let currentPracticeKind = '';
        const PRACTICE_HISTORY_LIMIT = 6;
        const PRACTICE_RETRY_LIMIT = 12;
        const practiceHistory = [];
        let practiceTimeout;
        function makePracticeSignature(difficulty, item) {
            return [difficulty, item.kind || '', item.question || '', item.answer || ''].join('|');
        }
        function pushPracticeHistory(entry) {
            practiceHistory.push(entry);
            if (practiceHistory.length > PRACTICE_HISTORY_LIMIT) {
                practiceHistory.shift();
            }
        }
        function getSelectedPracticeDifficulties() {
            return Array.from(document.querySelectorAll('.practice-difficulty:checked')).map(cb => cb.value);
        }
        dom.startPracticeBtn.addEventListener('click', () => {
            const selected = getSelectedPracticeDifficulties();
            if (selected.length === 0) {
                alert('Válassz legalább egy nehézségi szintet.');
                return;
            }
            practiceActive = true;
            practiceHistory.length = 0;
            currentPracticeKind = '';
            dom.practiceArea.style.display = 'block';
            nextPracticeQuestion();
        });
        dom.practiceCheck.addEventListener('click', () => {
            const userAnswer = dom.practiceInput.value;
            if (setsEqual(currentPracticeAnswer, userAnswer)) {
                // Determine XP reward based on current practice difficulty
                const xpReward = practiceXpRewards[currentPracticeDifficulty] || 1;
                dom.practiceFeedback.textContent = `Helyes! (+${xpReward} XP)`;
                dom.practiceFeedback.style.color = 'var(--success)';
                window.parent.postMessage({ type: 'practiceXp', xp: xpReward, topicId: TOPIC_ID }, '*');
                clearTimeout(practiceTimeout);
                practiceTimeout = setTimeout(() => {
                    nextPracticeQuestion();
                }, 2000);
            } else {
                dom.practiceFeedback.textContent = 'Próbáld újra!';
                dom.practiceFeedback.style.color = 'var(--danger)';
            }
        });
        // Allow submitting the practice answer by pressing Enter
        dom.practiceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                dom.practiceCheck.click();
            }
        });
        function nextPracticeQuestion() {
            const selectedDiffs = getSelectedPracticeDifficulties();
            const diff = selectedDiffs[Math.floor(Math.random() * selectedDiffs.length)];
            // Save difficulty so XP reward can be determined later
            currentPracticeDifficulty = diff;
            window.currentPracticeDifficulty = diff;
            const lastKind = practiceHistory.length ? practiceHistory[practiceHistory.length - 1].kind : '';
            let attempts = 0;
            let practiceItem = null;
            let signature = '';
            while (attempts < PRACTICE_RETRY_LIMIT) {
                practiceItem = generatePracticeQuestion(diff, lastKind);
                signature = makePracticeSignature(diff, practiceItem);
                if (!practiceHistory.some(entry => entry.signature === signature)) {
                    break;
                }
                attempts += 1;
            }
            if (!practiceItem) {
                practiceItem = generatePracticeQuestion(diff, lastKind);
                signature = makePracticeSignature(diff, practiceItem);
            }
            currentPracticeAnswer = practiceItem.answer;
            currentPracticeKind = practiceItem.kind || '';
            window.currentPracticeAnswer = currentPracticeAnswer;
            window.currentPracticeKind = currentPracticeKind;
            pushPracticeHistory({ signature, kind: currentPracticeKind });
            dom.practiceQuestion.innerHTML = `<p>${practiceItem.question}</p>`;
            dom.practiceHint.innerHTML = practiceItem.hint;
            dom.practiceInput.value = '';
            dom.practiceFeedback.textContent = '';
            renderMathInElement(dom.practiceQuestion, { delimiters: [ {left: '$', right: '$', display: false} ] });
            renderMathInElement(dom.practiceHint, { delimiters: [ {left: '$', right: '$', display: false} ] });
        }
        function generatePracticeQuestion(diff, avoidOp = '') {
            // Vary the universal set size, set sizes and available operations by difficulty
            let U;
            let minSize;
            let maxSize;
            let ops;
            if (diff === 'könnyű') {
                U = Array.from({ length: 6 }, (_, i) => i + 1);
                minSize = 2;
                maxSize = 3;
                ops = ['union', 'intersection'];
            } else if (diff === 'normál') {
                U = Array.from({ length: 8 }, (_, i) => i + 1);
                minSize = 3;
                maxSize = 4;
                ops = ['union', 'intersection', 'diff_ab', 'diff_ba'];
            } else {
                U = Array.from({ length: 10 }, (_, i) => i + 1);
                minSize = 4;
                maxSize = 5;
                ops = ['union', 'intersection', 'diff_ab', 'diff_ba', 'comp_a', 'symdiff'];
            }
            function getRandomSet() {
                const size = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
                const shuffled = [...U].sort(() => Math.random() - 0.5);
                const set = shuffled.slice(0, size);
                return [...new Set(set)].sort((a, b) => a - b);
            }
            let A = getRandomSet();
            let B = getRandomSet();
            const availableOps = (avoidOp && ops.length > 1)
                ? ops.filter(item => item !== avoidOp)
                : ops;
            let op = availableOps[Math.floor(Math.random() * availableOps.length)];
            let question = '';
            let answer = '';
            let hint = '';
            const formatSet = (set) => `\\\\{${set.join(', ')}\\\\}`;
            const joinSet = (set) => set.join(',');
            if (op === 'union') {
                const unionSet = Array.from(new Set([...A, ...B])).sort((a, b) => a - b);
                answer = joinSet(unionSet);
                question = `$A = ${formatSet(A)}, B = ${formatSet(B)}$. Mi az $A \\cup B$? Írd be az elemeket vesszővel!`;
                // Wrap the union operator in a math environment so KaTeX can render it properly
                hint = '<p><b>Unió ($A \\cup B$):</b> Azok az elemek, amelyek legalább az egyik halmazban benne vannak.</p>';
            } else if (op === 'intersection') {
                const inter = A.filter(x => B.includes(x));
                answer = joinSet(inter);
                question = `$A = ${formatSet(A)}, B = ${formatSet(B)}$. Mi az $A \\cap B$? Írd be az elemeket vesszővel!`;
                // Wrap the intersection operator in a math environment so KaTeX can render it properly
                hint = '<p><b>Metszet ($A \\cap B$):</b> Azok az elemek, amelyek mindkét halmazban benne vannak.</p>';
            } else if (op === 'diff_ab') {
                const diffSet = A.filter(x => !B.includes(x));
                answer = joinSet(diffSet);
                question = `$A = ${formatSet(A)}, B = ${formatSet(B)}$. Mi az $A \\setminus B$? Írd be az elemeket vesszővel!`;
                // Wrap the difference operator in a math environment so KaTeX can render it properly
                hint = '<p><b>Különbség ($A \\setminus B$):</b> Azok az elemek, amelyek A-ban vannak, de B-ben nem.</p>';
            } else if (op === 'diff_ba') {
                const diffSet = B.filter(x => !A.includes(x));
                answer = joinSet(diffSet);
                question = `$A = ${formatSet(A)}, B = ${formatSet(B)}$. Mi az $B \\setminus A$? Írd be az elemeket vesszővel!`;
                // Wrap the difference operator in a math environment so KaTeX can render it properly
                hint = '<p><b>Különbség ($B \\setminus A$):</b> Azok az elemek, amelyek B-ben vannak, de A-ban nem.</p>';
            } else if (op === 'comp_a') {
                const compSet = U.filter(x => !A.includes(x));
                answer = joinSet(compSet);
                question = `$U = \{${U.join(', ')}\}, A = ${formatSet(A)}$. Mi az $\\bar{A}$? Írd be az elemeket vesszővel!`;
                // Wrap the complement operator in a math environment so KaTeX can render it properly
                hint = '<p><b>Komplementer ($\\bar{A}$):</b> Azok az elemek, amelyek az alaphalmazban benne vannak, de az A-ban nem.</p>';
            } else {
                // symdiff
                const diff1 = A.filter(x => !B.includes(x));
                const diff2 = B.filter(x => !A.includes(x));
                const sym = [...diff1, ...diff2].sort((a, b) => a - b);
                answer = joinSet(sym);
                question = `$A = ${formatSet(A)}, B = ${formatSet(B)}$. Mi az $(A \\triangle B)$ (szimmetrikus differencia)? Írd be az elemeket vesszővel!`;
                // Wrap the symmetric difference operator in a math environment so KaTeX can render it properly
                hint = '<p><b>Szimmetrikus differencia ($A \\triangle B$):</b> Azok az elemek, amelyek pontosan az egyik halmazban vannak, de nem mindkettőben.</p>';
            }
            return { question, answer, hint, kind: op };
        }
        // ------------------ End Practice ---------------------------
        openTab('miert');
        // Request settings from main window on load
        window.parent.postMessage({ type: 'request-settings' }, '*');
        // Apply settings from main window
        window.addEventListener('message', (event) => {
            if (event.data.type === 'apply-settings') {
                document.body.style.backgroundColor = 'transparent';
                document.body.style.backgroundImage = 'none';
            }
        });
