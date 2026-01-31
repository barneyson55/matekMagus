        const dom = {
            tabs: document.querySelectorAll('.tab-button'),
            panels: {
                active: document.getElementById('tab-active'),
                results: document.getElementById('tab-results'),
            },
            activeList: document.getElementById('active-quest-list'),
            activeEmpty: document.getElementById('active-empty'),
            completedList: document.getElementById('completed-quest-list'),
            completedEmpty: document.getElementById('completed-empty'),
            resultsList: document.getElementById('recent-results-list'),
            resultsEmpty: document.getElementById('results-empty'),
            trendLastAvg: document.getElementById('trend-last-avg'),
            trendLastCount: document.getElementById('trend-last-count'),
            trendPrevAvg: document.getElementById('trend-prev-avg'),
            trendPrevCount: document.getElementById('trend-prev-count'),
            trendDelta: document.getElementById('trend-delta'),
            trendDirection: document.getElementById('trend-direction'),
            trendGrid: document.getElementById('trend-grid'),
            trendNote: document.getElementById('trend-note'),
            trendEmpty: document.getElementById('trend-empty'),
            topicInsightsList: document.getElementById('topic-insights-list'),
            topicInsightsEmpty: document.getElementById('topic-insights-empty'),
            profileLevel: document.getElementById('profile-level'),
            profileXp: document.getElementById('profile-xp'),
            profileNext: document.getElementById('profile-next'),
            xpText: document.getElementById('xp-progress-text'),
            xpPercent: document.getElementById('xp-percent-text'),
            xpBarFill: document.getElementById('xp-bar-fill'),
            statActive: document.getElementById('stat-active'),
            statCompleted: document.getElementById('stat-completed'),
            statTests: document.getElementById('stat-tests'),
            statPracticeXp: document.getElementById('stat-practice-xp'),
            achievementList: document.getElementById('achievement-list'),
            achievementEmpty: document.getElementById('achievement-empty'),
        };

        let summaryData = null;
        let resultsData = [];
        const topicLabelCache = {};
        const ACHIEVEMENT_FALLBACK = [
            {
                id: 'first_test',
                title: 'Els\u0151 teszteredm\u00e9ny',
                description: 'Els\u0151 sikeres teszt (jegy \u2265 2).',
                xpReward: 0,
                category: 'performance'
            },
            {
                id: 'hard_first',
                title: 'Neh\u00e9z harcos',
                description: 'Els\u0151 neh\u00e9z teszt sikeresen teljes\u00edtve.',
                xpReward: 50,
                category: 'difficulty'
            },
            {
                id: 'hard_perfect',
                title: 'T\u00f6k\u00e9letes vizsga',
                description: '5-\u00f6s jegy neh\u00e9z teszten.',
                xpReward: 75,
                category: 'performance'
            },
            {
                id: 'streak_5',
                title: 'Sorozatgy\u0151ztes',
                description: '5 egym\u00e1s ut\u00e1ni j\u00f3 eredm\u00e9ny.',
                xpReward: 50,
                category: 'performance'
            },
            {
                id: 'subtopic_master',
                title: 'Alt\u00e9ma z\u00e1r\u00f3',
                description: 'Egy alt\u00e9ma kimaxol\u00e1sa.',
                xpReward: 80,
                category: 'structure'
            },
            {
                id: 'main_topic_master',
                title: 'F\u0151t\u00e9ma mester',
                description: 'Egy f\u0151t\u00e9ma kimaxol\u00e1sa.',
                xpReward: 120,
                category: 'structure'
            },
            {
                id: 'emelt_bajnok',
                title: 'Emelt bajnok',
                description: 'Emelt modulz\u00e1r\u00f3 sikeres teljes\u00edt\u00e9se.',
                xpReward: 150,
                category: 'difficulty'
            },
            {
                id: 'xp_collector_1000',
                title: 'XP gy\u0171jt\u0151',
                description: '\u00d6sszegy\u0171jt\u00f6tt\u00e9l 1000 XP-t.',
                xpReward: 100,
                category: 'special'
            },
            {
                id: 'level_up',
                title: 'Szintl\u00e9p\u0151',
                description: 'El\u00e9rt\u00e9l egy \u00faj szintet.',
                xpReward: 0,
                category: 'special'
            }
        ];
        const LOCALE = 'hu-HU';
        const numberFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
        const TREND_WINDOW = 5;
        const TOPIC_INSIGHT_LIMIT = 5;
        const TREND_THRESHOLD = 2;
        const FALLBACK_TOPIC_LABEL = 'Ismeretlen témakör';
        const CATEGORY_LABELS = {
            performance: 'Teljes\u00edtm\u00e9ny',
            difficulty: 'Neh\u00e9zs\u00e9gi szint',
            structure: 'Strukt\u00fara',
            special: 'Speci\u00e1lis'
        };
        const CATEGORY_BADGES = {
            performance: 'T',
            difficulty: 'N',
            structure: 'ST',
            special: 'SP'
        };

        function formatNumber(value, fallback = '-') {
            if (value === null || value === undefined || value === '') return fallback;
            const num = Number(value);
            return Number.isFinite(num) ? numberFormatter.format(num) : fallback;
        }

        function formatDate(value) {
            const date = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(date.getTime())) return '';
            return date.toLocaleDateString(LOCALE);
        }

        function formatPercent(value, fallback = '-') {
            if (!Number.isFinite(value)) return fallback;
            return `${formatNumber(value, fallback)}%`;
        }

        function formatSigned(value, fallback = '-') {
            if (!Number.isFinite(value)) return fallback;
            const sign = value > 0 ? '+' : value < 0 ? '' : '';
            return `${sign}${formatNumber(value, fallback)}`;
        }

        function toTimestamp(value) {
            const time = new Date(value).getTime();
            return Number.isFinite(time) ? time : null;
        }

        function getResultScore(result) {
            const percent = Number(result && result.percentage);
            if (Number.isFinite(percent)) return percent;
            const grade = Number(result && result.grade);
            if (Number.isFinite(grade)) return grade * 20;
            return null;
        }

        function getResultGrade(result) {
            const grade = Number(result && result.grade);
            return Number.isFinite(grade) ? grade : null;
        }

        function getSortedResults(results) {
            if (!Array.isArray(results)) return [];
            const mapped = results
                .map((result) => ({ result, ts: toTimestamp(result && result.timestamp) }))
                .filter((entry) => entry.ts !== null);
            mapped.sort((a, b) => b.ts - a.ts);
            return mapped.map((entry) => entry.result);
        }

        function average(values) {
            if (!values.length) return null;
            const total = values.reduce((sum, value) => sum + value, 0);
            return total / values.length;
        }

        function parseHexColor(hex) {
            const match = (hex || '').trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
            if (!match) return null;
            const raw = match[1];
            const full = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw;
            return {
                r: parseInt(full.slice(0, 2), 16),
                g: parseInt(full.slice(2, 4), 16),
                b: parseInt(full.slice(4, 6), 16),
            };
        }

        function isDarkColor(hex) {
            const rgb = parseHexColor(hex);
            if (!rgb) return false;
            const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
            return luminance < 0.5;
        }

        function normalizeOverlayColor(value) {
            const minAlpha = 0.35;
            const fallback = `rgba(15, 18, 22, ${minAlpha})`;
            if (!value || typeof value !== 'string') return fallback;
            const trimmed = value.trim();
            const rgbaMatch = trimmed.match(/^rgba?\\(([^)]+)\\)$/i);
            if (rgbaMatch) {
                const parts = rgbaMatch[1].split(',').map(part => part.trim());
                const r = Number(parts[0]);
                const g = Number(parts[1]);
                const b = Number(parts[2]);
                if ([r, g, b].some(Number.isNaN)) return fallback;
                const alpha = parts.length > 3 ? Number(parts[3]) : minAlpha;
                const safeAlpha = Math.min(0.9, Math.max(minAlpha, Number.isNaN(alpha) ? minAlpha : alpha));
                return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
            }
            const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
            if (hexMatch) {
                const rgb = parseHexColor(trimmed);
                if (!rgb) return fallback;
                return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${minAlpha})`;
            }
            return fallback;
        }

        function applySettings(settings) {
            if (!settings) return;
            const contentBg = settings.contentBg || '#f5f7fb';
            const isDark = isDarkColor(contentBg);
            const rawOpacity = Number(settings.moduleCardOpacity);
            const panelAlpha = Number.isFinite(rawOpacity) ? Math.min(1, Math.max(0.5, rawOpacity)) : 0.92;
            const panelStrongAlpha = Math.min(1, panelAlpha + 0.08);
            const panelRgb = isDark ? '20, 24, 30' : '255, 255, 255';
            document.documentElement.style.setProperty('--accent', settings.buttonBg || '#5865f2');
            document.documentElement.style.setProperty('--overlay', normalizeOverlayColor(settings.contentOverlay));
            document.documentElement.style.setProperty('--panel', `rgba(${panelRgb}, ${panelAlpha})`);
            document.documentElement.style.setProperty('--panel-strong', `rgba(${panelRgb}, ${panelStrongAlpha})`);
            document.documentElement.style.setProperty('--text', isDark ? '#f3f4f6' : '#1f2933');
            document.documentElement.style.setProperty('--muted', isDark ? '#cbd5f5' : '#6b7280');
            document.documentElement.style.setProperty('--border', isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.1)');
            if (settings.avatarImage) {
                document.documentElement.style.setProperty('--avatar-image', settings.avatarImage);
            } else {
                document.documentElement.style.removeProperty('--avatar-image');
            }
            document.body.style.backgroundColor = 'transparent';
            document.body.style.backgroundImage = 'none';
        }

        function getTopicLabel(topicId) {
            if (!topicId) return '';
            if (topicLabelCache[topicId]) return topicLabelCache[topicId];
            try {
                const link = window.parent && window.parent.document
                    ? window.parent.document.querySelector(`[data-topic-id="${topicId}"]`)
                    : null;
                if (link) {
                    const textNode = Array.from(link.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
                    const label = textNode ? textNode.nodeValue.trim() : link.textContent.trim();
                    const cleanLabel = label.replace(/\u00ad/g, '').trim();
                    topicLabelCache[topicId] = cleanLabel;
                    return cleanLabel;
                }
            } catch (error) {
                // ignore cross-context access issues
            }
            topicLabelCache[topicId] = FALLBACK_TOPIC_LABEL;
            return FALLBACK_TOPIC_LABEL;
        }

        function resolveTopicName(result) {
            if (result && result.topicNameHu) return result.topicNameHu;
            if (result && result.topicName) return result.topicName;
            return getTopicLabel(result && result.topicId);
        }

        function navigateToTopic(topicId) {
            if (!topicId) return;
            try {
                const link = window.parent && window.parent.document
                    ? window.parent.document.querySelector(`[data-topic-id="${topicId}"]`)
                    : null;
                if (link) {
                    link.click();
                }
            } catch (error) {
                // ignore navigation failures
            }
        }

        function setListButtonAction(button, topicId) {
            if (topicId) {
                button.addEventListener('click', () => navigateToTopic(topicId));
                return;
            }
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
        }

        function getQuestEntries() {
            const quests = summaryData && summaryData.quests ? summaryData.quests : {};
            const entries = [];
            const mainTopics = quests.mainTopics && typeof quests.mainTopics === 'object' ? quests.mainTopics : {};
            const subtopics = quests.subtopics && typeof quests.subtopics === 'object' ? quests.subtopics : {};
            const topics = quests.topics && typeof quests.topics === 'object' ? quests.topics : {};
            Object.entries(mainTopics).forEach(([topicId, status]) => {
                entries.push({ topicId, status, scope: 'main' });
            });
            Object.entries(subtopics).forEach(([topicId, status]) => {
                entries.push({ topicId, status, scope: 'sub' });
            });
            Object.entries(topics).forEach(([topicId, status]) => {
                entries.push({ topicId, status, scope: 'topic' });
            });
            return entries;
        }

        function getQuestEntriesByStatus(status) {
            return getQuestEntries().filter(entry => entry.status === status);
        }

        function getScopeLabel(scope) {
            if (scope === 'main') return 'Főtéma';
            if (scope === 'sub') return 'Altéma';
            return 'Témakör';
        }

        function getBestGrade(topicData) {
            let best = null;
            Object.values(topicData || {}).forEach((value) => {
                const grade = typeof value === 'number' ? value : value && typeof value.grade === 'number' ? value.grade : null;
                if (grade === null) return;
                if (best === null || grade > best) best = grade;
            });
            return best;
        }

        function renderList(listEl, emptyEl, items, builder) {
            listEl.innerHTML = '';
            if (!items.length) {
                listEl.style.display = 'none';
                emptyEl.style.display = 'grid';
                return;
            }
            emptyEl.style.display = 'none';
            listEl.style.display = 'grid';
            items.forEach(item => {
                listEl.appendChild(builder(item));
            });
        }

        function renderActiveQuests() {
            const activeEntries = getQuestEntriesByStatus('ACTIVE');
            renderList(dom.activeList, dom.activeEmpty, activeEntries, (entry) => {
                const li = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'list-item';
                const scopeLabel = getScopeLabel(entry.scope);
                const metaText = `Aktív küldetés · ${scopeLabel}`;
                button.innerHTML = `<div class="item-details"><span class="item-title">${getTopicLabel(entry.topicId)}</span><span class="item-meta">${metaText}</span></div>`;
                setListButtonAction(button, entry.topicId);
                li.appendChild(button);
                return li;
            });
        }

        function renderCompletedQuests() {
            const completedEntries = getQuestEntriesByStatus('COMPLETED');
            renderList(dom.completedList, dom.completedEmpty, completedEntries, (entry) => {
                const li = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'list-item';
                const bestGrade = getBestGrade(summaryData && summaryData.completions ? summaryData.completions[entry.topicId] : null);
                const scopeLabel = getScopeLabel(entry.scope);
                const hasBestGrade = bestGrade !== null && bestGrade !== undefined;
                const statusLabel = 'Kimaxolt küldetés';
                const metaParts = [statusLabel];
                if (hasBestGrade) {
                    metaParts.push(`Legjobb jegy: ${formatNumber(bestGrade, '-')}`);
                }
                metaParts.push(scopeLabel);
                const metaText = metaParts.join(' · ');
                button.innerHTML = `<div class="item-details"><span class="item-title">${getTopicLabel(entry.topicId)}</span><span class="item-meta">${metaText}</span></div>`;
                setListButtonAction(button, entry.topicId);
                li.appendChild(button);
                return li;
            });
        }

        function renderRecentResults() {
            const recent = getSortedResults(resultsData).slice(0, 5);
            renderList(dom.resultsList, dom.resultsEmpty, recent, (result) => {
                const li = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'list-item';
                const gradeValue = result && result.grade !== null && result.grade !== undefined && result.grade !== ''
                    ? Number(result.grade)
                    : Number.NaN;
                const gradeText = Number.isFinite(gradeValue) ? formatNumber(gradeValue, '-') : '-';
                button.innerHTML = `<div class="item-details"><span class="item-title">${getTopicLabel(result.topicId || '')}</span><span class="item-meta">Jegy: ${gradeText}</span></div>`;
                setListButtonAction(button, result.topicId);
                li.appendChild(button);
                return li;
            });
        }

        function renderStats(sortedResults) {
            const entries = getQuestEntries();
            const activeCount = entries.filter(entry => entry.status === 'ACTIVE').length;
            const completedCount = entries.filter(entry => entry.status === 'COMPLETED').length;
            const testsCount = sortedResults ? sortedResults.length : 0;
            const practiceXp = summaryData && summaryData.practiceXp
                ? Object.values(summaryData.practiceXp).reduce((sum, value) => sum + Number(value || 0), 0)
                : 0;
            dom.statActive.textContent = formatNumber(activeCount, '0');
            dom.statCompleted.textContent = formatNumber(completedCount, '0');
            dom.statTests.textContent = formatNumber(testsCount, '0');
            dom.statPracticeXp.textContent = formatNumber(practiceXp, '0');
        }

        function renderAchievements() {
            const catalog = Array.isArray(summaryData && summaryData.achievementCatalog)
                ? summaryData.achievementCatalog
                : ACHIEVEMENT_FALLBACK;
            const states = summaryData && summaryData.achievements ? summaryData.achievements : {};
            dom.achievementList.innerHTML = '';
            if (!catalog.length) {
                dom.achievementEmpty.style.display = 'grid';
                dom.achievementList.style.display = 'none';
                return;
            }
            const unlockedAchievements = catalog
                .map((achievement) => {
                    const state = states[achievement.id] || {};
                    const isUnlocked = Boolean(state.isUnlocked || state.unlockedAt);
                    return isUnlocked ? { achievement, state } : null;
                })
                .filter(Boolean);
            if (!unlockedAchievements.length) {
                dom.achievementEmpty.style.display = 'grid';
                dom.achievementList.style.display = 'none';
                return;
            }
            dom.achievementEmpty.style.display = 'none';
            dom.achievementList.style.display = 'grid';
            unlockedAchievements.forEach(({ achievement, state }) => {
                const card = document.createElement('div');
                card.className = 'achievement-item is-unlocked';
                card.dataset.achievementId = achievement.id;
                const titleText = achievement.title || achievement.nameHu || 'Ismeretlen achievement';
                const description = achievement.description || '';
                const category = achievement.category || 'special';
                const categoryLabel = CATEGORY_LABELS[category] || 'Speci\u00e1lis';
                const badgeText = CATEGORY_BADGES[category] || 'SP';
                const rewardValue = Number(Number.isFinite(state.grantedXp)
                    ? state.grantedXp
                    : (achievement.xpReward || 0));
                const rewardText = rewardValue > 0
                    ? `+${formatNumber(rewardValue, '0')} XP`
                    : 'Jelv\u00e9ny';
                let metaText = 'Megszerezve';
                if (state.unlockedAt) {
                    const dateLabel = formatDate(state.unlockedAt);
                    if (dateLabel) {
                        metaText = `Megszerezve: ${dateLabel}`;
                    }
                }
                card.innerHTML = `
                    <div class="achievement-badge" aria-hidden="true">${badgeText}</div>
                    <div class="achievement-details">
                        <div class="achievement-title-row">
                            <h4>${titleText}</h4>
                            <span class="achievement-tag">${categoryLabel}</span>
                        </div>
                        <p>${description}</p>
                        <div class="achievement-footer">
                            <span class="achievement-meta">${metaText}</span>
                            <span class="achievement-reward">Jutalom: ${rewardText}</span>
                        </div>
                    </div>`;
                dom.achievementList.appendChild(card);
            });
        }

        function renderProfile() {
            if (!summaryData || !summaryData.level) return;
            const level = summaryData.level.level || 1;
            const levelName = summaryData.level.levelName || "";
            const xpTotal = summaryData.xp || 0;
            const xpForNext = Number.isFinite(summaryData.level.xpForNext) ? summaryData.level.xpForNext : 0;
            const xpInto = Number.isFinite(summaryData.level.xpIntoLevel) ? summaryData.level.xpIntoLevel : 0;
            const xpToNext = Number.isFinite(summaryData.level.xpToNext)
                ? summaryData.level.xpToNext
                : Math.max(0, xpForNext - xpInto);
            const isMaxLevel = xpForNext <= 0;
            const safeRequired = isMaxLevel ? Math.max(1, xpInto) : xpForNext;
            const percent = Math.min(100, Math.round((xpInto / safeRequired) * 100));
            const levelText = formatNumber(level, '1');
            dom.profileLevel.textContent = levelName ? `Lv. ${levelText} - ${levelName}` : `Lv. ${levelText}`;
            dom.profileXp.textContent = `\u00d6sszes XP: ${formatNumber(xpTotal, '0')}`;
            dom.profileNext.textContent = isMaxLevel
                ? "K\u00f6vetkez\u0151 szint: Max"
                : `K\u00f6vetkez\u0151 szint: ${formatNumber(xpToNext, '0')} XP`;
            dom.xpText.textContent = isMaxLevel
                ? `${formatNumber(xpInto, '0')} XP`
                : `${formatNumber(xpInto, '0')} / ${formatNumber(xpForNext, '0')} XP`;
            dom.xpPercent.textContent = `${formatNumber(percent, '0')}%`;
            dom.xpBarFill.style.width = `${percent}%`;
        }

        function buildTrendSummary(sortedResults) {
            const scored = sortedResults
                .map((result) => ({ score: getResultScore(result) }))
                .filter((entry) => Number.isFinite(entry.score));
            const last = scored.slice(0, TREND_WINDOW).map((entry) => entry.score);
            const prev = scored.slice(TREND_WINDOW, TREND_WINDOW * 2).map((entry) => entry.score);
            const lastAvg = average(last);
            const prevAvg = average(prev);
            const delta = Number.isFinite(lastAvg) && Number.isFinite(prevAvg) ? lastAvg - prevAvg : null;
            const direction = delta === null
                ? 'none'
                : delta > TREND_THRESHOLD ? 'up' : delta < -TREND_THRESHOLD ? 'down' : 'flat';
            return {
                total: scored.length,
                lastCount: last.length,
                prevCount: prev.length,
                lastAvg,
                prevAvg,
                delta,
                direction,
            };
        }

        function getDirectionLabel(direction) {
            if (direction === 'up') return { label: 'Emelked\u0151', className: 'trend-pill up' };
            if (direction === 'down') return { label: 'Cs\u00f6kken\u0151', className: 'trend-pill down' };
            if (direction === 'flat') return { label: 'Stabil', className: 'trend-pill flat' };
            return { label: 'Nincs adat', className: 'trend-pill flat' };
        }

        function buildTopicInsights(sortedResults) {
            const grouped = new Map();
            sortedResults.forEach((result) => {
                const topicId = result && result.topicId ? result.topicId : null;
                const key = topicId || (result && result.topicName ? result.topicName : 'ismeretlen');
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        key,
                        topicId,
                        title: resolveTopicName(result),
                        entries: [],
                    });
                }
                const score = getResultScore(result);
                const grade = getResultGrade(result);
                const ts = toTimestamp(result && result.timestamp);
                grouped.get(key).entries.push({ score, grade, ts });
            });

            const insights = [];
            grouped.forEach((group) => {
                const validEntries = group.entries.filter((entry) => Number.isFinite(entry.score) && entry.ts !== null);
                validEntries.sort((a, b) => b.ts - a.ts);
                if (!validEntries.length) return;
                const scores = validEntries.map((entry) => entry.score);
                const avgScore = average(scores);
                const avgGrade = average(validEntries.map((entry) => entry.grade).filter((value) => Number.isFinite(value)));
                const last = validEntries[0];
                const prev = validEntries[1];
                const delta = last && prev ? last.score - prev.score : null;
                let direction = 'flat';
                if (delta === null) {
                    direction = 'none';
                } else if (delta > TREND_THRESHOLD) {
                    direction = 'up';
                } else if (delta < -TREND_THRESHOLD) {
                    direction = 'down';
                }
                insights.push({
                    topicId: group.topicId,
                    title: group.title || group.key,
                    attempts: validEntries.length,
                    avgScore,
                    avgGrade,
                    lastScore: last.score,
                    delta,
                    direction,
                    lastTs: last.ts,
                });
            });
            insights.sort((a, b) => b.lastTs - a.lastTs);
            return insights.slice(0, TOPIC_INSIGHT_LIMIT);
        }

        function renderTrendSummary(sortedResults) {
            const summary = buildTrendSummary(sortedResults);
            if (!summary.total) {
                dom.trendEmpty.style.display = 'grid';
                dom.trendGrid.style.display = 'none';
                dom.trendNote.textContent = '';
                dom.trendNote.style.display = 'none';
                dom.trendLastAvg.textContent = '-';
                dom.trendPrevAvg.textContent = '-';
                dom.trendDelta.textContent = '-';
                dom.trendLastCount.textContent = '0 teszt';
                dom.trendPrevCount.textContent = '0 teszt';
                const label = getDirectionLabel('none');
                dom.trendDirection.textContent = label.label;
                dom.trendDirection.className = label.className;
                return;
            }
            dom.trendEmpty.style.display = 'none';
            dom.trendGrid.style.display = 'grid';
            dom.trendNote.style.display = 'block';
            dom.trendLastAvg.textContent = formatPercent(summary.lastAvg, '-');
            dom.trendPrevAvg.textContent = summary.prevCount ? formatPercent(summary.prevAvg, '-') : '-';
            dom.trendLastCount.textContent = `${summary.lastCount} teszt`;
            dom.trendPrevCount.textContent = `${summary.prevCount} teszt`;
            if (summary.prevCount) {
                dom.trendDelta.textContent = `${formatSigned(summary.delta, '-')}\u0025`;
            } else {
                dom.trendDelta.textContent = '-';
            }
            const label = getDirectionLabel(summary.direction);
            dom.trendDirection.textContent = label.label;
            dom.trendDirection.className = label.className;
            if (summary.prevCount) {
                dom.trendNote.textContent = 'A trend az ut\u00f3bbi \u00e9s az azt megel\u0151z\u0151 5 teszt \u00e1tlag\u00e1t hasonl\u00edtja \u00f6ssze.';
            } else {
                dom.trendNote.textContent = 'T\u00f6lts ki legal\u00e1bb 6 tesztet a r\u00e9szletes trendhez.';
            }
        }

        function renderTopicInsights(sortedResults) {
            const insights = buildTopicInsights(sortedResults);
            dom.topicInsightsList.innerHTML = '';
            if (!insights.length) {
                dom.topicInsightsEmpty.style.display = 'grid';
                dom.topicInsightsList.style.display = 'none';
                return;
            }
            dom.topicInsightsEmpty.style.display = 'none';
            dom.topicInsightsList.style.display = 'grid';
            insights.forEach((insight) => {
                const li = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'list-item';
                const avgText = Number.isFinite(insight.avgScore) ? formatPercent(insight.avgScore, '-') : '-';
                const lastText = Number.isFinite(insight.lastScore) ? formatPercent(insight.lastScore, '-') : '-';
                const attemptsText = `${formatNumber(insight.attempts, '0')} pr\u00f3ba`;
                const gradeText = Number.isFinite(insight.avgGrade)
                    ? `\u00c1tlagjegy: ${formatNumber(insight.avgGrade, '-')}`
                    : 'Nincs \u00e1tlagjegy';
                const deltaText = insight.delta === null ? '-' : `${formatSigned(insight.delta, '-')}\u0025`;
                const directionLabel = getDirectionLabel(insight.direction);
                button.innerHTML = `<div class="item-details"><span class="item-title">${insight.title || 'Ismeretlen'}</span><span class="item-meta">${gradeText} \u00b7 \u00c1tlag: ${avgText} \u00b7 Ut\u00f3bbi: ${lastText} \u00b7 ${attemptsText}</span></div><span class="${directionLabel.className}">${directionLabel.label} ${deltaText}</span>`;
                setListButtonAction(button, insight.topicId);
                li.appendChild(button);
                dom.topicInsightsList.appendChild(li);
            });
        }

        function renderAll() {
            const sortedResults = getSortedResults(resultsData);
            renderProfile();
            renderActiveQuests();
            renderCompletedQuests();
            renderTrendSummary(sortedResults);
            renderTopicInsights(sortedResults);
            renderRecentResults();
            renderStats(sortedResults);
            renderAchievements();
        }

        function setActiveTab(tab) {
            if (!tab) return;
            const target = tab.dataset.tab;
            dom.tabs.forEach((btn) => {
                const isActive = btn === tab;
                btn.classList.toggle('is-active', isActive);
                btn.setAttribute('aria-selected', String(isActive));
                btn.setAttribute('tabindex', isActive ? '0' : '-1');
            });
            Object.entries(dom.panels).forEach(([key, panel]) => {
                const isActive = key === target;
                panel.classList.toggle('is-active', isActive);
                panel.hidden = !isActive;
            });
        }

        function focusTabByOffset(currentTab, offset) {
            const tabs = Array.from(dom.tabs);
            const currentIndex = tabs.indexOf(currentTab);
            if (currentIndex === -1) return;
            const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
            const nextTab = tabs[nextIndex];
            nextTab.focus();
            setActiveTab(nextTab);
        }

        function focusTabEdge(direction) {
            const tabs = Array.from(dom.tabs);
            if (!tabs.length) return;
            const nextTab = direction === 'start' ? tabs[0] : tabs[tabs.length - 1];
            nextTab.focus();
            setActiveTab(nextTab);
        }

        dom.tabs.forEach((tab) => {
            tab.addEventListener('click', () => setActiveTab(tab));
            tab.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    focusTabByOffset(tab, 1);
                } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    focusTabByOffset(tab, -1);
                } else if (event.key === 'Home') {
                    event.preventDefault();
                    focusTabEdge('start');
                } else if (event.key === 'End') {
                    event.preventDefault();
                    focusTabEdge('end');
                }
            });
        });

        setActiveTab(document.querySelector('.tab-button.is-active') || dom.tabs[0]);

        document.addEventListener('DOMContentLoaded', () => {
            window.parent.postMessage({ type: 'request-xp-summary' }, '*');
            window.parent.postMessage({ type: 'get-all-results' }, '*');
            window.parent.postMessage({ type: 'request-settings' }, '*');
        });

        window.addEventListener('message', (event) => {
            if (event.data.type === 'xp-summary') {
                summaryData = event.data.summary;
                renderAll();
            }
            if (event.data.type === 'all-results-response') {
                resultsData = Array.isArray(event.data.results) ? event.data.results : [];
                renderAll();
            }
            if (event.data.type === 'apply-settings') {
                applySettings(event.data.settings);
            }
        });
