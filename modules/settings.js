        function toCamelCase(str) {
            return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        }

        const THEME_TOKENS = {
            pergamen: {
                themeId: 'pergamen',
                sidebarBg: '#2f2a24',
                contentBg: '#f6f1e7',
                buttonBg: '#9b6b3d',
                buttonText: '#ffffff',
                linkColor: '#d9c4a4',
                contentOverlay: 'rgba(248, 242, 228, 0.75)',
                contentBgImage: 'none'
            },
            galaxis: {
                themeId: 'galaxis',
                sidebarBg: '#141525',
                contentBg: '#f5f7fb',
                buttonBg: '#4f46e5',
                buttonText: '#ffffff',
                linkColor: '#9ea7ff',
                contentOverlay: 'rgba(18, 20, 38, 0.7)',
                contentBgImage: 'none'
            },
            futurisztikus: {
                themeId: 'futurisztikus',
                sidebarBg: '#1a1f26',
                contentBg: '#f4f7fb',
                buttonBg: '#19c37d',
                buttonText: '#0b1016',
                linkColor: '#7bdac0',
                contentOverlay: 'rgba(235, 240, 244, 0.75)',
                contentBgImage: 'none'
            },
            dark: {
                themeId: 'dark',
                sidebarBg: '#1e2124',
                contentBg: '#f5f7fb',
                buttonBg: '#5865f2',
                buttonText: '#ffffff',
                linkColor: '#b9bbbe',
                contentOverlay: 'rgba(15, 18, 22, 0.7)',
                contentBgImage: 'none'
            }
        };
        const DEFAULT_THEME_ID = 'dark';
        const BASE_SETTINGS = {
            ...THEME_TOKENS[DEFAULT_THEME_ID],
            themeId: DEFAULT_THEME_ID,
            contentBgImage: 'none'
        };

        let savedSettings = { ...BASE_SETTINGS };
        let draftSettings = { ...BASE_SETTINGS };
        let bgImageData = null;

        // Load settings on page load via parent window
        window.addEventListener('DOMContentLoaded', () => {
            window.parent.postMessage({ type: 'request-settings' }, '*');
        });

        window.addEventListener('message', (event) => {
            if (event.data.type === 'apply-settings' && event.data.settings) {
                savedSettings = normalizeSettings(event.data.settings);
                draftSettings = { ...savedSettings };
                applySettingsToUI(draftSettings);
            }
        });

        // Theme selection
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const themeId = option.dataset.theme;
                if (!themeId) return;
                if (themeId === 'custom') {
                    setThemeSelection('custom');
                    draftSettings = { ...draftSettings, themeId: 'custom' };
                    return;
                }
                applyThemeSelection(themeId);
            });
        });

        // Color pickers
        document.querySelectorAll('input[type="color"], input[type="text"]').forEach(picker => {
            picker.addEventListener('input', (e) => {
                const key = toCamelCase(e.target.id);
                console.log('Color picker changed:', key, e.target.value);
                draftSettings = { ...draftSettings, [key]: e.target.value, themeId: 'custom' };
                setThemeSelection('custom');
            });
        });

        // Background image upload
        document.getElementById('bg-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    bgImageData = event.target.result;
                    document.getElementById('bg-preview').style.backgroundImage = `url(${bgImageData})`;
                    document.getElementById('bg-preview').textContent = '';
                    draftSettings = { ...draftSettings, contentBgImage: `url(${bgImageData})`, themeId: 'custom' };
                    setThemeSelection('custom');
                };
                reader.readAsDataURL(file);
            }
        });

        // Save button
        document.getElementById('save-btn').addEventListener('click', () => {
            console.log('Saving settings:', draftSettings);
            window.parent.postMessage({ type: 'save-settings', settings: draftSettings }, '*');
            savedSettings = { ...draftSettings };
            alert('Beállítások elmentve.');
        });

        // Cancel button
        document.getElementById('cancel-btn').addEventListener('click', () => {
            draftSettings = { ...savedSettings };
            bgImageData = null;
            applySettingsToUI(draftSettings);
            const bgInput = document.getElementById('bg-file');
            if (bgInput) bgInput.value = '';
        });

        function normalizeSettings(settings) {
            if (!settings || typeof settings !== 'object') {
                return { ...BASE_SETTINGS };
            }
            const themeBase = settings.themeId && THEME_TOKENS[settings.themeId]
                ? THEME_TOKENS[settings.themeId]
                : BASE_SETTINGS;
            const merged = { ...themeBase, ...settings };
            if (!merged.contentBgImage) merged.contentBgImage = 'none';
            return merged;
        }

        function applySettingsToUI(settings) {
            document.getElementById('sidebar-bg').value = settings.sidebarBg || '#1e2124';
            document.getElementById('content-bg').value = settings.contentBg || '#ffffff';
            document.getElementById('button-bg').value = settings.buttonBg || '#5865f2';
            document.getElementById('button-text').value = settings.buttonText || '#ffffff';
            document.getElementById('link-color').value = settings.linkColor || '#b9bbbe';
            document.getElementById('content-overlay').value = settings.contentOverlay || 'rgba(255, 255, 255, 0.8)';
            const preview = document.getElementById('bg-preview');
            if (settings.contentBgImage && settings.contentBgImage !== 'none') {
                preview.style.backgroundImage = settings.contentBgImage;
                preview.textContent = '';
            } else {
                preview.style.backgroundImage = 'none';
                preview.textContent = 'Nincs háttérkép kiválasztva.';
            }
            const themeId = settings.themeId && THEME_TOKENS[settings.themeId] ? settings.themeId : 'custom';
            setThemeSelection(themeId);
        }

        function setThemeSelection(themeId) {
            document.querySelectorAll('.theme-option').forEach(opt => {
                const isSelected = opt.dataset.theme === themeId;
                opt.classList.toggle('selected', isSelected);
                opt.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            });
        }

        function applyThemeSelection(themeId) {
            const theme = THEME_TOKENS[themeId];
            if (!theme) return;
            const preservedBg = draftSettings.contentBgImage || 'none';
            draftSettings = { ...draftSettings, ...theme, themeId, contentBgImage: preservedBg };
            applySettingsToUI(draftSettings);
        }
