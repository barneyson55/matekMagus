        const dom = {
            summaryUnlocked: document.getElementById('summary-unlocked'),
            summaryProgress: document.getElementById('summary-progress'),
            summaryProgressText: document.getElementById('summary-progress-text'),
            summaryXp: document.getElementById('summary-xp'),
            summaryNext: document.getElementById('summary-next'),
            summaryNextDesc: document.getElementById('summary-next-desc'),
            unlockedList: document.getElementById('achievement-unlocked'),
            unlockedEmpty: document.getElementById('achievement-unlocked-empty'),
            lockedList: document.getElementById('achievement-locked'),
            lockedEmpty: document.getElementById('achievement-locked-empty'),
        };

        const ACHIEVEMENT_FALLBACK = [
            {
                id: 'first_test',
                title: 'Els\u0151 teszteredm\u00e9ny',
                description: 'Els\u0151 sikeres teszt (jegy \u2265 2).',
                xpReward: 0,
                category: 'performance',
            },
            {
                id: 'hard_first',
                title: 'Neh\u00e9z harcos',
                description: 'Els\u0151 neh\u00e9z teszt sikeresen teljes\u00edtve.',
                xpReward: 50,
                category: 'difficulty',
            },
            {
                id: 'hard_perfect',
                title: 'T\u00f6k\u00e9letes vizsga',
                description: '5-\u00f6s jegy neh\u00e9z teszten.',
                xpReward: 75,
                category: 'performance',
            },
            {
                id: 'streak_5',
                title: 'Sorozatgy\u0151ztes',
                description: '5 egym\u00e1s ut\u00e1ni j\u00f3 eredm\u00e9ny.',
                xpReward: 50,
                category: 'performance',
            },
            {
                id: 'subtopic_master',
                title: 'Alt\u00e9ma z\u00e1r\u00f3',
                description: 'Egy alt\u00e9ma kimaxol\u00e1sa.',
                xpReward: 80,
                category: 'structure',
            },
            {
                id: 'main_topic_master',
                title: 'F\u0151t\u00e9ma mester',
                description: 'Egy f\u0151t\u00e9ma kimaxol\u00e1sa.',
                xpReward: 120,
                category: 'structure',
            },
            {
                id: 'emelt_bajnok',
                title: 'Emelt bajnok',
                description: 'Emelt modulz\u00e1r\u00f3 sikeres teljes\u00edt\u00e9se.',
                xpReward: 150,
                category: 'difficulty',
            },
            {
                id: 'xp_collector_1000',
                title: 'XP gy\u0171jt\u0151',
                description: '\u00d6sszegy\u0171jt\u00f6tt\u00e9l 1000 XP-t.',
                xpReward: 100,
                category: 'special',
            },
            {
                id: 'level_up',
                title: 'Szintl\u00e9p\u0151',
                description: 'El\u00e9rt\u00e9l egy \u00faj szintet.',
                xpReward: 0,
                category: 'special',
            },
        ];

        const CATEGORY_LABELS = {
            performance: 'Teljes\u00edtm\u00e9ny',
            difficulty: 'Neh\u00e9zs\u00e9gi szint',
            structure: 'Strukt\u00fara',
            special: 'Speci\u00e1lis',
        };
        const CATEGORY_BADGES = {
            performance: 'T',
            difficulty: 'N',
            structure: 'ST',
            special: 'SP',
        };

        const LOCALE = 'hu-HU';
        const numberFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

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
            const rgbaMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
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
            document.body.style.backgroundColor = 'transparent';
            document.body.style.backgroundImage = 'none';
        }

        function getCatalog(summary) {
            if (summary && Array.isArray(summary.achievementCatalog)) return summary.achievementCatalog;
            return ACHIEVEMENT_FALLBACK;
        }

        function getStates(summary) {
            return summary && summary.achievements ? summary.achievements : {};
        }

        function buildAchievementCard(achievement, state, isUnlocked) {
            const card = document.createElement('div');
            card.className = `achievement-card ${isUnlocked ? 'is-unlocked' : 'is-locked'}`;
            card.dataset.achievementId = achievement.id;
            const category = achievement.category || 'special';
            const categoryLabel = CATEGORY_LABELS[category] || 'Speci\u00e1lis';
            const badgeText = CATEGORY_BADGES[category] || 'SP';
            const rewardValue = Number(isUnlocked && Number.isFinite(state && state.grantedXp)
                ? state.grantedXp
                : (achievement.xpReward || 0));
            const rewardText = rewardValue > 0
                ? `+${formatNumber(rewardValue, '0')} XP`
                : 'Jelv\u00e9ny';
            let metaText = isUnlocked ? 'Megszerezve' : 'M\u00e9g nem szerzett';
            if (state && state.unlockedAt) {
                const dateLabel = formatDate(state.unlockedAt);
                if (dateLabel) {
                    metaText = `Megszerezve: ${dateLabel}`;
                }
            }
            card.innerHTML = `
                <div class="achievement-badge" aria-hidden="true">${badgeText}</div>
                <div class="achievement-content">
                    <div class="achievement-title-row">
                        <h3 class="achievement-title">${achievement.title || achievement.id}</h3>
                        <span class="achievement-category">${categoryLabel}</span>
                    </div>
                    <p class="achievement-desc">${achievement.description || ''}</p>
                    <span class="achievement-meta">${metaText}</span>
                </div>
                <div class="achievement-reward">
                    <small>Jutalom</small>
                    ${rewardText}
                </div>
            `;
            return card;
        }

        function renderSummary(catalog, states) {
            const unlocked = catalog.filter(item => states[item.id]?.isUnlocked);
            const total = catalog.length;
            const unlockedCount = unlocked.length;
            const percent = total ? Math.round((unlockedCount / total) * 100) : 0;
            if (dom.summaryUnlocked) {
                dom.summaryUnlocked.textContent = `${formatNumber(unlockedCount, '0')} / ${formatNumber(total, '0')}`;
            }
            if (dom.summaryProgress) {
                dom.summaryProgress.style.width = `${percent}%`;
            }
            if (dom.summaryProgressText) {
                dom.summaryProgressText.textContent = `${formatNumber(percent, '0')}%`;
            }
            const bonusXp = unlocked.reduce((sum, item) => {
                const granted = states[item.id] && Number.isFinite(states[item.id].grantedXp)
                    ? states[item.id].grantedXp
                    : item.xpReward;
                return sum + Number(granted || 0);
            }, 0);
            if (dom.summaryXp) {
                dom.summaryXp.textContent = `${formatNumber(bonusXp, '0')} XP`;
            }
            const next = catalog.find(item => !states[item.id]?.isUnlocked);
            if (dom.summaryNext) {
                dom.summaryNext.textContent = next ? (next.title || next.id) : 'Minden achievement megvan';
            }
            if (dom.summaryNextDesc) {
                dom.summaryNextDesc.textContent = next ? (next.description || '') : '';
            }
        }

        function renderAchievementLists(catalog, states) {
            const unlocked = [];
            const locked = [];
            catalog.forEach((achievement) => {
                const state = states[achievement.id] || {};
                const isUnlocked = Boolean(state.isUnlocked);
                const card = buildAchievementCard(achievement, state, isUnlocked);
                if (isUnlocked) {
                    unlocked.push(card);
                } else {
                    locked.push(card);
                }
            });
            if (dom.unlockedList) {
                dom.unlockedList.innerHTML = '';
                if (unlocked.length) {
                    dom.unlockedEmpty.style.display = 'none';
                    unlocked.forEach(card => dom.unlockedList.appendChild(card));
                } else {
                    dom.unlockedEmpty.style.display = 'block';
                }
            }
            if (dom.lockedList) {
                dom.lockedList.innerHTML = '';
                if (locked.length) {
                    dom.lockedEmpty.style.display = 'none';
                    locked.forEach(card => dom.lockedList.appendChild(card));
                } else {
                    dom.lockedEmpty.style.display = 'block';
                }
            }
        }

        function renderAchievements(summary) {
            const catalog = getCatalog(summary);
            const states = getStates(summary);
            renderSummary(catalog, states);
            renderAchievementLists(catalog, states);
        }

        document.addEventListener('DOMContentLoaded', () => {
            window.parent.postMessage({ type: 'request-xp-summary' }, '*');
            window.parent.postMessage({ type: 'request-settings' }, '*');
        });

        window.addEventListener('message', (event) => {
            if (event.data.type === 'xp-summary') {
                renderAchievements(event.data.summary || {});
            }
            if (event.data.type === 'apply-settings') {
                applySettings(event.data.settings);
            }
        });
