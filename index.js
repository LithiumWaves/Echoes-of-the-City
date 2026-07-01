(() => {
    const EXTENSION_ID = 'echoes-of-the-city';
    const ROOT_ID = `${EXTENSION_ID}-root`;
    const BUTTON_ID = `${EXTENSION_ID}-battle-launcher`;
    const EXTENSION_BASE_URL = new URL('./', document.currentScript?.src || window.location.href);
    const ASSET_PATHS = {
        mainWindow: new URL('./assets/battlewindow/mainwindow.png', EXTENSION_BASE_URL).href,
        mainButton: new URL('./assets/battlewindow/mainbutton.png', EXTENSION_BASE_URL).href,
        logo: new URL('./assets/battlewindow/logo.png', EXTENSION_BASE_URL).href,
    };
    const AUDIO_PATHS = {
        hover: new URL('./audio/battlewindow/hovermechanical.wav', EXTENSION_BASE_URL).href,
        click: new URL('./audio/battlewindow/buttonclick.wav', EXTENSION_BASE_URL).href,
    };

    const state = {
        isOpen: false,
    };

    const elements = {
        root: null,
        button: null,
        panel: null,
        backdrop: null,
        closeButton: null,
    };

    const hoverAudio = new Audio(AUDIO_PATHS.hover);
    const clickAudio = new Audio(AUDIO_PATHS.click);

    function configureAudio(audio, volume) {
        audio.preload = 'auto';
        audio.volume = volume;
    }

    function playSound(audio) {
        try {
            audio.pause();
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        } catch (error) {
            console.debug(`${EXTENSION_ID}: audio playback skipped.`, error);
        }
    }

    function syncPanelState() {
        if (!elements.root || !elements.button || !elements.panel) {
            return;
        }

        elements.root.classList.toggle('is-open', state.isOpen);
        elements.button.setAttribute('aria-expanded', String(state.isOpen));
        elements.panel.setAttribute('aria-hidden', String(!state.isOpen));
    }

    function openBattlePanel() {
        state.isOpen = true;
        syncPanelState();
    }

    function closeBattlePanel() {
        state.isOpen = false;
        syncPanelState();
    }

    function toggleBattlePanel() {
        state.isOpen = !state.isOpen;
        syncPanelState();
    }

    function handleLauncherHover() {
        playSound(hoverAudio);
    }

    function handleLauncherClick() {
        playSound(clickAudio);
        toggleBattlePanel();
    }

    function handleCloseClick() {
        playSound(clickAudio);
        closeBattlePanel();
    }

    function handleKeydown(event) {
        if (event.key === 'Escape' && state.isOpen) {
            closeBattlePanel();
        }
    }

    function preloadAssets() {
        Object.values(ASSET_PATHS).forEach((path) => {
            const image = new Image();
            image.src = path;
        });
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
                <img
                    class="echoes-battle-launcher__logo"
                    src="${ASSET_PATHS.logo}"
                    alt=""
                    aria-hidden="true"
                />
                <span class="echoes-sr-only">Toggle battle panel</span>
            </button>

            <div class="echoes-battle-backdrop" aria-hidden="true"></div>

            <section
                id="${EXTENSION_ID}-battle-panel"
                class="echoes-battle-panel"
                aria-hidden="true"
            >
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
                        <div class="echoes-tv-static"></div>
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

        elements.button.addEventListener('mouseenter', handleLauncherHover);
        elements.button.addEventListener('click', handleLauncherClick);
        elements.backdrop.addEventListener('click', closeBattlePanel);
        elements.closeButton.addEventListener('click', handleCloseClick);
        document.addEventListener('keydown', handleKeydown);
    }

    function initialize() {
        configureAudio(hoverAudio, 0.55);
        configureAudio(clickAudio, 0.7);
        preloadAssets();
        createBattleInterface();
        syncPanelState();

        window.EchoesOfTheCity = {
            openBattlePanel,
            closeBattlePanel,
            toggleBattlePanel,
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
