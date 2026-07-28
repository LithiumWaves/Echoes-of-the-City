(() => {
    const EXTENSION_ID = 'echoes-of-the-city';
    const ROOT_ID = `${EXTENSION_ID}-root`;
    const BUTTON_ID = `${EXTENSION_ID}-battle-launcher`;
    const BUTTON_MARGIN = 0;
    const PANEL_MARGIN = 8;
    const PANEL_GAP = 24;
    const DRAG_THRESHOLD = 6;
    const PANEL_ASPECT_RATIO = 1640 / 4120;
    const BATTLE_BASE_PACK_SCRIPT_RELATIVE_PATHS = [
        'battle/content/packs/base/statuses/bleed.js',
        'battle/content/packs/base/statuses/burn.js',
        'battle/content/packs/base/statuses/charge.js',
        'battle/content/packs/base/statuses/ammo.js',
        'battle/content/packs/base/statuses/atelierLogicAmmo.js',
        'battle/content/packs/base/statuses/bulletSolitude.js',
        'battle/content/packs/base/statuses/lcaFractureRound.js',
        'battle/content/packs/base/statuses/sporeRoundBase.js',
        'battle/content/packs/base/statuses/sporeRoundBuckshot.js',
        'battle/content/packs/base/statuses/scorchPropellantAmmo.js',
        'battle/content/packs/base/statuses/tigermarkRound.js',
        'battle/content/packs/base/statuses/savageTigermarkRound.js',
        'battle/content/packs/base/statuses/theLivingAndTheDeparted.js',
        'battle/content/packs/base/statuses/chargeBarrier.js',
        'battle/content/packs/base/statuses/tremor.js',
        'battle/content/packs/base/statuses/aggro.js',
        'battle/content/packs/base/statuses/fairyLure.js',
        'battle/content/packs/base/statuses/concussion.js',
        'battle/content/packs/base/statuses/coffin.js',
        'battle/content/packs/base/statuses/spore.js',
        'battle/content/packs/base/statuses/haste.js',
        'battle/content/packs/base/statuses/bind.js',
        'battle/content/packs/base/statuses/fragile.js',
        'battle/content/packs/base/statuses/defensePowerUp.js',
        'battle/content/packs/base/statuses/defensePowerDown.js',
        'battle/content/packs/base/statuses/clashPowerUp.js',
        'battle/content/packs/base/statuses/clashPowerDown.js',
        'battle/content/packs/base/statuses/basePowerUp.js',
        'battle/content/packs/base/statuses/damageUp.js',
        'battle/content/packs/base/statuses/damageDown.js',
        'battle/content/packs/base/statuses/critDmgUp.js',
        'battle/content/packs/base/statuses/typedDamageUp.js',
        'battle/content/packs/base/statuses/typedPowerUp.js',
        'battle/content/packs/base/statuses/typedProtections.js',
        'battle/content/packs/base/statuses/damageTypeFragilities.js',
        'battle/content/packs/base/statuses/sinFragilities.js',
        'battle/content/packs/base/statuses/nails.js',
        'battle/content/packs/base/statuses/darkFlame.js',
        'battle/content/packs/base/statuses/photoelectricity.js',
        'battle/content/packs/base/statuses/protection.js',
        'battle/content/packs/base/statuses/rupture.js',
        'battle/content/packs/base/statuses/sinking.js',
        'battle/content/packs/base/statuses/poise.js',
        'battle/content/packs/base/statuses/paralyze.js',
        'battle/content/packs/base/statuses/attackPowerUp.js',
        'battle/content/packs/base/statuses/attackPowerDown.js',
        'battle/content/packs/base/statuses/offenseLevelUp.js',
        'battle/content/packs/base/statuses/offenseLevelDown.js',
        'battle/content/packs/base/statuses/defenseLevelUp.js',
        'battle/content/packs/base/statuses/defenseLevelDown.js',
        'battle/content/packs/base/statuses/plusCoinBoost.js',
        'battle/content/packs/base/statuses/plusCoinDrop.js',
        'battle/content/packs/base/statuses/minusCoinBoost.js',
        'battle/content/packs/base/statuses/minusCoinDrop.js',
        'battle/content/packs/base/units/vergilius.js',
        'battle/content/packs/base/units/bambooHattedKim.js',
        'battle/content/packs/base/units/ringNursefatherCallisto.js',
        'battle/content/packs/base/units/dongbaek.js',
        'battle/content/packs/base/battles/cityGateSkirmish.js',
        'battle/content/packs/base/battles/debugFight.js',
    ];
    const BATTLE_CORE_SCRIPT_RELATIVE_PATHS = [
        'battle/registry/battleRegistry.js',
        'battle/schema/battleSchema.js',
        'battle/effects/skillEffectRunner.js',
        'battle/ai/enemyAi.js',
        'battle/validation/battleValidation.js',
        'battle/content/battleContentRegistry.js',
        ...BATTLE_BASE_PACK_SCRIPT_RELATIVE_PATHS,
        'battle/ui/inspect/inspectState.js',
        'battle/core/damageFormula.js',
        'battle/core/battleEngine.js',
        'battle/core/battleRenderer.js',
        'battle/core/battleHandler.js',
    ];
    const BATTLE_DEBUG_SCRIPT_RELATIVE_PATHS = [
        'battle/debug/debugRollManager.js',
        'battle/debug/debugBattleController.js',
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
        battleHandler: null,
        battleCoreModulePromise: null,
        battleDebugModulePromise: null,
        battleSelectionPromise: null,
        availableBattles: [],
        selectedBattleId: null,
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
        contentJsonInput: '',
        contentImportMessage: null,
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

    async function loadBattleScriptGroup(relativePaths, stateKey, readyCheck, missingMessage) {
        if (readyCheck()) {
            return;
        }

        if (!state[stateKey]) {
            state[stateKey] = (async () => {
                for (const relativePath of relativePaths) {
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

                if (!readyCheck()) {
                    throw new Error(missingMessage);
                }
            })().catch((error) => {
                state[stateKey] = null;
                throw error;
            });
        }

        await state[stateKey];
    }

    async function ensureBattleModuleLoaded() {
        await loadBattleScriptGroup(
            BATTLE_CORE_SCRIPT_RELATIVE_PATHS,
            'battleCoreModulePromise',
            () => Boolean(window.EchoesOfTheCityBattle?.createBattleHandler),
            'Battle module did not expose a battle handler factory.',
        );
    }

    async function ensureDebugBattleModuleLoaded() {
        await ensureBattleModuleLoaded();
        await loadBattleScriptGroup(
            BATTLE_DEBUG_SCRIPT_RELATIVE_PATHS,
            'battleDebugModulePromise',
            () => Boolean(window.EchoesOfTheCityBattle?.createDebugBattleController),
            'Debug battle module did not expose a debug battle controller factory.',
        );
    }

    function formatCombatModuleError(error) {
        if (!error) {
            return 'Unknown combat initialization error.';
        }

        if (typeof error === 'string') {
            return error;
        }

        return error.message || error.stack || String(error);
    }

    function formatContentImportMessage(message) {
        if (!message?.text) {
            return '';
        }

        return message.text;
    }

    function setContentImportMessage(type, text) {
        state.contentImportMessage = text
            ? { type, text }
            : null;
    }

    function formatImportSummary(result, sourceLabel) {
        const statuses = result?.counts?.statuses || 0;
        const units = result?.counts?.units || 0;
        const battles = result?.counts?.battles || 0;
        const summaryParts = [
            `${battles} battle${battles === 1 ? '' : 's'}`,
            `${units} unit${units === 1 ? '' : 's'}`,
            `${statuses} status${statuses === 1 ? '' : 'es'}`,
        ];
        return `Imported ${summaryParts.join(', ')} from ${sourceLabel}.`;
    }

    function sanitizeDownloadFileName(value, fallbackName) {
        const sanitized = String(value || fallbackName || 'content')
            .replace(/[^a-z0-9-_]+/gi, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase();
        return sanitized || fallbackName || 'content';
    }

    function downloadJsonFile(fileName, data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    }

    async function importContentJson(text, sourceLabel = 'pasted JSON') {
        const trimmedText = String(text || '').trim();
        if (!trimmedText) {
            setContentImportMessage('error', 'Paste a battle, unit, status, or content pack JSON object first.');
            renderBattleStartScreen();
            return;
        }

        let parsedPayload;
        try {
            parsedPayload = JSON.parse(trimmedText);
        } catch (error) {
            setContentImportMessage('error', `Invalid JSON in ${sourceLabel}: ${error?.message || error}`);
            renderBattleStartScreen();
            return;
        }

        try {
            const api = getBattleContentApi();
            if (typeof api.importContentPack !== 'function') {
                throw new Error('Battle content import is not available.');
            }

            const result = api.importContentPack(parsedPayload);
            refreshBattleSelectionState();
            if (Array.isArray(result?.ids?.battles) && result.ids.battles.length) {
                state.selectedBattleId = result.ids.battles[0];
            }
            state.contentJsonInput = '';
            setContentImportMessage('success', formatImportSummary(result, sourceLabel));
        } catch (error) {
            setContentImportMessage('error', formatCombatModuleError(error));
        }

        renderBattleStartScreen();
    }

    async function promptContentFileImport() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files?.[0];
            if (!file) {
                return;
            }

            try {
                const fileText = await file.text();
                state.contentJsonInput = fileText;
                await importContentJson(fileText, file.name);
            } catch (error) {
                setContentImportMessage('error', `Failed to read ${file.name}: ${error?.message || error}`);
                renderBattleStartScreen();
            }
        }, { once: true });
        fileInput.click();
    }

    function exportSelectedBattleJson() {
        const selectedBattleId = state.selectedBattleId;
        if (!selectedBattleId) {
            setContentImportMessage('error', 'Select a battle before exporting.');
            renderBattleStartScreen();
            return;
        }

        try {
            const api = getBattleContentApi();
            if (typeof api.exportBattleDefinition !== 'function') {
                throw new Error('Battle export is not available.');
            }

            const battleDefinition = api.exportBattleDefinition(selectedBattleId);
            const fileName = `${sanitizeDownloadFileName(selectedBattleId, 'battle')}.json`;
            downloadJsonFile(fileName, battleDefinition);
            setContentImportMessage('success', `Exported battle JSON for "${battleDefinition.name || selectedBattleId}".`);
        } catch (error) {
            setContentImportMessage('error', formatCombatModuleError(error));
        }

        renderBattleStartScreen();
    }

    function exportSelectedBattlePack() {
        const selectedBattleId = state.selectedBattleId;
        if (!selectedBattleId) {
            setContentImportMessage('error', 'Select a battle before exporting its pack.');
            renderBattleStartScreen();
            return;
        }

        try {
            const api = getBattleContentApi();
            if (typeof api.exportBattleContentPack !== 'function') {
                throw new Error('Battle pack export is not available.');
            }

            const contentPack = api.exportBattleContentPack(selectedBattleId);
            const fileName = `${sanitizeDownloadFileName(selectedBattleId, 'battle')}-pack.json`;
            downloadJsonFile(fileName, contentPack);
            setContentImportMessage('success', `Exported a reusable content pack for "${selectedBattleId}".`);
        } catch (error) {
            setContentImportMessage('error', formatCombatModuleError(error));
        }

        renderBattleStartScreen();
    }

    function isDebugBattleId(battleId) {
        return battleId === 'debug-fight' || battleId === 'debugFight';
    }

    function getBattleContentApi() {
        return window.EchoesOfTheCityBattle || {};
    }

    function getAvailableBattleDefinitions() {
        const api = getBattleContentApi();
        const listedBattles = typeof api.listBattleDefinitions === 'function'
            ? api.listBattleDefinitions()
            : [];
        const uniqueBattles = [];
        const seenIds = new Set();

        listedBattles.forEach((entry) => {
            if (!entry?.id || seenIds.has(entry.id)) {
                return;
            }

            seenIds.add(entry.id);
            uniqueBattles.push({
                id: entry.id,
                name: entry.name || entry.id,
                isDebug: isDebugBattleId(entry.id),
                description: typeof api.getBattleDefinition === 'function'
                    ? api.getBattleDefinition(entry.id)?.description || ''
                    : '',
            });
        });

        uniqueBattles.sort((left, right) => {
            if (left.isDebug !== right.isDebug) {
                return left.isDebug ? 1 : -1;
            }

            return left.name.localeCompare(right.name);
        });

        return uniqueBattles;
    }

    function refreshBattleSelectionState() {
        const api = getBattleContentApi();
        const availableBattles = getAvailableBattleDefinitions();
        const defaultBattleId = typeof api.getDefaultBattleDefinition === 'function'
            ? api.getDefaultBattleDefinition()?.id || null
            : null;
        const preferredBattleId = defaultBattleId
            || availableBattles.find((battle) => !battle.isDebug)?.id
            || availableBattles[0]?.id
            || null;

        state.availableBattles = availableBattles;

        if (!state.selectedBattleId || !availableBattles.some((battle) => battle.id === state.selectedBattleId)) {
            state.selectedBattleId = preferredBattleId;
        }
    }

    async function prepareBattleSelection() {
        if (state.battleSelectionPromise) {
            return state.battleSelectionPromise;
        }

        state.battleSelectionPromise = (async () => {
            await ensureBattleModuleLoaded();
            refreshBattleSelectionState();
        })().catch((error) => {
            state.battleSelectionPromise = null;
            throw error;
        });

        try {
            await state.battleSelectionPromise;
        } finally {
            state.battleSelectionPromise = null;
        }
    }

    function renderBattleStartScreen() {
        if (!elements.combatContent) {
            return;
        }

        if (state.battleHandler) {
            state.battleHandler.render();
            return;
        }

        if (!state.availableBattles.length) {
            if (!state.battleSelectionPromise) {
                void prepareBattleSelection()
                    .then(() => {
                        if (!state.battleHandler) {
                            renderBattleStartScreen();
                        }
                    })
                    .catch((error) => {
                        console.error(`${EXTENSION_ID}: battle selection initialization failed.`, error);
                        renderCombatLoadError(error);
                    });
            }

            elements.combatContent.innerHTML = `
                <div class="echoes-battle-panel__combat-debug">
                    <div class="echoes-battle-panel__combat-toolbar">
                        <div class="echoes-battle-panel__combat-pills">
                            <span class="echoes-battle-panel__combat-pill">Battle Simulator</span>
                        </div>
                    </div>
                    <div class="echoes-battle-panel__planner-empty">
                        Loading registered battle definitions...
                    </div>
                </div>
            `;
            return;
        }

        const selectedBattle = state.availableBattles.find((battle) => battle.id === state.selectedBattleId) || state.availableBattles[0];
        const contentImportMessage = formatContentImportMessage(state.contentImportMessage);
        const contentImportMessageStyles = state.contentImportMessage?.type === 'error'
            ? 'background: rgba(120, 24, 24, 0.58); border: 1px solid rgba(255, 110, 110, 0.4);'
            : 'background: rgba(24, 120, 70, 0.42); border: 1px solid rgba(120, 255, 170, 0.35);';
        const selectionMarkup = state.availableBattles
            .map((battle) => `
                <button
                    class="echoes-battle-panel__combat-button"
                    type="button"
                    data-action="select-battle"
                    data-battle-id="${escapeHtml(battle.id)}"
                    style="justify-content: space-between; ${battle.id === selectedBattle?.id ? 'outline: 2px solid rgba(255,255,255,0.55);' : ''}"
                >
                    <span>${escapeHtml(battle.name)}</span>
                    ${battle.isDebug ? '<span class="echoes-battle-panel__combat-pill">Debug</span>' : ''}
                </button>
            `)
            .join('');

        elements.combatContent.innerHTML = `
            <div class="echoes-battle-panel__combat-debug">
                <div class="echoes-battle-panel__combat-toolbar">
                    <div class="echoes-battle-panel__combat-pills">
                        <span class="echoes-battle-panel__combat-pill">Battle Simulator</span>
                        ${selectedBattle?.isDebug ? '<span class="echoes-battle-panel__combat-pill">Debug Tools Available</span>' : ''}
                    </div>
                </div>
                <div class="echoes-battle-panel__planner-empty" style="text-align: left;">
                    ${escapeHtml(selectedBattle?.description || 'Choose a registered battle definition to launch combat.')}
                </div>
                <div style="margin-top: 0.8rem; display: grid; gap: 0.55rem;">
                    ${selectionMarkup}
                </div>
                <div style="margin-top: 0.8rem; display: flex; justify-content: center;">
                    <button
                        class="echoes-battle-panel__combat-button"
                        type="button"
                        data-action="launch-selected-battle"
                        ${selectedBattle ? '' : 'disabled'}
                    >
                        ${selectedBattle?.isDebug ? 'Launch Debug Battle' : 'Launch Battle'}
                    </button>
                </div>
                <div style="margin-top: 1rem; display: grid; gap: 0.55rem; text-align: left;">
                    <div class="echoes-battle-panel__planner-empty" style="text-align: left;">
                        Import a battle, unit, status, or a full content pack JSON object. Export the selected battle by itself or as a reusable dependency pack.
                    </div>
                    <textarea
                        data-action="content-json-input"
                        rows="8"
                        style="width: 100%; resize: vertical; border: 1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.65rem; font: inherit; line-height: 1.35;"
                        placeholder='{"id":"custom-battle","name":"Custom Battle","playerUnits":[...],"enemyUnits":[...]}'
                    >${escapeHtml(state.contentJsonInput || '')}</textarea>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.55rem;">
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="import-content-json">Import JSON</button>
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="import-content-file">Import File</button>
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="export-selected-battle" ${selectedBattle ? '' : 'disabled'}>Export Battle</button>
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="export-selected-pack" ${selectedBattle ? '' : 'disabled'}>Export Battle Pack</button>
                    </div>
                    ${contentImportMessage
                        ? `<div style="padding: 0.65rem 0.75rem; color: rgba(255,255,255,0.92); white-space: pre-wrap; ${contentImportMessageStyles}">${escapeHtml(contentImportMessage)}</div>`
                        : ''}
                </div>
            </div>
        `;
    }

    async function initializeBattleHandler(battleId = state.selectedBattleId) {
        if (!elements.combatContent) {
            return;
        }

        await prepareBattleSelection();

        const selectedBattleId = battleId || state.selectedBattleId;
        const battleDefinition = window.EchoesOfTheCityBattle.getBattleDefinition?.(selectedBattleId);
        if (!battleDefinition) {
            throw new Error(`Battle definition "${selectedBattleId}" is not available.`);
        }

        state.selectedBattleId = battleDefinition.id;

        if (isDebugBattleId(battleDefinition.id)) {
            await ensureDebugBattleModuleLoaded();
            state.battleHandler = window.EchoesOfTheCityBattle.createDebugBattleController({
                mountElement: elements.combatContent,
                clamp,
                resolveAssetUrl: resolveExtensionUrl,
            });
        } else {
            state.battleHandler = window.EchoesOfTheCityBattle.createBattleHandler({
                mountElement: elements.combatContent,
                clamp,
                resolveAssetUrl: resolveExtensionUrl,
                battleDefinition,
                enableDebugTools: false,
                storageKeyPrefix: `echoes-of-the-city:battle:${battleDefinition.id}`,
            });
        }

        state.battleHandler.render();
    }

    function renderCombatScreen() {
        if (state.battleHandler) {
            state.battleHandler.render();
            return;
        }

        renderBattleStartScreen();
    }

    function resetBattle() {
        state.battleHandler?.reset();
    }

    async function handleCombatContentClick(event) {
        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) {
            state.battleHandler?.handleClick(event);
            return;
        }

        const { action, battleId } = actionTarget.dataset;

        if (action === 'select-battle' && battleId) {
            state.selectedBattleId = battleId;
            renderBattleStartScreen();
            return;
        }

        if (action === 'launch-selected-battle') {
            try {
                await initializeBattleHandler(state.selectedBattleId);
            } catch (error) {
                console.error(`${EXTENSION_ID}: combat module initialization failed.`, error);
                renderCombatLoadError(error);
            }
            return;
        }

        if (action === 'import-content-json') {
            await importContentJson(state.contentJsonInput, 'pasted JSON');
            return;
        }

        if (action === 'import-content-file') {
            await promptContentFileImport();
            return;
        }

        if (action === 'export-selected-battle') {
            exportSelectedBattleJson();
            return;
        }

        if (action === 'export-selected-pack') {
            exportSelectedBattlePack();
            return;
        }

        state.battleHandler?.handleClick(event);
    }

        function handleCombatContentChange(event) {
            const textarea = event.target.closest('[data-action="content-json-input"]');
            if (textarea) {
                state.contentJsonInput = textarea.value || '';
                return;
            }

            state.battleHandler?.handleChange?.(event);
        }

    function handleCombatContentPointerDown(event) {
        state.battleHandler?.handlePointerDown(event);
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
        void prepareBattleSelection().catch((error) => {
            console.error(`${EXTENSION_ID}: battle selection initialization failed.`, error);
            renderCombatLoadError(error);
        });
        renderCombatScreen();
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
        elements.combatContent.addEventListener('change', handleCombatContentChange);
        elements.combatContent.addEventListener('pointerdown', handleCombatContentPointerDown);
        elements.combatContent.addEventListener('dragstart', (event) => state.battleHandler?.handleDragStart(event));
        elements.combatContent.addEventListener('dragover', (event) => state.battleHandler?.handleDragOver(event));
        elements.combatContent.addEventListener('dragenter', (event) => state.battleHandler?.handleDragEnter(event));
        elements.combatContent.addEventListener('dragleave', (event) => state.battleHandler?.handleDragLeave(event));
        elements.combatContent.addEventListener('drop', (event) => state.battleHandler?.handleDrop(event));
        elements.combatContent.addEventListener('dragend', () => state.battleHandler?.handleDragEnd());
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
        renderBattleStartScreen();
        preloadAudio();
        syncPanelState();

        window.EchoesOfTheCity = {
            openBattlePanel,
            closeBattlePanel,
            toggleBattlePanel,
            resetBattle,
            resetDebugBattle: resetBattle,
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
