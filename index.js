(() => {
    const EXTENSION_ID = 'echoes-of-the-city';
    const ROOT_ID = `${EXTENSION_ID}-root`;
    const BUTTON_ID = `${EXTENSION_ID}-battle-launcher`;
    const BUTTON_MARGIN = 0;
    const PANEL_MARGIN = 8;
    const PANEL_GAP = 24;
    const DRAG_THRESHOLD = 6;
    const PANEL_ASPECT_RATIO = 1640 / 4120;
    const BATTLE_SCRIPT_RELATIVE_PATHS = [
        'battle/data/debugFightData.js',
        'battle/logic/debugBattleEngine.js',
        'battle/render/debugBattleRenderer.js',
        'battle/debugBattle.js',
    ];
    const ASSET_RELATIVE_PATHS = {
        hover: 'audio/battlewindow/hovermechanical.wav',
        click: 'audio/battlewindow/buttonclick.wav',
        theme: 'audio/battlewindow/maintheme.wav',
        heavyPanel: 'audio/battlewindow/heavypanel.wav',
    };

    const state = {
        isOpen: false,
        activeScreen: 'main-menu',
        combatController: null,
        battleModulePromise: null,
        audioEnabled: false,
        audioUnlocked: false,
        audioUnlockPromise: null,
        draggingPointerId: null,
        isDragging: false,
        suppressClick: false,
        dragStartPointer: { x: 0, y: 0 },
        dragStartButton: { x: 0, y: 0 },
        buttonPosition: { x: 0, y: 0 },
        extensionBaseUrl: null,
    };

    const elements = {
        root: null,
        button: null,
        panel: null,
        backdrop: null,
        closeButton: null,
        fullscreenButton: null,
        screen: null,
        mainMenu: null,
        characterSelect: null,
        combatScreen: null,
        combatContent: null,
        combatTrayButton: null,
        characterTrayButton: null,
    };

    const hoverAudio = new Audio();
    const clickAudio = new Audio();
    const themeAudio = new Audio();
    const heavyPanelAudio = new Audio();
    const audioContext = typeof window.AudioContext === 'function'
        ? new window.AudioContext()
        : typeof window.webkitAudioContext === 'function'
            ? new window.webkitAudioContext()
            : null;
    const audioBuffers = new Map();

    async function ensureBattleModuleLoaded() {
        if (window.EchoesOfTheCityBattle?.createDebugBattleController) {
            return;
        }

        if (!state.battleModulePromise) {
            state.battleModulePromise = (async () => {
                for (const relativePath of BATTLE_SCRIPT_RELATIVE_PATHS) {
                    const scriptUrl = resolveExtensionUrl(relativePath);
                    const response = await fetch(scriptUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch battle module: ${response.status}`);
                    }

                    const scriptSource = await response.text();
                    try {
                        window.eval(`${scriptSource}\n//# sourceURL=${scriptUrl}`);
                    } catch (error) {
                        throw new Error(`Failed to evaluate ${relativePath}: ${error?.message || error}`);
                    }
                }

                if (!window.EchoesOfTheCityBattle?.createDebugBattleController) {
                    throw new Error('Battle module did not expose a controller factory.');
                }
            })().catch((error) => {
                state.battleModulePromise = null;
                throw error;
            });
        }

        await state.battleModulePromise;
    }

    function formatCombatModuleError(error) {
        if (!error) {
            return 'Unknown combat initialization error.';
        }

        if (typeof error === 'string') {
            return error;
        }

        return error.stack || error.message || String(error);
    }

    async function initializeCombatController() {
        if (!elements.combatContent) {
            return;
        }

        await ensureBattleModuleLoaded();

        state.combatController = window.EchoesOfTheCityBattle.createDebugBattleController({
            mountElement: elements.combatContent,
            clamp,
            resolveAssetUrl: resolveExtensionUrl,
        });

        state.combatController.render();
    }

    function renderCombatScreen() {
        state.combatController?.render();
    }

    function resetDebugBattle() {
        state.combatController?.reset();
    }

    function handleCombatContentClick(event) {
        state.combatController?.handleClick(event);
    }

    function handleCombatContentPointerDown(event) {
        state.combatController?.handlePointerDown(event);
    }

    function renderCombatLoadError(error) {
        if (!elements.combatContent) {
            return;
        }

        const errorMessage = formatCombatModuleError(error);
        elements.combatContent.innerHTML = `
            <div class="echoes-battle-panel__combat-debug">
                <div class="echoes-battle-panel__combat-toolbar">
                    <div class="echoes-battle-panel__combat-pills">
                        <span class="echoes-battle-panel__combat-pill">Combat Module Error</span>
                    </div>
                </div>
                <pre class="echoes-battle-panel__combat-load-error">${escapeHtml(errorMessage)}</pre>
            </div>
        `;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function configureAudio(audio, volume) {
        audio.preload = 'auto';
        audio.volume = volume;
    }

    function removeAudioUnlockListeners() {
        document.removeEventListener('pointerdown', handleAudioUnlockGesture, true);
        document.removeEventListener('keydown', handleAudioUnlockGesture, true);
        document.removeEventListener('touchstart', handleAudioUnlockGesture, true);
        document.removeEventListener('click', handleAudioUnlockGesture, true);
    }

    function getBackgroundImageUrl(value) {
        const match = /url\((['"]?)(.*?)\1\)/.exec(value || '');
        return match?.[2] || null;
    }

    function detectExtensionBaseUrl() {
        const currentScriptSource = document.currentScript?.src;
        if (currentScriptSource) {
            return new URL('./', currentScriptSource).href;
        }

        const scriptMatch = Array.from(document.querySelectorAll('script[src]'))
            .map((script) => script.src)
            .find((src) => src.includes('Echoes-of-the-City') && src.endsWith('/index.js'));

        if (scriptMatch) {
            return new URL('./', scriptMatch).href;
        }

        const stylesheetMatch = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
            .map((link) => link.href)
            .find((href) => href.includes('Echoes-of-the-City') && href.endsWith('/style.css'));

        if (stylesheetMatch) {
            return new URL('./', stylesheetMatch).href;
        }

        if (elements.button) {
            const backgroundImage = getComputedStyle(elements.button).backgroundImage;
            const backgroundUrl = getBackgroundImageUrl(backgroundImage);
            if (backgroundUrl) {
                return new URL('../../', backgroundUrl).href;
            }
        }

        return new URL('./', window.location.href).href;
    }

    function resolveExtensionUrl(relativePath) {
        if (!state.extensionBaseUrl) {
            state.extensionBaseUrl = detectExtensionBaseUrl();
        }

        return new URL(relativePath, state.extensionBaseUrl).href;
    }

    function syncAssetUrls() {
        state.extensionBaseUrl = detectExtensionBaseUrl();

        const hoverUrl = resolveExtensionUrl(ASSET_RELATIVE_PATHS.hover);
        const clickUrl = resolveExtensionUrl(ASSET_RELATIVE_PATHS.click);
        const themeUrl = resolveExtensionUrl(ASSET_RELATIVE_PATHS.theme);
        const heavyPanelUrl = resolveExtensionUrl(ASSET_RELATIVE_PATHS.heavyPanel);

        hoverAudio.src = hoverUrl;
        clickAudio.src = clickUrl;
        themeAudio.src = themeUrl;
        heavyPanelAudio.src = heavyPanelUrl;
    }

    function startThemeAudio() {
        if (!themeAudio.src || !state.audioUnlocked) {
            return;
        }

        try {
            const playPromise = themeAudio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        } catch (error) {
            console.debug(`${EXTENSION_ID}: theme audio playback skipped.`, error);
        }
    }

    function stopThemeAudio() {
        try {
            themeAudio.pause();
            themeAudio.currentTime = 0;
        } catch (error) {
            console.debug(`${EXTENSION_ID}: theme audio stop skipped.`, error);
        }
    }

    function playHeavyPanelAudio() {
        if (!heavyPanelAudio.src || !state.audioUnlocked) {
            return;
        }

        try {
            heavyPanelAudio.currentTime = 0;
            const playPromise = heavyPanelAudio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        } catch (error) {
            console.debug(`${EXTENSION_ID}: heavy panel audio playback skipped.`, error);
        }
    }

    async function primeAudioElement(audio) {
        if (!audio?.src) {
            return;
        }

        try {
            audio.muted = true;
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.then === 'function') {
                await playPromise;
            }
            audio.pause();
            audio.currentTime = 0;
        } catch (error) {
            console.debug(`${EXTENSION_ID}: audio priming skipped.`, error);
        } finally {
            audio.muted = false;
        }
    }

    async function resumeAudioContext() {
        if (!audioContext) {
            state.audioEnabled = true;
            return true;
        }

        try {
            if (audioContext.state !== 'running') {
                await audioContext.resume();
            }

            state.audioEnabled = audioContext.state === 'running';
            return state.audioEnabled;
        } catch (error) {
            console.debug(`${EXTENSION_ID}: audio context resume skipped.`, error);
            return false;
        }
    }

    async function unlockAudioPlayback() {
        if (state.audioUnlocked) {
            return true;
        }

        if (state.audioUnlockPromise) {
            return state.audioUnlockPromise;
        }

        state.audioUnlockPromise = (async () => {
            await resumeAudioContext();
            await Promise.all([
                primeAudioElement(hoverAudio),
                primeAudioElement(clickAudio),
                primeAudioElement(themeAudio),
                primeAudioElement(heavyPanelAudio),
            ]);

            state.audioUnlocked = true;
            removeAudioUnlockListeners();

            if (state.isOpen) {
                startThemeAudio();
            }

            return true;
        })().finally(() => {
            state.audioUnlockPromise = null;
        });

        return state.audioUnlockPromise;
    }

    function handleAudioUnlockGesture() {
        void unlockAudioPlayback();
    }

    async function loadAudioBuffer(name, path) {
        if (!audioContext) {
            return;
        }

        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            audioBuffers.set(name, decodedBuffer);
        } catch (error) {
            console.debug(`${EXTENSION_ID}: audio buffer load skipped.`, error);
        }
    }

    function playHtmlAudio(audio) {
        try {
            const audioInstance = audio.cloneNode();
            audioInstance.volume = audio.volume;
            audioInstance.preload = 'auto';
            const playPromise = audioInstance.play();

            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        } catch (error) {
            console.debug(`${EXTENSION_ID}: html audio playback skipped.`, error);
        }
    }

    function playBufferedAudio(name, volume) {
        if (!audioContext || audioContext.state !== 'running') {
            return false;
        }

        const buffer = audioBuffers.get(name);
        if (!buffer) {
            return false;
        }

        try {
            const source = audioContext.createBufferSource();
            const gain = audioContext.createGain();
            source.buffer = buffer;
            gain.gain.value = volume;
            source.connect(gain);
            gain.connect(audioContext.destination);
            source.start(0);
            return true;
        } catch (error) {
            console.debug(`${EXTENSION_ID}: buffered audio playback skipped.`, error);
            return false;
        }
    }

    function playSound(name, options = {}) {
        const { requireAudioEnabled = false } = options;

        if (requireAudioEnabled && !state.audioEnabled) {
            return;
        }

        if (name === 'hover') {
            if (!playBufferedAudio('hover', hoverAudio.volume)) {
                playHtmlAudio(hoverAudio);
            }
            return;
        }

        if (!playBufferedAudio('click', clickAudio.volume)) {
            playHtmlAudio(clickAudio);
        }
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function getPanelWidth() {
        if (window.innerWidth <= 900) {
            return Math.max(320, window.innerWidth - 24);
        }

        if (window.innerWidth <= 1200) {
            return Math.min(window.innerWidth * 0.78, 980);
        }

        return Math.min(window.innerWidth * 0.72, 1100);
    }

    function getButtonRect() {
        if (!elements.button) {
            return { width: 0, height: 0 };
        }

        return {
            width: elements.button.offsetWidth,
            height: elements.button.offsetHeight,
        };
    }

    function updateLayoutPosition() {
        if (!elements.root || !elements.button) {
            return;
        }

        const buttonRect = getButtonRect();
        const buttonWidth = buttonRect.width;
        const buttonHeight = buttonRect.height;
        const maxX = Math.max(BUTTON_MARGIN, window.innerWidth - buttonWidth - BUTTON_MARGIN);
        const maxY = Math.max(BUTTON_MARGIN, window.innerHeight - buttonHeight - BUTTON_MARGIN);

        state.buttonPosition.x = clamp(state.buttonPosition.x, BUTTON_MARGIN, maxX);
        state.buttonPosition.y = clamp(state.buttonPosition.y, BUTTON_MARGIN, maxY);

        const panelWidth = getPanelWidth();
        const panelHeight = panelWidth * PANEL_ASPECT_RATIO;

        let panelLeft;
        let panelTop;

        if (window.innerWidth <= 900) {
            panelLeft = clamp(
                state.buttonPosition.x + (buttonWidth / 2) - (panelWidth / 2),
                PANEL_MARGIN,
                Math.max(PANEL_MARGIN, window.innerWidth - panelWidth - PANEL_MARGIN),
            );
            panelTop = clamp(
                state.buttonPosition.y - panelHeight - PANEL_GAP,
                PANEL_MARGIN,
                Math.max(PANEL_MARGIN, window.innerHeight - panelHeight - PANEL_MARGIN),
            );
        } else {
            panelLeft = clamp(
                state.buttonPosition.x - panelWidth - PANEL_GAP,
                PANEL_MARGIN,
                Math.max(PANEL_MARGIN, window.innerWidth - panelWidth - PANEL_MARGIN),
            );
            panelTop = clamp(
                state.buttonPosition.y + (buttonHeight / 2) - (panelHeight / 2),
                PANEL_MARGIN,
                Math.max(PANEL_MARGIN, window.innerHeight - panelHeight - PANEL_MARGIN),
            );
        }

        elements.root.style.setProperty('--echoes-button-left', `${state.buttonPosition.x}px`);
        elements.root.style.setProperty('--echoes-button-top', `${state.buttonPosition.y}px`);
        elements.root.style.setProperty('--echoes-panel-left', `${panelLeft}px`);
        elements.root.style.setProperty('--echoes-panel-top', `${panelTop}px`);
        elements.root.style.setProperty('--echoes-panel-width', `${panelWidth}px`);
    }

    function initializeButtonPosition() {
        if (!elements.button) {
            return;
        }

        const buttonRect = getButtonRect();
        state.buttonPosition = {
            x: window.innerWidth - buttonRect.width - BUTTON_MARGIN,
            y: (window.innerHeight - buttonRect.height) / 2,
        };

        updateLayoutPosition();
    }

    function syncPanelState() {
        if (!elements.root || !elements.button || !elements.panel) {
            return;
        }

        const isCharacterSelectOpen = state.activeScreen === 'character-select';
        const isCombatScreenOpen = state.activeScreen === 'combat';

        elements.root.classList.toggle('is-open', state.isOpen);
        elements.root.classList.toggle('is-character-select', isCharacterSelectOpen);
        elements.root.classList.toggle('is-combat-screen', isCombatScreenOpen);
        elements.button.setAttribute('aria-expanded', String(state.isOpen));
        elements.panel.setAttribute('aria-hidden', String(!state.isOpen));
        elements.mainMenu?.setAttribute('aria-hidden', String(state.activeScreen !== 'main-menu'));
        elements.characterSelect?.setAttribute('aria-hidden', String(!isCharacterSelectOpen));
        elements.combatScreen?.setAttribute('aria-hidden', String(!isCombatScreenOpen));
        elements.characterTrayButton?.setAttribute('aria-pressed', String(isCharacterSelectOpen));
        elements.combatTrayButton?.setAttribute('aria-pressed', String(isCombatScreenOpen));
    }

    function syncThemePlayback() {
        if (state.isOpen) {
            startThemeAudio();
            return;
        }

        stopThemeAudio();
    }

    function openBattlePanel() {
        if (state.isOpen) {
            return;
        }

        state.isOpen = true;
        syncPanelState();
        playHeavyPanelAudio();
        syncThemePlayback();
    }

    function closeBattlePanel() {
        if (!state.isOpen) {
            return;
        }

        state.isOpen = false;
        syncPanelState();
        syncThemePlayback();
    }

    function toggleBattlePanel() {
        if (state.isOpen) {
            closeBattlePanel();
            return;
        }

        openBattlePanel();
    }

    function handleLauncherHover() {
        if (state.isDragging) {
            return;
        }

        playSound('hover', { requireAudioEnabled: true });
    }

    async function handleLauncherClick() {
        if (state.suppressClick) {
            state.suppressClick = false;
            return;
        }

        await unlockAudioPlayback();
        playSound('click');
        toggleBattlePanel();
    }

    async function handleCloseClick() {
        await unlockAudioPlayback();
        playSound('click');
        closeBattlePanel();
    }

    function handleKeydown(event) {
        if (event.key === 'Escape' && state.isOpen) {
            closeBattlePanel();
        }
    }

    async function handleLauncherPointerDown(event) {
        if (!elements.button || event.button !== 0) {
            return;
        }

        await unlockAudioPlayback();

        state.draggingPointerId = event.pointerId;
        state.isDragging = false;
        state.dragStartPointer = { x: event.clientX, y: event.clientY };
        state.dragStartButton = { ...state.buttonPosition };
        elements.button.setPointerCapture(event.pointerId);
        elements.button.classList.add('is-dragging');
    }

    function handleLauncherPointerMove(event) {
        if (state.draggingPointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - state.dragStartPointer.x;
        const deltaY = event.clientY - state.dragStartPointer.y;

        if (!state.isDragging && Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) {
            state.isDragging = true;
            state.suppressClick = true;
        }

        if (!state.isDragging) {
            return;
        }

        state.buttonPosition = {
            x: state.dragStartButton.x + deltaX,
            y: state.dragStartButton.y + deltaY,
        };

        updateLayoutPosition();
    }

    function stopLauncherDrag(event) {
        if (!elements.button || state.draggingPointerId !== event.pointerId) {
            return;
        }

        if (elements.button.hasPointerCapture(event.pointerId)) {
            elements.button.releasePointerCapture(event.pointerId);
        }

        elements.button.classList.remove('is-dragging');
        state.draggingPointerId = null;
        window.setTimeout(() => {
            state.isDragging = false;
        }, 0);
    }

    function handleResize() {
        updateLayoutPosition();
    }

    async function handleCharacterTrayButtonClick() {
        await unlockAudioPlayback();

        if (state.activeScreen === 'character-select') {
            return;
        }

        playSound('click');

        if (!elements.characterTrayButton) {
            return;
        }

        state.activeScreen = 'character-select';
        syncPanelState();
    }

    async function handleCombatTrayButtonClick() {
        await unlockAudioPlayback();

        if (state.activeScreen === 'combat') {
            return;
        }

        playSound('click');

        if (!elements.combatTrayButton) {
            return;
        }

        state.activeScreen = 'combat';
        syncPanelState();
        state.combatController?.render();
    }

    function handleTrayButtonHover(event) {
        if (event.currentTarget?.getAttribute('aria-pressed') === 'true') {
            return;
        }

        playSound('hover', { requireAudioEnabled: true });
    }

    async function toggleScreenFullscreen() {
        if (!elements.screen) {
            return;
        }

        try {
            if (document.fullscreenElement === elements.screen) {
                await document.exitFullscreen();
                return;
            }

            await elements.screen.requestFullscreen();
        } catch (error) {
            console.debug(`${EXTENSION_ID}: fullscreen toggle skipped.`, error);
        }
    }

    function preloadAudio() {
        themeAudio.load();
        void Promise.all([
            loadAudioBuffer('hover', resolveExtensionUrl(ASSET_RELATIVE_PATHS.hover)),
            loadAudioBuffer('click', resolveExtensionUrl(ASSET_RELATIVE_PATHS.click)),
        ]);
    }

    function createBattleInterface() {
        if (!document.body || document.getElementById(ROOT_ID)) {
            return;
        }

        const root = document.createElement('div');
        root.id = ROOT_ID;
        root.className = 'echoes-battle-ui';
        root.innerHTML = `
            <button
                id="${BUTTON_ID}"
                class="echoes-battle-launcher"
                type="button"
                aria-label="Toggle battle panel"
                aria-controls="${EXTENSION_ID}-battle-panel"
                aria-expanded="false"
                title="Toggle battle panel"
            >
                <span class="echoes-battle-launcher__glow" aria-hidden="true"></span>
                <span class="echoes-sr-only">Toggle battle panel</span>
            </button>

            <div class="echoes-battle-backdrop" aria-hidden="true"></div>

            <section
                id="${EXTENSION_ID}-battle-panel"
                class="echoes-battle-panel"
                aria-hidden="true"
            >
                <button
                    class="echoes-battle-panel__fullscreen"
                    type="button"
                    aria-label="Fullscreen battle screen"
                    title="Fullscreen battle screen"
                >
                    Full
                </button>
                <button
                    class="echoes-battle-panel__close"
                    type="button"
                    aria-label="Close battle panel"
                    title="Close battle panel"
                >
                    x
                </button>

                <div class="echoes-battle-panel__window" aria-hidden="true">
                    <div class="echoes-battle-panel__screen">
                        <div class="echoes-battle-panel__main-menu">
                            <div class="echoes-battle-panel__content"></div>
                        </div>
                        <div class="echoes-battle-panel__character-select" aria-hidden="true">
                            <div class="echoes-battle-panel__character-layout">
                                <div class="echoes-battle-panel__roster-menu"></div>
                                <div class="echoes-battle-panel__character-screen">
                                    <div class="echoes-battle-panel__no-character"></div>
                                </div>
                            </div>
                        </div>
                        <div class="echoes-battle-panel__combat-screen" aria-hidden="true">
                            <div class="echoes-battle-panel__combat-content"></div>
                        </div>
                        <div class="echoes-battle-panel__tray" aria-hidden="true">
                            <button
                                class="echoes-battle-panel__tray-button echoes-battle-panel__tray-button--combat"
                                type="button"
                                aria-label="Open combat screen"
                                aria-pressed="false"
                                title="Open combat screen"
                            >
                                <span
                                    class="echoes-battle-panel__tray-icon echoes-battle-panel__tray-icon--combat"
                                    aria-hidden="true"
                                ></span>
                            </button>
                            <button
                                class="echoes-battle-panel__tray-button echoes-battle-panel__tray-button--characters"
                                type="button"
                                aria-label="Open character select"
                                aria-pressed="false"
                                title="Open character select"
                            >
                                <span class="echoes-battle-panel__tray-icon" aria-hidden="true"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        `;

        document.body.appendChild(root);

        elements.root = root;
        elements.button = root.querySelector(`#${BUTTON_ID}`);
        elements.panel = root.querySelector('.echoes-battle-panel');
        elements.backdrop = root.querySelector('.echoes-battle-backdrop');
        elements.closeButton = root.querySelector('.echoes-battle-panel__close');
        elements.fullscreenButton = root.querySelector('.echoes-battle-panel__fullscreen');
        elements.screen = root.querySelector('.echoes-battle-panel__screen');
        elements.mainMenu = root.querySelector('.echoes-battle-panel__main-menu');
        elements.characterSelect = root.querySelector('.echoes-battle-panel__character-select');
        elements.combatScreen = root.querySelector('.echoes-battle-panel__combat-screen');
        elements.combatContent = root.querySelector('.echoes-battle-panel__combat-content');
        elements.combatTrayButton = root.querySelector('.echoes-battle-panel__tray-button--combat');
        elements.characterTrayButton = root.querySelector('.echoes-battle-panel__tray-button--characters');

        syncAssetUrls();
        elements.button.addEventListener('mouseenter', handleLauncherHover);
        elements.button.addEventListener('pointerdown', handleLauncherPointerDown);
        elements.button.addEventListener('pointermove', handleLauncherPointerMove);
        elements.button.addEventListener('pointerup', stopLauncherDrag);
        elements.button.addEventListener('pointercancel', stopLauncherDrag);
        elements.button.addEventListener('click', handleLauncherClick);
        elements.backdrop.addEventListener('click', closeBattlePanel);
        elements.closeButton.addEventListener('click', handleCloseClick);
        elements.fullscreenButton.addEventListener('click', toggleScreenFullscreen);
        elements.combatTrayButton.addEventListener('mouseenter', handleTrayButtonHover);
        elements.combatTrayButton.addEventListener('click', handleCombatTrayButtonClick);
        elements.combatContent.addEventListener('click', handleCombatContentClick);
        elements.combatContent.addEventListener('pointerdown', handleCombatContentPointerDown);
        elements.combatContent.addEventListener('dragstart', (event) => state.combatController?.handleDragStart(event));
        elements.combatContent.addEventListener('dragover', (event) => state.combatController?.handleDragOver(event));
        elements.combatContent.addEventListener('dragenter', (event) => state.combatController?.handleDragEnter(event));
        elements.combatContent.addEventListener('dragleave', (event) => state.combatController?.handleDragLeave(event));
        elements.combatContent.addEventListener('drop', (event) => state.combatController?.handleDrop(event));
        elements.combatContent.addEventListener('dragend', () => state.combatController?.handleDragEnd());
        elements.characterTrayButton.addEventListener('mouseenter', handleTrayButtonHover);
        elements.characterTrayButton.addEventListener('click', handleCharacterTrayButtonClick);
        document.addEventListener('keydown', handleKeydown);
        window.addEventListener('resize', handleResize);

        initializeButtonPosition();
    }

    async function initialize() {
        configureAudio(hoverAudio, 0.55);
        configureAudio(clickAudio, 0.7);
        configureAudio(themeAudio, 0.42);
        configureAudio(heavyPanelAudio, 0.8);
        themeAudio.loop = true;
        document.addEventListener('pointerdown', handleAudioUnlockGesture, true);
        document.addEventListener('keydown', handleAudioUnlockGesture, true);
        document.addEventListener('touchstart', handleAudioUnlockGesture, true);
        document.addEventListener('click', handleAudioUnlockGesture, true);
        createBattleInterface();
        try {
            await initializeCombatController();
        } catch (error) {
            console.error(`${EXTENSION_ID}: combat module initialization failed.`, error);
            renderCombatLoadError(error);
        }
        preloadAudio();
        syncPanelState();

        window.EchoesOfTheCity = {
            openBattlePanel,
            closeBattlePanel,
            toggleBattlePanel,
            resetDebugBattle,
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void initialize();
        }, { once: true });
    } else {
        void initialize();
    }
})();
