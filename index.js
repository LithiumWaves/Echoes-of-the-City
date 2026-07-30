(() => {
    const EXTENSION_ID = 'echoes-of-the-city';
    const ROOT_ID = `${EXTENSION_ID}-root`;
    const BUTTON_ID = `${EXTENSION_ID}-battle-launcher`;
    const BUTTON_MARGIN = 0;
    const PANEL_MARGIN = 8;
    const PANEL_GAP = 24;
    const DRAG_THRESHOLD = 6;
    const PANEL_ASPECT_RATIO = 1640 / 4120;
    const BATTLE_DEBUG_TOOLS_STORAGE_KEY = `${EXTENSION_ID}:battle-debug-tools-enabled`;
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
        'battle/content/packs/base/statuses/tiantuiStar.js',
        'battle/content/packs/base/statuses/shinTiantuiStar.js',
        'battle/content/packs/base/statuses/missingBuffsBatch1.js',
        'battle/content/packs/base/statuses/missingStatusesBatch2.js',
        'battle/content/packs/base/statuses/chargeBarrier.js',
        'battle/content/packs/base/statuses/tremor.js',
        'battle/content/packs/base/statuses/aggro.js',
        'battle/content/packs/base/statuses/fairyLure.js',
        'battle/content/packs/base/statuses/concussion.js',
        'battle/content/packs/base/statuses/coffin.js',
        'battle/content/packs/base/statuses/spore.js',
        'battle/content/packs/base/statuses/borrowedTime.js',
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
        'battle/content/packs/base/statuses/missingStatusesBatch3Survival.js',
        'battle/content/packs/base/statuses/missingStatusesBatch4Dawn.js',
        'battle/content/packs/base/statuses/missingStatusesBatch5Boss.js',
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
        'battle/ui/creator/creatorUiHelpers.js',
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

    function loadBooleanSetting(key, fallbackValue = false) {
        try {
            const rawValue = window.localStorage?.getItem(key);
            if (rawValue === '1') {
                return true;
            }
            if (rawValue === '0') {
                return false;
            }
        } catch (error) {
            return fallbackValue;
        }
        return fallbackValue;
    }

    function persistBooleanSetting(key, value) {
        try {
            window.localStorage?.setItem(key, value ? '1' : '0');
        } catch (error) {
            return;
        }
    }

    const state = {
        isOpen: false,
        activeScreen: 'main-menu',
        battleHandler: null,
        battleCoreModulePromise: null,
        battleDebugModulePromise: null,
        battleSelectionPromise: null,
        creatorSelectionPromise: null,
        availableBattles: [],
        selectedBattleId: null,
        battleDebugToolsEnabled: loadBooleanSetting(BATTLE_DEBUG_TOOLS_STORAGE_KEY, false),
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
        creatorTab: 'library',
        creatorEntityType: 'battle',
        creatorSelectedId: null,
        creatorJsonInput: '',
        creatorMessage: null,
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
        creatorScreen: null,
        creatorContent: null,
        combatScreen: null,
        combatContent: null,
        combatTrayButton: null,
        characterTrayButton: null,
        creatorTrayButton: null,
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
            const importFn = typeof api.installContentPack === 'function'
                ? api.installContentPack
                : api.importContentPack;
            if (typeof importFn !== 'function') {
                throw new Error('Battle content import is not available.');
            }

            let result;
            try {
                result = importFn(parsedPayload);
            } catch (error) {
                const message = formatCombatModuleError(error);
                if (typeof api.installContentPack === 'function' && message.startsWith('Import conflicts detected:')) {
                    const strategy = prompt(
                        [
                            'Import conflicts detected.',
                            'Choose how to resolve:',
                            'o = overwrite existing',
                            'r = rename imported ids',
                            's = skip conflicting entries',
                            'c = cancel',
                        ].join('\n'),
                        'o',
                    );
                    const normalized = String(strategy || '').trim().toLowerCase();
                    if (normalized === 'c' || !normalized) {
                        throw error;
                    }
                    const conflictStrategy = normalized === 'r'
                        ? 'rename'
                        : (normalized === 's' ? 'skip' : 'overwrite');
                    result = api.installContentPack(parsedPayload, { conflictStrategy });
                } else {
                    throw error;
                }
            }
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

    async function prepareCreatorSelection() {
        if (state.creatorSelectionPromise) {
            return state.creatorSelectionPromise;
        }

        state.creatorSelectionPromise = (async () => {
            await ensureBattleModuleLoaded();
            const api = getBattleContentApi();
            if (typeof api.loadPersistedContentPacks === 'function') {
                api.loadPersistedContentPacks();
            }
        })().catch((error) => {
            state.creatorSelectionPromise = null;
            throw error;
        });

        try {
            await state.creatorSelectionPromise;
        } finally {
            state.creatorSelectionPromise = null;
        }
    }

    function getSchemaApi() {
        return window.EchoesOfTheCityBattleModules?.schema || window.EchoesOfTheCityBattle?.schema || null;
    }

    function getRegistryApi() {
        return window.EchoesOfTheCityBattleModules?.registry || window.EchoesOfTheCityBattleModules?.battleRegistry || null;
    }

    function getCreatorUi() {
        return window.EchoesOfTheCityCreatorUi || window.EchoesOfTheCityBattleModules?.creatorUi || null;
    }

    function getCreatorCatalog() {
        const registry = getRegistryApi();
        const statusList = typeof registry?.listStatusDefinitions === 'function'
            ? registry.listStatusDefinitions()
            : [];
        const creatorUi = getCreatorUi();
        return creatorUi?.buildCatalog(statusList) || {
            statusList: [],
            effectTypes: { common: [], rest: [], all: [] },
            conditionTypes: [],
            passiveHooks: [],
            skillTypes: ['attack', 'guard', 'evade', 'counter'],
            damageTypes: ['slash', 'pierce', 'blunt'],
            sinTypes: ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'],
            skillTriggers: ['onSelect', 'onUse', 'onHit', 'onClashWin', 'onClashLose', 'onAttackEnd'],
        };
    }

    function normalizeCreatorDraft(entityType, parsed) {
        const creatorUi = getCreatorUi();
        if (entityType === 'unit') {
            const draft = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed
                : (creatorUi?.createDefaultUnitDefinition?.() || createDefaultUnitDefinition());
            draft.passives = Array.isArray(draft.passives) ? draft.passives : [];
            draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
            draft.sprites = draft.sprites && typeof draft.sprites === 'object' && !Array.isArray(draft.sprites) ? draft.sprites : {};
            draft.sprites.skills = draft.sprites.skills && typeof draft.sprites.skills === 'object' && !Array.isArray(draft.sprites.skills) ? draft.sprites.skills : {};
            draft.resistances = draft.resistances && typeof draft.resistances === 'object' && !Array.isArray(draft.resistances) ? draft.resistances : {};
            draft.resistances.physical = draft.resistances.physical && typeof draft.resistances.physical === 'object' && !Array.isArray(draft.resistances.physical) ? draft.resistances.physical : {};
            draft.resistances.sin = draft.resistances.sin && typeof draft.resistances.sin === 'object' && !Array.isArray(draft.resistances.sin) ? draft.resistances.sin : {};
            draft.speedRange = Array.isArray(draft.speedRange) ? draft.speedRange : [1, 1];
            draft.staggerThresholds = Array.isArray(draft.staggerThresholds) ? draft.staggerThresholds : [];
            return draft;
        }
        if (entityType === 'status') {
            const draft = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed
                : (creatorUi?.createDefaultStatusDefinition?.() || createDefaultStatusDefinition());
            draft.hooks = draft.hooks && typeof draft.hooks === 'object' && !Array.isArray(draft.hooks) ? draft.hooks : {};
            draft.stackModel = draft.stackModel && typeof draft.stackModel === 'object' && !Array.isArray(draft.stackModel) ? draft.stackModel : {};
            draft.tags = Array.isArray(draft.tags) ? draft.tags : [];
            return draft;
        }
        return parsed;
    }

    function updateCreatorEntityJson(entityType, mutator) {
        const parsed = getCreatorParsedJsonOrNull();
        const draft = normalizeCreatorDraft(entityType, parsed);
        if (typeof mutator === 'function') {
            mutator(draft);
        }
        state.creatorJsonInput = JSON.stringify(draft, null, 2);
    }

    function updateCreatorUnitJson(mutator) {
        updateCreatorEntityJson('unit', mutator);
    }

    function updateCreatorStatusJson(mutator) {
        updateCreatorEntityJson('status', mutator);
    }

    function getCreatorHooksContainer(draft, scope, dataset) {
        if (scope === 'status') {
            draft.hooks = draft.hooks && typeof draft.hooks === 'object' && !Array.isArray(draft.hooks) ? draft.hooks : {};
            return draft.hooks;
        }
        if (scope === 'unit-passive') {
            const passiveIndex = Number(dataset.passiveIndex);
            draft.passives = Array.isArray(draft.passives) ? draft.passives : [];
            const passive = draft.passives[passiveIndex];
            if (!passive || typeof passive !== 'object') {
                return null;
            }
            passive.hooks = passive.hooks && typeof passive.hooks === 'object' && !Array.isArray(passive.hooks) ? passive.hooks : {};
            return passive.hooks;
        }
        return null;
    }

    function getCreatorHookEntry(hooks, hookName, entryIndex) {
        const entries = Array.isArray(hooks?.[hookName]) ? hooks[hookName] : [];
        return entries[entryIndex] || null;
    }

    function runCreatorHookMutation(entityType, scope, dataset, mutator) {
        const updater = entityType === 'status' ? updateCreatorStatusJson : updateCreatorUnitJson;
        updater((draft) => {
            const hooks = getCreatorHooksContainer(draft, scope, dataset);
            if (!hooks) {
                return;
            }
            mutator(hooks, draft);
        });
    }

    function runCreatorHookEntryMutation(entityType, scope, dataset, mutator) {
        const hookName = dataset.hookName || null;
        const entryIndex = Number(dataset.hookEntryIndex);
        if (!hookName || !Number.isInteger(entryIndex)) {
            return;
        }
        runCreatorHookMutation(entityType, scope, dataset, (hooks) => {
            const entry = getCreatorHookEntry(hooks, hookName, entryIndex);
            if (!entry) {
                return;
            }
            mutator(entry, hooks, hookName, entryIndex);
        });
    }

    function handleCreatorHookClick(action, actionTarget) {
        const creatorUi = getCreatorUi();
        const scope = actionTarget.dataset.creatorScope || null;
        if (!scope) {
            return false;
        }
        const entityType = scope === 'status' ? 'status' : 'unit';
        const dataset = actionTarget.dataset;
        const hookName = dataset.hookName || null;
        const entryIndex = Number(dataset.hookEntryIndex);

        if (action === 'creator-hook-add-event') {
            const bar = actionTarget.closest('.echoes-creator__add-hook-bar');
            const pick = bar?.querySelector('[data-action="creator-hook-pick-event"]');
            const selectedHook = pick?.value || '';
            if (!selectedHook) {
                setCreatorMessage('error', 'Pick a trigger event first.');
                renderCreatorScreen();
                return true;
            }
            runCreatorHookMutation(entityType, scope, dataset, (hooks) => {
                if (!Array.isArray(hooks[selectedHook])) {
                    hooks[selectedHook] = [];
                }
                hooks[selectedHook].push({
                    type: 'applyStatus',
                    target: 'opponent',
                    statusId: '',
                    potency: 1,
                    count: 1,
                });
            });
            setCreatorMessage('success', `Added ${selectedHook} event.`);
            renderCreatorScreen();
            return true;
        }

        if (action === 'creator-hook-add-simple' && hookName) {
            runCreatorHookMutation(entityType, scope, dataset, (hooks) => {
                const entries = Array.isArray(hooks[hookName]) ? hooks[hookName] : [];
                entries.push({
                    type: 'applyStatus',
                    target: 'opponent',
                    statusId: '',
                    potency: 1,
                    count: 1,
                });
                hooks[hookName] = entries;
            });
            renderCreatorScreen();
            return true;
        }

        if (action === 'creator-hook-add-block' && hookName) {
            runCreatorHookMutation(entityType, scope, dataset, (hooks) => {
                const entries = Array.isArray(hooks[hookName]) ? hooks[hookName] : [];
                entries.push({
                    id: `${hookName}_${entries.length + 1}`,
                    oncePer: 'turn',
                    conditions: [{ type: 'always' }],
                    actions: [{
                        type: 'applyStatus',
                        target: 'opponent',
                        statusId: '',
                        potency: 1,
                        count: 1,
                    }],
                });
                hooks[hookName] = entries;
            });
            renderCreatorScreen();
            return true;
        }

        if (action === 'creator-hook-remove-event' && hookName) {
            runCreatorHookMutation(entityType, scope, dataset, (hooks) => {
                delete hooks[hookName];
            });
            renderCreatorScreen();
            return true;
        }

        if (action === 'creator-hook-remove-block' && hookName && Number.isInteger(entryIndex)) {
            runCreatorHookMutation(entityType, scope, dataset, (hooks) => {
                const entries = Array.isArray(hooks[hookName]) ? hooks[hookName] : [];
                entries.splice(entryIndex, 1);
                if (!entries.length) {
                    delete hooks[hookName];
                } else {
                    hooks[hookName] = entries;
                }
            });
            renderCreatorScreen();
            return true;
        }

        if (action === 'creator-simple-effect-remove' && hookName && Number.isInteger(entryIndex)) {
            runCreatorHookMutation(entityType, scope, dataset, (hooks) => {
                const entries = Array.isArray(hooks[hookName]) ? hooks[hookName] : [];
                entries.splice(entryIndex, 1);
                if (!entries.length) {
                    delete hooks[hookName];
                } else {
                    hooks[hookName] = entries;
                }
            });
            renderCreatorScreen();
            return true;
        }

        if (action === 'creator-hook-add-condition' && hookName && Number.isInteger(entryIndex)) {
            runCreatorHookEntryMutation(entityType, scope, dataset, (entry) => {
                if (!creatorUi?.isHookBlock(entry)) {
                    return;
                }
                entry.conditions = Array.isArray(entry.conditions) ? entry.conditions : [];
                entry.conditions.push({ type: 'always' });
            });
            renderCreatorScreen();
            return true;
        }

        if (action === 'creator-hook-remove-condition' && hookName && Number.isInteger(entryIndex)) {
            const condIndex = Number(dataset.conditionIndex);
            if (!Number.isInteger(condIndex)) {
                return false;
            }
            runCreatorHookEntryMutation(entityType, scope, dataset, (entry) => {
                if (!creatorUi?.isHookBlock(entry)) {
                    return;
                }
                entry.conditions = Array.isArray(entry.conditions) ? entry.conditions : [];
                entry.conditions.splice(condIndex, 1);
            });
            renderCreatorScreen();
            return true;
        }

        if (action === 'creator-hook-add-action' && hookName && Number.isInteger(entryIndex)) {
            runCreatorHookEntryMutation(entityType, scope, dataset, (entry, hooks) => {
                if (creatorUi?.isHookBlock(entry)) {
                    entry.actions = Array.isArray(entry.actions) ? entry.actions : [];
                    entry.actions.push({
                        type: 'applyStatus',
                        target: 'opponent',
                        statusId: '',
                        potency: 1,
                        count: 1,
                    });
                    return;
                }
                const entries = Array.isArray(hooks[hookName]) ? hooks[hookName] : [];
                entries[entryIndex] = {
                    id: `${hookName}_block`,
                    conditions: [{ type: 'always' }],
                    actions: [entry, {
                        type: 'applyStatus',
                        target: 'opponent',
                        statusId: '',
                        potency: 1,
                        count: 1,
                    }],
                };
                hooks[hookName] = entries;
            });
            renderCreatorScreen();
            return true;
        }

        if (action === 'creator-hook-remove-action' && hookName && Number.isInteger(entryIndex)) {
            const actionIndex = Number(dataset.actionIndex);
            if (!Number.isInteger(actionIndex)) {
                return false;
            }
            runCreatorHookEntryMutation(entityType, scope, dataset, (entry) => {
                if (!creatorUi?.isHookBlock(entry)) {
                    return;
                }
                entry.actions = Array.isArray(entry.actions) ? entry.actions : [];
                entry.actions.splice(actionIndex, 1);
            });
            renderCreatorScreen();
            return true;
        }

        return false;
    }

    function setCreatorMessage(type, text) {
        state.creatorMessage = text
            ? { type, text }
            : null;
    }

    function getCreatorWorkshopManifest(existingManifest = null) {
        const next = existingManifest && typeof existingManifest === 'object' && !Array.isArray(existingManifest)
            ? { ...existingManifest }
            : {};
        next.id = typeof next.id === 'string' && next.id ? next.id : 'creator-workshop';
        next.name = typeof next.name === 'string' && next.name ? next.name : 'Creator Workshop';
        next.version = typeof next.version === 'string' && next.version ? next.version : '0.1.0';
        next.engineVersion = typeof next.engineVersion === 'string' && next.engineVersion ? next.engineVersion : 'dev';
        next.description = typeof next.description === 'string' && next.description ? next.description : 'Locally authored content saved from the Creator UI.';
        next.authors = Array.isArray(next.authors) ? next.authors : [];
        next.dependencies = Array.isArray(next.dependencies) ? next.dependencies : [];
        next.featureFlags = next.featureFlags && typeof next.featureFlags === 'object' && !Array.isArray(next.featureFlags)
            ? next.featureFlags
            : {};
        return next;
    }

    function upsertPackEntry(list, entry) {
        const items = Array.isArray(list) ? list.slice() : [];
        const id = entry?.id;
        if (!id) {
            return items;
        }
        const index = items.findIndex((candidate) => candidate?.id === id);
        if (index >= 0) {
            items[index] = entry;
            return items;
        }
        items.push(entry);
        return items;
    }

    async function saveCreatorJsonToWorkshop(entityType) {
        const raw = String(state.creatorJsonInput || '').trim();
        if (!raw) {
            setCreatorMessage('error', 'Paste JSON first.');
            renderCreatorScreen();
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            setCreatorMessage('error', `Invalid JSON: ${error?.message || error}`);
            renderCreatorScreen();
            return;
        }

        try {
            await ensureBattleModuleLoaded();
            const api = getBattleContentApi();
            const workshopId = 'creator-workshop';
            const existingWorkshop = typeof api.exportInstalledContentPack === 'function'
                ? (() => {
                    try {
                        return api.exportInstalledContentPack(workshopId);
                    } catch {
                        return null;
                    }
                })()
                : null;
            const manifest = getCreatorWorkshopManifest(existingWorkshop?.manifest);
            const nextPack = {
                manifest,
                statuses: Array.isArray(existingWorkshop?.statuses) ? existingWorkshop.statuses.slice() : [],
                units: Array.isArray(existingWorkshop?.units) ? existingWorkshop.units.slice() : [],
                battles: Array.isArray(existingWorkshop?.battles) ? existingWorkshop.battles.slice() : [],
            };

            if (entityType === 'status') {
                nextPack.statuses = upsertPackEntry(nextPack.statuses, parsed);
            } else if (entityType === 'unit') {
                nextPack.units = upsertPackEntry(nextPack.units, parsed);
            } else {
                nextPack.battles = upsertPackEntry(nextPack.battles, parsed);
            }

            if (typeof api.installContentPack !== 'function') {
                throw new Error('Content pack installation is not available.');
            }

            const result = api.installContentPack(nextPack, { conflictStrategy: 'overwrite', persist: true, source: 'creator' });
            refreshBattleSelectionState();
            setCreatorMessage('success', `Saved to ${manifest.id}. (${result?.counts?.battles || 0} battles, ${result?.counts?.units || 0} units, ${result?.counts?.statuses || 0} statuses)`);
        } catch (error) {
            setCreatorMessage('error', formatCombatModuleError(error));
        }

        renderCreatorScreen();
    }

    async function validateCreatorJson(entityType) {
        const raw = String(state.creatorJsonInput || '').trim();
        if (!raw) {
            setCreatorMessage('error', 'Paste JSON first.');
            renderCreatorScreen();
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            setCreatorMessage('error', `Invalid JSON: ${error?.message || error}`);
            renderCreatorScreen();
            return;
        }
        try {
            await ensureBattleModuleLoaded();
            const api = getBattleContentApi();
            if (entityType === 'status') {
                const result = typeof api.validateStatusDefinition === 'function'
                    ? api.validateStatusDefinition(parsed)
                    : { errors: [] };
                if (result.errors?.length) {
                    throw new Error(result.errors.join('\n'));
                }
            } else if (entityType === 'unit') {
                const result = typeof api.validateUnitDefinition === 'function'
                    ? api.validateUnitDefinition(parsed)
                    : { errors: [] };
                if (result.errors?.length) {
                    throw new Error(result.errors.join('\n'));
                }
            } else {
                const result = typeof api.validateBattleDefinition === 'function'
                    ? api.validateBattleDefinition(parsed)
                    : { errors: [] };
                if (result.errors?.length) {
                    const formatter = getSchemaApi()?.formatBattleDefinitionErrors;
                    throw new Error(typeof formatter === 'function' ? formatter(result.errors) : result.errors.join('\n'));
                }
            }
            setCreatorMessage('success', 'Validation passed.');
        } catch (error) {
            setCreatorMessage('error', formatCombatModuleError(error));
        }
        renderCreatorScreen();
    }

    async function playtestCreatorBattle() {
        const raw = String(state.creatorJsonInput || '').trim();
        if (!raw) {
            setCreatorMessage('error', 'Paste battle JSON first.');
            renderCreatorScreen();
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            setCreatorMessage('error', `Invalid JSON: ${error?.message || error}`);
            renderCreatorScreen();
            return;
        }

        try {
            await ensureBattleModuleLoaded();
            const api = getBattleContentApi();
            if (typeof api.registerBattleDefinition !== 'function') {
                throw new Error('Battle registry is not available.');
            }
            api.registerBattleDefinition(parsed, { allowOverwrite: true });
            refreshBattleSelectionState();
            state.selectedBattleId = parsed.id;
            state.activeScreen = 'combat';
            syncPanelState();
            await initializeBattleHandler(parsed.id);
        } catch (error) {
            setCreatorMessage('error', formatCombatModuleError(error));
            renderCreatorScreen();
        }
    }

    function getCreatorListEntries(entityType) {
        const api = getBattleContentApi();
        if (entityType === 'unit') {
            return typeof api.listUnitDefinitions === 'function' ? api.listUnitDefinitions() : [];
        }
        if (entityType === 'status') {
            const registry = getRegistryApi();
            return typeof registry?.listStatusDefinitions === 'function' ? registry.listStatusDefinitions() : [];
        }
        return typeof api.listBattleDefinitions === 'function' ? api.listBattleDefinitions() : [];
    }

    function getCreatorEntityDefinition(entityType, id) {
        const api = getBattleContentApi();
        if (!id) {
            return null;
        }
        if (entityType === 'unit') {
            return typeof api.getUnitDefinition === 'function' ? api.getUnitDefinition(id) : null;
        }
        if (entityType === 'status') {
            const registry = getRegistryApi();
            return typeof registry?.getStatusDefinition === 'function' ? registry.getStatusDefinition(id) : null;
        }
        return typeof api.getBattleDefinition === 'function' ? api.getBattleDefinition(id) : null;
    }


    function createDefaultStatusDefinition() {
        return {
            id: 'new_status',
            name: 'New Status',
            label: 'New Status',
            description: 'Describe what this status does.',
            iconPath: '',
            countOnly: false,
            tags: [],
            stackModel: {
                potency: { enabled: true, min: 0, max: 99, application: 'add' },
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {
                turnEnd: [
                    {
                        type: 'adjustStatus',
                        target: 'self',
                        statusId: 'new_status',
                        countDelta: -1,
                    },
                ],
            },
        };
    }

    function createDefaultUnitDefinition() {
        const sinKeys = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
        const sinResistances = Object.fromEntries(sinKeys.map((key) => [key, 1]));
        return {
            id: 'new-unit',
            name: 'New Unit',
            level: 1,
            maxHp: 100,
            sp: 0,
            speedRange: [1, 1],
            defenseLevel: 0,
            staggerThresholds: [],
            resistances: {
                physical: {
                    slash: 1,
                    pierce: 1,
                    blunt: 1,
                },
                sin: sinResistances,
            },
            passives: [],
            sprites: {
                idle: '',
                moving: '',
                hurt: '',
                guard: '',
                evade: '',
                skills: {},
            },
            skills: [],
        };
    }

    function getCreatorParsedJsonOrNull() {
        const raw = String(state.creatorJsonInput || '').trim();
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function normalizeNumberInput(value, fallback) {
        const trimmed = String(value ?? '').trim();
        if (!trimmed) {
            return fallback;
        }
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function normalizeStringInput(value, fallback = '') {
        const trimmed = String(value ?? '').trim();
        return trimmed ? trimmed : fallback;
    }

    function resolveCreatorSpriteUrl(value) {
        const path = String(value || '').trim();
        if (!path) {
            return '';
        }
        if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        if (path.startsWith('assets/')) {
            return resolveExtensionUrl(path);
        }
        return path;
    }

    function getStatusEditorViewModel(parsedEditorJson) {
        const draft = normalizeCreatorDraft('status', parsedEditorJson);
        const stack = draft.stackModel && typeof draft.stackModel === 'object' ? draft.stackModel : {};
        return {
            draft,
            potency: stack.potency && typeof stack.potency === 'object' ? stack.potency : {},
            count: stack.count && typeof stack.count === 'object' ? stack.count : {},
            expireWhen: stack.expireWhen && typeof stack.expireWhen === 'object' ? stack.expireWhen : {},
        };
    }

    function renderCreatorScreen() {
        if (!elements.creatorContent) {
            return;
        }

        const api = getBattleContentApi();
        const installedPacks = typeof api.listInstalledContentPacks === 'function'
            ? api.listInstalledContentPacks()
            : [];
        const message = state.creatorMessage?.text || '';
        const messageStyles = state.creatorMessage?.type === 'error'
            ? 'background: rgba(120, 24, 24, 0.58); border: 1px solid rgba(255, 110, 110, 0.4);'
            : 'background: rgba(24, 120, 70, 0.42); border: 1px solid rgba(120, 255, 170, 0.35);';
        const tab = state.creatorTab;
        const entityType = state.creatorEntityType;

        const tabButton = (id, label) => `
            <button
                class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost"
                type="button"
                data-action="creator-tab"
                data-tab="${id}"
                style="${tab === id ? 'outline: 2px solid rgba(255,255,255,0.55);' : ''}"
            >${escapeHtml(label)}</button>
        `;

        const typeButton = (id, label) => `
            <button
                class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost"
                type="button"
                data-action="creator-type"
                data-type="${id}"
                style="${entityType === id ? 'outline: 2px solid rgba(255,255,255,0.55);' : ''}"
            >${escapeHtml(label)}</button>
        `;

        const listEntries = (tab === 'library')
            ? installedPacks.map((pack) => `
                <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 0.55rem; align-items: center;">
                    <span class="echoes-battle-panel__combat-pill">${escapeHtml(`${pack.name} (${pack.id})${pack.version ? ` v${pack.version}` : ''}`)}</span>
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-export-pack" data-pack-id="${escapeHtml(pack.id)}">Export</button>
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-uninstall-pack" data-pack-id="${escapeHtml(pack.id)}">Uninstall</button>
                </div>
            `).join('')
            : getCreatorListEntries(entityType).map((entry) => `
                <button
                    class="echoes-battle-panel__combat-button"
                    type="button"
                    data-action="creator-select-entity"
                    data-entity-type="${escapeHtml(entityType)}"
                    data-entity-id="${escapeHtml(entry.id)}"
                    style="justify-content: space-between; ${entry.id === state.creatorSelectedId ? 'outline: 2px solid rgba(255,255,255,0.55);' : ''}"
                >
                    <span>${escapeHtml(entry.name || entry.label || entry.id)}</span>
                    <span class="echoes-battle-panel__combat-pill">${escapeHtml(entry.id)}</span>
                </button>
            `).join('');

        const catalog = getCreatorCatalog();
        const creatorUi = getCreatorUi();
        const parsedEditorJson = (entityType === 'unit' || entityType === 'status') ? getCreatorParsedJsonOrNull() : null;
        const unitDraft = entityType === 'unit' ? normalizeCreatorDraft('unit', parsedEditorJson) : null;
        const statusView = entityType === 'status' ? getStatusEditorViewModel(parsedEditorJson) : null;
        const unitSprites = unitDraft?.sprites && typeof unitDraft.sprites === 'object' && !Array.isArray(unitDraft.sprites) ? unitDraft.sprites : {};
        const unitSkillSprites = unitSprites.skills && typeof unitSprites.skills === 'object' && !Array.isArray(unitSprites.skills) ? unitSprites.skills : {};
        const unitPassives = Array.isArray(unitDraft?.passives) ? unitDraft.passives : [];
        const unitSkills = Array.isArray(unitDraft?.skills) ? unitDraft.skills : [];
        const statusTemplates = creatorUi?.STATUS_TEMPLATES || [];
        const statusTags = Array.isArray(statusView?.draft?.tags) ? statusView.draft.tags.join(', ') : '';

        const renderEnumSelect = (options, selected, fieldAttrs) => {
            const opts = creatorUi?.buildSelectOptions(options, selected, escapeAttribute) || options.map((entry) => {
                const value = typeof entry === 'string' ? entry : entry.value;
                const label = typeof entry === 'string' ? entry : entry.label;
                return `<option value="${escapeAttribute(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
            }).join('');
            return `<select ${fieldAttrs} style="width:100%;">${opts}</select>`;
        };

        const unitEditorMarkup = tab === 'editor' && entityType === 'unit'
            ? `
                <div class="echoes-creator" style="display: grid; gap: 0.85rem;">
                    <div style="display: flex; flex-wrap: wrap; gap: 0.55rem;">
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-unit-new">New Unit</button>
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-validate">Validate</button>
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-save-workshop">Save to Workshop</button>
                    </div>

                    <p class="echoes-creator__hint">Skills and passives use the same visual builder: pick WHEN it runs, optional IF conditions, then what it DOES.</p>

                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem;">
                        <div style="display: grid; gap: 0.45rem;">
                            <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Id</label>
                            <input data-action="creator-unit-field" data-field="id" value="${escapeAttribute(String(unitDraft?.id || ''))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                        </div>
                        <div style="display: grid; gap: 0.45rem;">
                            <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Name</label>
                            <input data-action="creator-unit-field" data-field="name" value="${escapeAttribute(String(unitDraft?.name || ''))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                        </div>
                        <div style="display: grid; gap: 0.45rem;">
                            <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Level</label>
                            <input data-action="creator-unit-field" data-field="level" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.level ?? 1))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                        </div>
                        <div style="display: grid; gap: 0.45rem;">
                            <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Max HP</label>
                            <input data-action="creator-unit-field" data-field="maxHp" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.maxHp ?? 100))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                        </div>
                        <div style="display: grid; gap: 0.45rem;">
                            <label class="echoes-battle-panel__planner-empty" style="text-align:left;">SP</label>
                            <input data-action="creator-unit-field" data-field="sp" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.sp ?? 0))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                        </div>
                        <div style="display: grid; gap: 0.45rem;">
                            <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Defense Level</label>
                            <input data-action="creator-unit-field" data-field="defenseLevel" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.defenseLevel ?? 0))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem;">
                        <div style="display: grid; gap: 0.45rem;">
                            <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Speed Min</label>
                            <input data-action="creator-unit-speed" data-index="0" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.speedRange?.[0] ?? 1))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                        </div>
                        <div style="display: grid; gap: 0.45rem;">
                            <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Speed Max</label>
                            <input data-action="creator-unit-speed" data-index="1" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.speedRange?.[1] ?? 1))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                        </div>
                    </div>

                    <details open>
                        <summary class="echoes-battle-panel__combat-pill" style="cursor:pointer;">Sprites</summary>
                        <div style="display: grid; gap: 0.75rem; margin-top: 0.75rem;">
                            ${['idle', 'moving', 'hurt', 'guard', 'evade'].map((key) => `
                                <div style="display: grid; grid-template-columns: 7rem minmax(0, 1fr) auto; gap: 0.55rem; align-items: center;">
                                    <span class="echoes-battle-panel__planner-empty" style="text-align:left;">${escapeHtml(key)}</span>
                                    <input data-action="creator-unit-sprite" data-sprite-key="${escapeAttribute(key)}" value="${escapeAttribute(String(unitSprites?.[key] || ''))}" placeholder="assets/... or URL or data:" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                                    <input type="file" accept="image/*" data-action="creator-upload-sprite" data-sprite-key="${escapeAttribute(key)}" style="max-width: 14rem;" />
                                </div>
                                ${unitSprites?.[key] ? `<img src="${escapeAttribute(resolveCreatorSpriteUrl(unitSprites[key]))}" alt="${escapeAttribute(key)}" style="max-height: 7rem; max-width: 100%; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.2); padding: 0.35rem;" />` : ''}
                            `).join('')}

                            <details>
                                <summary class="echoes-battle-panel__planner-empty" style="cursor:pointer; text-align:left;">Skill sprites</summary>
                                <div style="display: grid; gap: 0.55rem; margin-top: 0.65rem;">
                                    ${unitSkills.map((skill) => {
                                        const skillId = skill?.id || '';
                                        if (!skillId) {
                                            return '';
                                        }
                                        const spriteValue = unitSkillSprites?.[skillId] || '';
                                        return `
                                            <div style="display: grid; grid-template-columns: 1fr minmax(0, 1.2fr) auto auto; gap: 0.55rem; align-items: center;">
                                                <span class="echoes-battle-panel__combat-pill">${escapeHtml(skillId)}</span>
                                                <input data-action="creator-unit-skill-sprite" data-skill-id="${escapeAttribute(skillId)}" value="${escapeAttribute(String(spriteValue))}" placeholder="assets/... or URL or data:" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                                                <input type="file" accept="image/*" data-action="creator-upload-skill-sprite" data-skill-id="${escapeAttribute(skillId)}" style="max-width: 14rem;" />
                                                <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-clear-skill-sprite" data-skill-id="${escapeAttribute(skillId)}">Clear</button>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </details>
                        </div>
                    </details>

                    <details open>
                        <summary class="echoes-battle-panel__combat-pill" style="cursor:pointer;">Passives</summary>
                        <div style="display: grid; gap: 0.75rem; margin-top: 0.75rem;">
                            <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-unit-add-passive">Add Passive</button>
                            ${unitPassives.length
                                ? unitPassives.map((passive, index) => `
                                    <details>
                                        <summary class="echoes-battle-panel__planner-empty" style="cursor:pointer; text-align:left;">
                                            ${escapeHtml(passive?.name || passive?.id || `Passive ${index + 1}`)}
                                        </summary>
                                        <div style="display: grid; gap: 0.55rem; margin-top: 0.65rem;">
                                            <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem;">
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Id</label>
                                                    <input data-action="creator-unit-passive-field" data-index="${index}" data-field="id" value="${escapeAttribute(String(passive?.id || ''))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                                                </div>
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Name</label>
                                                    <input data-action="creator-unit-passive-field" data-index="${index}" data-field="name" value="${escapeAttribute(String(passive?.name || ''))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                                                </div>
                                            </div>
                                            <div style="display:grid; gap: 0.35rem;">
                                                <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Description</label>
                                                <textarea data-action="creator-unit-passive-field" data-index="${index}" data-field="description" rows="2" style="width:100%; resize: vertical; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.65rem; font: inherit; line-height:1.35;">${escapeHtml(String(passive?.description || ''))}</textarea>
                                            </div>
                                            <div class="echoes-creator__section">
                                                <div class="echoes-creator__section-title">Behavior (WHEN → IF → DO)</div>
                                                ${creatorUi?.renderHooksEditor(
                                                    passive?.hooks || {},
                                                    catalog,
                                                    escapeAttribute,
                                                    escapeHtml,
                                                    `data-creator-scope="unit-passive" data-passive-index="${index}"`,
                                                ) || '<span class="echoes-creator__hint">Creator UI module not loaded.</span>'}
                                            </div>
                                            <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-remove-passive" data-index="${index}">Remove Passive</button>
                                        </div>
                                    </details>
                                `).join('')
                                : '<span class="echoes-battle-panel__planner-empty" style="text-align:left;">No passives yet.</span>'}
                        </div>
                    </details>

                    <details open>
                        <summary class="echoes-battle-panel__combat-pill" style="cursor:pointer;">Skills</summary>
                        <div style="display: grid; gap: 0.75rem; margin-top: 0.75rem;">
                            <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-unit-add-skill">Add Skill</button>
                            ${unitSkills.length
                                ? unitSkills.map((skill, index) => `
                                    <details>
                                        <summary class="echoes-battle-panel__planner-empty" style="cursor:pointer; text-align:left;">
                                            ${escapeHtml(skill?.name || skill?.id || `Skill ${index + 1}`)}
                                        </summary>
                                        <div style="display:grid; gap: 0.55rem; margin-top: 0.65rem;">
                                            <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem;">
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Id</label>
                                                    <input data-action="creator-unit-skill-field" data-index="${index}" data-field="id" value="${escapeAttribute(String(skill?.id || ''))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                                                </div>
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Name</label>
                                                    <input data-action="creator-unit-skill-field" data-index="${index}" data-field="name" value="${escapeAttribute(String(skill?.name || ''))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                                                </div>
                                            </div>
                                            <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.55rem;">
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Base</label>
                                                    <input data-action="creator-unit-skill-field" data-index="${index}" data-field="basePower" inputmode="numeric" value="${escapeAttribute(String(skill?.basePower ?? 0))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                                                </div>
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Coin</label>
                                                    <input data-action="creator-unit-skill-field" data-index="${index}" data-field="coinPower" inputmode="numeric" value="${escapeAttribute(String(skill?.coinPower ?? 0))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                                                </div>
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Coins</label>
                                                    <input data-action="creator-unit-skill-field" data-index="${index}" data-field="coinCount" inputmode="numeric" value="${escapeAttribute(String(skill?.coinCount ?? 1))}" style="width:100%; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;" />
                                                </div>
                                            </div>
                                            <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.55rem;">
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Type</label>
                                                    ${renderEnumSelect(catalog.skillTypes, skill?.skillType || 'attack', `data-action="creator-unit-skill-field" data-index="${index}" data-field="skillType"`)}
                                                </div>
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Damage</label>
                                                    ${renderEnumSelect(catalog.damageTypes, skill?.damageType || 'slash', `data-action="creator-unit-skill-field" data-index="${index}" data-field="damageType"`)}
                                                </div>
                                                <div style="display:grid; gap: 0.35rem;">
                                                    <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Sin</label>
                                                    ${renderEnumSelect(catalog.sinTypes, skill?.sinType || 'wrath', `data-action="creator-unit-skill-field" data-index="${index}" data-field="sinType"`)}
                                                </div>
                                            </div>
                                            <div style="display:grid; gap: 0.35rem;">
                                                <label class="echoes-battle-panel__planner-empty" style="text-align:left;">Description</label>
                                                <textarea data-action="creator-unit-skill-field" data-index="${index}" data-field="description" rows="2" style="width:100%; resize: vertical; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.65rem; font: inherit; line-height:1.35;">${escapeHtml(String(skill?.description || ''))}</textarea>
                                            </div>
                                            <div class="echoes-creator__section">
                                                <div class="echoes-creator__section-title">Skill effects</div>
                                                <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-skill-add-effect" data-index="${index}">+ Add effect</button>
                                                <div style="display:grid; gap: 0.75rem; margin-top: 0.55rem;">
                                                    ${(Array.isArray(skill?.effects) ? skill.effects : []).map((effect, effectIndex) => (
                                                        creatorUi?.renderSkillEffectEditor(effect, effectIndex, index, catalog, escapeAttribute, escapeHtml) || ''
                                                    )).join('')}
                                                </div>
                                            </div>
                                            <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-remove-skill" data-index="${index}">Remove Skill</button>
                                        </div>
                                    </details>
                                `).join('')
                                : '<span class="echoes-battle-panel__planner-empty" style="text-align:left;">No skills yet.</span>'}
                        </div>
                    </details>

                    <details>
                        <summary class="echoes-battle-panel__planner-empty" style="cursor:pointer; text-align:left;">Raw JSON</summary>
                        <textarea
                            data-action="creator-json-input"
                            rows="14"
                            style="width: 100%; resize: vertical; border: 1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.65rem; font: inherit; line-height: 1.35; margin-top: 0.65rem;"
                            placeholder='Paste a unit JSON object here...'
                        >${escapeHtml(state.creatorJsonInput || '')}</textarea>
                    </details>
                </div>
            `
            : '';

        const statusEditorMarkup = tab === 'editor' && entityType === 'status'
            ? `
                <div class="echoes-creator" style="display: grid; gap: 0.85rem;">
                    <div style="display: flex; flex-wrap: wrap; gap: 0.55rem; align-items: center;">
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-status-new">New Status</button>
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-validate">Validate</button>
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-save-workshop">Save to Workshop</button>
                        <select data-action="creator-status-template-pick" style="min-width: 14rem; border:1px solid rgba(255,255,255,0.18); background: rgba(8,10,14,0.72); color: rgba(255,255,255,0.92); padding: 0.55rem; font: inherit;">
                            <option value="">— Start from template —</option>
                            ${statusTemplates.map((template) => `<option value="${escapeAttribute(template.id)}">${escapeHtml(template.label)}</option>`).join('')}
                        </select>
                        <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-status-apply-template">Use Template</button>
                    </div>

                    <p class="echoes-creator__hint">Build status effects visually: pick when they trigger, add conditions, then choose what happens. No JSON required.</p>

                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem;">
                        <div class="echoes-creator__field-row">
                            <label>Id</label>
                            <input data-action="creator-status-field" data-field="id" value="${escapeAttribute(String(statusView?.draft?.id || ''))}" />
                        </div>
                        <div class="echoes-creator__field-row">
                            <label>Display name</label>
                            <input data-action="creator-status-field" data-field="name" value="${escapeAttribute(String(statusView?.draft?.name || statusView?.draft?.label || ''))}" />
                        </div>
                        <div class="echoes-creator__field-row">
                            <label>Label (UI)</label>
                            <input data-action="creator-status-field" data-field="label" value="${escapeAttribute(String(statusView?.draft?.label || ''))}" />
                        </div>
                        <div class="echoes-creator__field-row">
                            <label>Icon path</label>
                            <input data-action="creator-status-field" data-field="iconPath" value="${escapeAttribute(String(statusView?.draft?.iconPath || ''))}" placeholder="assets/statuseffects/..." />
                        </div>
                    </div>

                    <div class="echoes-creator__field-row">
                        <label>Description (shown to players)</label>
                        <textarea data-action="creator-status-field" data-field="description" rows="2">${escapeHtml(String(statusView?.draft?.description || ''))}</textarea>
                    </div>

                    <div class="echoes-creator__field-row">
                        <label>Tags (comma separated)</label>
                        <input data-action="creator-status-tags" value="${escapeAttribute(statusTags)}" placeholder="buff, custom, damage" />
                    </div>

                    <details open>
                        <summary class="echoes-battle-panel__combat-pill" style="cursor:pointer;">Stack rules</summary>
                        <div style="display:grid; gap:0.75rem; margin-top:0.75rem;">
                            <label class="echoes-creator__checkbox">
                                <input type="checkbox" data-action="creator-status-count-only" ${statusView?.draft?.countOnly ? 'checked' : ''} />
                                Count only (no potency — like Damage Up)
                            </label>
                            <div style="display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:0.75rem;">
                                <fieldset class="echoes-creator__fieldset">
                                    <legend>Potency</legend>
                                    <label class="echoes-creator__checkbox">
                                        <input type="checkbox" data-action="creator-status-stack-toggle" data-bucket="potency" ${statusView?.potency?.enabled ? 'checked' : ''} />
                                        Use potency
                                    </label>
                                    <div class="echoes-creator__field-row echoes-creator__field-row--2">
                                        <input data-action="creator-status-stack-field" data-bucket="potency" data-field="min" inputmode="numeric" value="${escapeAttribute(String(statusView?.potency?.min ?? 0))}" placeholder="Min" />
                                        <input data-action="creator-status-stack-field" data-bucket="potency" data-field="max" inputmode="numeric" value="${escapeAttribute(String(statusView?.potency?.max ?? 99))}" placeholder="Max" />
                                    </div>
                                </fieldset>
                                <fieldset class="echoes-creator__fieldset">
                                    <legend>Count</legend>
                                    <label class="echoes-creator__checkbox">
                                        <input type="checkbox" data-action="creator-status-stack-toggle" data-bucket="count" ${statusView?.count?.enabled ? 'checked' : ''} />
                                        Use count
                                    </label>
                                    <div class="echoes-creator__field-row echoes-creator__field-row--2">
                                        <input data-action="creator-status-stack-field" data-bucket="count" data-field="min" inputmode="numeric" value="${escapeAttribute(String(statusView?.count?.min ?? 0))}" placeholder="Min" />
                                        <input data-action="creator-status-stack-field" data-bucket="count" data-field="max" inputmode="numeric" value="${escapeAttribute(String(statusView?.count?.max ?? 99))}" placeholder="Max" />
                                    </div>
                                </fieldset>
                            </div>
                            <label class="echoes-creator__checkbox">
                                <input type="checkbox" data-action="creator-status-expire-count" ${statusView?.expireWhen?.countLte != null ? 'checked' : ''} />
                                Expire when count reaches 0
                            </label>
                        </div>
                    </details>

                    <details open>
                        <summary class="echoes-battle-panel__combat-pill" style="cursor:pointer;">Behavior (WHEN → IF → DO)</summary>
                        <div style="margin-top:0.75rem;">
                            ${creatorUi?.renderHooksEditor(
                                statusView?.draft?.hooks || {},
                                catalog,
                                escapeAttribute,
                                escapeHtml,
                                'data-creator-scope="status"',
                            ) || '<span class="echoes-creator__hint">Creator UI module not loaded.</span>'}
                        </div>
                    </details>

                    <details>
                        <summary class="echoes-battle-panel__planner-empty" style="cursor:pointer; text-align:left;">Advanced JSON</summary>
                        <textarea data-action="creator-json-input" rows="12" class="echoes-creator__raw-json" style="margin-top:0.65rem;">${escapeHtml(state.creatorJsonInput || '')}</textarea>
                    </details>
                </div>
            `
            : '';

        const editorControls = tab === 'library'
            ? `
                <div class="echoes-battle-panel__planner-empty" style="text-align: left;">
                    Installed packs are persisted locally. Use Export to download the data-only JSON payload, or Uninstall to remove it.
                </div>
            `
            : `
                <div style="display: flex; flex-wrap: wrap; gap: 0.55rem;">
                    <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-validate">Validate</button>
                    <button class="echoes-battle-panel__combat-button" type="button" data-action="creator-save-workshop">Save to Workshop</button>
                    ${entityType === 'battle' ? '<button class="echoes-battle-panel__combat-button" type="button" data-action="creator-playtest">Playtest</button>' : ''}
                </div>
                ${entityType === 'unit' ? unitEditorMarkup : ''}
                ${entityType === 'status' ? statusEditorMarkup : ''}
                ${entityType === 'battle' ? `
                    <textarea
                        data-action="creator-json-input"
                        rows="12"
                        class="echoes-creator__raw-json"
                        placeholder='Paste a battle JSON object here...'
                    >${escapeHtml(state.creatorJsonInput || '')}</textarea>
                ` : ''}
            `;

        elements.creatorContent.innerHTML = `
            <div class="echoes-battle-panel__combat-debug">
                <div class="echoes-battle-panel__combat-toolbar">
                    <div class="echoes-battle-panel__combat-pills">
                        <span class="echoes-battle-panel__combat-pill">Creator</span>
                        <span class="echoes-battle-panel__combat-pill">${escapeHtml(tab === 'library' ? 'Content Library' : 'Editor')}</span>
                    </div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.55rem;">
                    ${tabButton('library', 'Library')}
                    ${tabButton('editor', 'Editor')}
                </div>
                ${tab === 'editor'
                    ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 0.55rem;">
                            ${typeButton('battle', 'Battles')}
                            ${typeButton('unit', 'Units')}
                            ${typeButton('status', 'Statuses')}
                        </div>
                    `
                    : ''}
                <div style="display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.75rem; height: 100%;">
                    <div style="display: grid; gap: 0.55rem; max-height: 12.5rem; overflow: auto; padding-right: 0.35rem;">
                        ${listEntries || '<span class="echoes-battle-panel__planner-empty">None</span>'}
                    </div>
                    ${editorControls}
                    ${message ? `<div style="padding: 0.65rem 0.75rem; color: rgba(255,255,255,0.92); white-space: pre-wrap; ${messageStyles}">${escapeHtml(message)}</div>` : ''}
                </div>
            </div>
        `;
    }

    async function prepareBattleSelection() {
        if (state.battleSelectionPromise) {
            return state.battleSelectionPromise;
        }

        state.battleSelectionPromise = (async () => {
            await ensureBattleModuleLoaded();
            const api = getBattleContentApi();
            if (typeof api.loadPersistedContentPacks === 'function') {
                api.loadPersistedContentPacks();
            }
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

        const api = getBattleContentApi();
        const selectedBattle = state.availableBattles.find((battle) => battle.id === state.selectedBattleId) || state.availableBattles[0];
        const installedPacks = typeof api.listInstalledContentPacks === 'function'
            ? api.listInstalledContentPacks()
            : [];
        const installedPackSummary = installedPacks.length
            ? `Installed packs: ${installedPacks.length}`
            : 'No installed packs';
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
                ${selectedBattle && !selectedBattle.isDebug
                    ? `
                        <div style="margin-top: 0.8rem; display: flex; justify-content: center;">
                            <label class="echoes-battle-panel__planner-empty" style="display: inline-flex; gap: 0.55rem; align-items: center; cursor: pointer;">
                                <input type="checkbox" data-action="toggle-debug-tools" ${state.battleDebugToolsEnabled ? 'checked' : ''} />
                                <span>Enable Debug Tools</span>
                            </label>
                        </div>
                    `
                    : ''}
                <div style="margin-top: 1rem; display: grid; gap: 0.55rem; text-align: left;">
                    <div class="echoes-battle-panel__planner-empty" style="text-align: left;">
                        Import a battle, unit, status, or a full content pack JSON object. Export the selected battle by itself or as a reusable dependency pack.
                    </div>
                    <div class="echoes-battle-panel__planner-empty" style="text-align: left;">
                        Data-only JSON packs are persisted locally after import. Trusted JavaScript packs live under battle/content/packs/user/ and run code.
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.55rem; align-items: center;">
                        <span class="echoes-battle-panel__combat-pill">${escapeHtml(installedPackSummary)}</span>
                        <button class="echoes-battle-panel__combat-button" type="button" data-action="clear-installed-packs" ${installedPacks.length ? '' : 'disabled'}>Clear Installed Packs</button>
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
                enableDebugTools: Boolean(state.battleDebugToolsEnabled),
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

        if (action === 'clear-installed-packs') {
            const api = getBattleContentApi();
            if (typeof api.clearInstalledContentPacks === 'function') {
                api.clearInstalledContentPacks();
                refreshBattleSelectionState();
                setContentImportMessage('success', 'Cleared installed content packs.');
                renderBattleStartScreen();
                return;
            }
        }

        state.battleHandler?.handleClick(event);
    }

    function handleCombatContentChange(event) {
        const textarea = event.target.closest('[data-action="content-json-input"]');
        if (textarea) {
            state.contentJsonInput = textarea.value || '';
            return;
        }

        const debugToggle = event.target.closest('[data-action="toggle-debug-tools"]');
        if (debugToggle) {
            state.battleDebugToolsEnabled = Boolean(debugToggle.checked);
            persistBooleanSetting(BATTLE_DEBUG_TOOLS_STORAGE_KEY, state.battleDebugToolsEnabled);
            renderBattleStartScreen();
            return;
        }

        state.battleHandler?.handleChange?.(event);
    }

    async function handleCreatorContentClick(event) {
        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) {
            return;
        }
        const { action } = actionTarget.dataset;

        if (handleCreatorHookClick(action, actionTarget)) {
            return;
        }

        if (action === 'creator-status-new') {
            updateCreatorStatusJson((draft) => {
                const next = getCreatorUi()?.createDefaultStatusDefinition?.() || { id: 'new-status', label: 'New Status', hooks: {} };
                Object.keys(draft).forEach((key) => delete draft[key]);
                Object.assign(draft, next);
            });
            setCreatorMessage('success', 'Created a new status draft.');
            renderCreatorScreen();
            return;
        }

        if (action === 'creator-status-apply-template') {
            const pick = elements.creatorContent?.querySelector('[data-action="creator-status-template-pick"]');
            const templateId = pick?.value || '';
            const template = getCreatorUi()?.STATUS_TEMPLATES?.find((entry) => entry.id === templateId);
            if (!template) {
                setCreatorMessage('error', 'Pick a template first.');
                renderCreatorScreen();
                return;
            }
            updateCreatorStatusJson((draft) => {
                const next = template.definition();
                Object.keys(draft).forEach((key) => delete draft[key]);
                Object.assign(draft, next);
            });
            setCreatorMessage('success', `Applied template: ${template.label}`);
            renderCreatorScreen();
            return;
        }

        if (action === 'creator-tab') {
            state.creatorTab = actionTarget.dataset.tab || 'library';
            renderCreatorScreen();
            return;
        }

        if (action === 'creator-type') {
            state.creatorEntityType = actionTarget.dataset.type || 'battle';
            state.creatorSelectedId = null;
            state.creatorJsonInput = '';
            renderCreatorScreen();
            return;
        }

        if (action === 'creator-select-entity') {
            const entityType = actionTarget.dataset.entityType || state.creatorEntityType;
            const entityId = actionTarget.dataset.entityId || null;
            state.creatorEntityType = entityType;
            state.creatorSelectedId = entityId;
            await prepareCreatorSelection();
            const definition = getCreatorEntityDefinition(entityType, entityId);
            state.creatorJsonInput = definition ? JSON.stringify(definition, null, 2) : '';
            setCreatorMessage('success', definition ? `Loaded ${entityType} "${entityId}".` : `Missing ${entityType} "${entityId}".`);
            renderCreatorScreen();
            return;
        }

        if (action === 'creator-export-pack') {
            const packId = actionTarget.dataset.packId || null;
            if (!packId) {
                return;
            }
            try {
                await prepareCreatorSelection();
                const api = getBattleContentApi();
                if (typeof api.exportInstalledContentPack !== 'function') {
                    throw new Error('Exporting installed packs is not available.');
                }
                const payload = api.exportInstalledContentPack(packId);
                downloadJsonFile(`${sanitizeDownloadFileName(packId, 'pack')}.json`, payload);
                setCreatorMessage('success', `Exported ${packId}.`);
            } catch (error) {
                setCreatorMessage('error', formatCombatModuleError(error));
            }
            renderCreatorScreen();
            return;
        }

        if (action === 'creator-uninstall-pack') {
            const packId = actionTarget.dataset.packId || null;
            if (!packId) {
                return;
            }
            try {
                await prepareCreatorSelection();
                const api = getBattleContentApi();
                if (typeof api.uninstallContentPack !== 'function') {
                    throw new Error('Uninstall is not available.');
                }
                api.uninstallContentPack(packId);
                refreshBattleSelectionState();
                setCreatorMessage('success', `Uninstalled ${packId}.`);
            } catch (error) {
                setCreatorMessage('error', formatCombatModuleError(error));
            }
            renderCreatorScreen();
            return;
        }

        if (action === 'creator-validate') {
            await validateCreatorJson(state.creatorEntityType);
            return;
        }

        if (action === 'creator-save-workshop') {
            await saveCreatorJsonToWorkshop(state.creatorEntityType);
            return;
        }

        if (action === 'creator-playtest') {
            await playtestCreatorBattle();
        }

        if (action === 'creator-unit-new') {
            updateCreatorUnitJson((draft) => {
                const next = createDefaultUnitDefinition();
                Object.keys(draft).forEach((key) => delete draft[key]);
                Object.assign(draft, next);
            });
            setCreatorMessage('success', 'Created a new unit draft.');
            renderCreatorScreen();
        }

        if (action === 'creator-status-new') {
            updateCreatorStatusJson((draft) => {
                const next = createDefaultStatusDefinition();
                Object.keys(draft).forEach((key) => delete draft[key]);
                Object.assign(draft, next);
            });
            setCreatorMessage('success', 'Created a new status draft.');
            renderCreatorScreen();
        }

        if (action === 'creator-unit-add-passive') {
            updateCreatorUnitJson((draft) => {
                const nextIndex = Array.isArray(draft.passives) ? draft.passives.length + 1 : 1;
                draft.passives = Array.isArray(draft.passives) ? draft.passives : [];
                draft.passives.push({
                    id: `passive_${nextIndex}`,
                    name: `Passive ${nextIndex}`,
                    description: '',
                    hooks: {},
                });
            });
            renderCreatorScreen();
        }

        if (action === 'creator-unit-remove-passive') {
            const index = Number(actionTarget.dataset.index);
            if (Number.isInteger(index)) {
                updateCreatorUnitJson((draft) => {
                    draft.passives = Array.isArray(draft.passives) ? draft.passives : [];
                    draft.passives.splice(index, 1);
                });
                renderCreatorScreen();
            }
            return;
        }

        if (action === 'creator-unit-add-skill') {
            updateCreatorUnitJson((draft) => {
                const nextIndex = Array.isArray(draft.skills) ? draft.skills.length + 1 : 1;
                draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                draft.skills.push({
                    id: `skill_${nextIndex}`,
                    name: `Skill ${nextIndex}`,
                    skillType: 'attack',
                    basePower: 1,
                    coinPower: 0,
                    coinCount: 1,
                    damageType: 'slash',
                    sinType: 'wrath',
                    effects: [],
                    description: '',
                });
            });
            renderCreatorScreen();
        }

        if (action === 'creator-unit-skill-add-effect') {
            const index = Number(actionTarget.dataset.index);
            if (Number.isInteger(index)) {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[index];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    skill.effects = Array.isArray(skill.effects) ? skill.effects : [];
                    skill.effects.push({
                        trigger: 'onHit',
                        type: 'applyStatus',
                        statusId: '',
                        potency: 1,
                        count: 1,
                    });
                });
                renderCreatorScreen();
            }
            return;
        }

        if (action === 'creator-unit-skill-remove-effect') {
            const skillIndex = Number(actionTarget.dataset.skillIndex);
            const effectIndex = Number(actionTarget.dataset.effectIndex);
            if (Number.isInteger(skillIndex) && Number.isInteger(effectIndex)) {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[skillIndex];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    skill.effects = Array.isArray(skill.effects) ? skill.effects : [];
                    skill.effects.splice(effectIndex, 1);
                });
                renderCreatorScreen();
            }
            return;
        }

        if (action === 'creator-unit-remove-skill') {
            const index = Number(actionTarget.dataset.index);
            if (Number.isInteger(index)) {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const removed = draft.skills.splice(index, 1);
                    const removedId = removed?.[0]?.id;
                    if (removedId && draft.sprites?.skills) {
                        delete draft.sprites.skills[removedId];
                    }
                });
                renderCreatorScreen();
            }
        }

        if (action === 'creator-unit-clear-skill-sprite') {
            const skillId = actionTarget.dataset.skillId || null;
            if (skillId) {
                updateCreatorUnitJson((draft) => {
                    draft.sprites = draft.sprites && typeof draft.sprites === 'object' && !Array.isArray(draft.sprites) ? draft.sprites : {};
                    draft.sprites.skills = draft.sprites.skills && typeof draft.sprites.skills === 'object' && !Array.isArray(draft.sprites.skills) ? draft.sprites.skills : {};
                    delete draft.sprites.skills[skillId];
                });
                renderCreatorScreen();
            }
        }
    }

    function handleCreatorContentChange(event) {
        const textarea = event.target.closest('[data-action="creator-json-input"]');
        if (textarea) {
            state.creatorJsonInput = textarea.value || '';
            return;
        }

        const statusField = event.target.closest('[data-action="creator-status-field"]');
        if (statusField) {
            const field = statusField.dataset.field || null;
            if (field) {
                updateCreatorStatusJson((draft) => {
                    draft[field] = normalizeStringInput(statusField.value, '');
                    if (field === 'name' && !draft.label) {
                        draft.label = draft.name;
                    }
                });
                renderCreatorScreen();
            }
            return;
        }

        const statusCountOnly = event.target.closest('[data-action="creator-status-count-only"]');
        if (statusCountOnly) {
            updateCreatorStatusJson((draft) => {
                draft.countOnly = Boolean(statusCountOnly.checked);
                if (draft.countOnly && draft.stackModel?.potency) {
                    draft.stackModel.potency.enabled = false;
                } else if (draft.stackModel?.potency) {
                    draft.stackModel.potency.enabled = true;
                }
            });
            renderCreatorScreen();
            return;
        }

        const statusTags = event.target.closest('[data-action="creator-status-tags"]');
        if (statusTags) {
            updateCreatorStatusJson((draft) => {
                draft.tags = String(statusTags.value || '')
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean);
            });
            renderCreatorScreen();
            return;
        }

        const statusJsonSection = event.target.closest('[data-action="creator-status-json-section"]');
        if (statusJsonSection) {
            const section = statusJsonSection.dataset.section || null;
            if (section) {
                try {
                    const parsed = JSON.parse(statusJsonSection.value || '{}');
                    updateCreatorStatusJson((draft) => {
                        draft[section] = parsed;
                    });
                    setCreatorMessage('success', `Updated status ${section}.`);
                } catch (error) {
                    setCreatorMessage('error', `Invalid ${section} JSON: ${error?.message || error}`);
                }
                renderCreatorScreen();
            }
            return;
        }

        const unitField = event.target.closest('[data-action="creator-unit-field"]');
        if (unitField) {
            const field = unitField.dataset.field;
            const value = unitField.value;
            updateCreatorUnitJson((draft) => {
                if (field === 'id' || field === 'name') {
                    draft[field] = normalizeStringInput(value, '');
                    return;
                }
                if (field === 'level') {
                    draft.level = Math.max(1, Math.round(normalizeNumberInput(value, draft.level ?? 1)));
                    return;
                }
                if (field === 'maxHp') {
                    draft.maxHp = Math.max(1, Math.round(normalizeNumberInput(value, draft.maxHp ?? 100)));
                    return;
                }
                if (field === 'sp') {
                    draft.sp = Math.round(normalizeNumberInput(value, draft.sp ?? 0));
                    return;
                }
                if (field === 'defenseLevel') {
                    draft.defenseLevel = Math.round(normalizeNumberInput(value, draft.defenseLevel ?? 0));
                }
            });
            renderCreatorScreen();
            return;
        }

        const speedField = event.target.closest('[data-action="creator-unit-speed"]');
        if (speedField) {
            const index = Number(speedField.dataset.index);
            updateCreatorUnitJson((draft) => {
                draft.speedRange = Array.isArray(draft.speedRange) ? draft.speedRange : [1, 1];
                const fallback = Number.isFinite(draft.speedRange[index]) ? draft.speedRange[index] : 1;
                const next = Math.max(0, Math.round(normalizeNumberInput(speedField.value, fallback)));
                draft.speedRange[index] = next;
            });
            renderCreatorScreen();
            return;
        }

        const spriteField = event.target.closest('[data-action="creator-unit-sprite"]');
        if (spriteField) {
            const spriteKey = spriteField.dataset.spriteKey || null;
            if (spriteKey) {
                updateCreatorUnitJson((draft) => {
                    draft.sprites = draft.sprites && typeof draft.sprites === 'object' && !Array.isArray(draft.sprites) ? draft.sprites : {};
                    draft.sprites[spriteKey] = normalizeStringInput(spriteField.value, '');
                });
                renderCreatorScreen();
            }
            return;
        }

        const skillSpriteField = event.target.closest('[data-action="creator-unit-skill-sprite"]');
        if (skillSpriteField) {
            const skillId = skillSpriteField.dataset.skillId || null;
            if (skillId) {
                updateCreatorUnitJson((draft) => {
                    draft.sprites = draft.sprites && typeof draft.sprites === 'object' && !Array.isArray(draft.sprites) ? draft.sprites : {};
                    draft.sprites.skills = draft.sprites.skills && typeof draft.sprites.skills === 'object' && !Array.isArray(draft.sprites.skills) ? draft.sprites.skills : {};
                    const nextValue = normalizeStringInput(skillSpriteField.value, '');
                    if (!nextValue) {
                        delete draft.sprites.skills[skillId];
                        return;
                    }
                    draft.sprites.skills[skillId] = nextValue;
                });
                renderCreatorScreen();
            }
            return;
        }

        const passiveField = event.target.closest('[data-action="creator-unit-passive-field"]');
        if (passiveField) {
            const index = Number(passiveField.dataset.index);
            const field = passiveField.dataset.field || null;
            if (Number.isInteger(index) && field) {
                updateCreatorUnitJson((draft) => {
                    draft.passives = Array.isArray(draft.passives) ? draft.passives : [];
                    const passive = draft.passives[index];
                    if (!passive || typeof passive !== 'object') {
                        return;
                    }
                    passive[field] = normalizeStringInput(passiveField.value, '');
                });
                renderCreatorScreen();
            }
            return;
        }

        const statusStackToggle = event.target.closest('[data-action="creator-status-stack-toggle"]');
        if (statusStackToggle) {
            const bucket = statusStackToggle.dataset.bucket || null;
            if (bucket) {
                updateCreatorStatusJson((draft) => {
                    draft.stackModel = draft.stackModel && typeof draft.stackModel === 'object' ? draft.stackModel : {};
                    if (statusStackToggle.checked) {
                        draft.stackModel[bucket] = draft.stackModel[bucket] || { enabled: true, min: 0, max: 99, application: 'add' };
                        draft.stackModel[bucket].enabled = true;
                    } else {
                        delete draft.stackModel[bucket];
                    }
                });
                renderCreatorScreen();
            }
            return;
        }

        const statusStackField = event.target.closest('[data-action="creator-status-stack-field"]');
        if (statusStackField) {
            const bucket = statusStackField.dataset.bucket || null;
            const field = statusStackField.dataset.field || null;
            if (bucket && field) {
                updateCreatorStatusJson((draft) => {
                    draft.stackModel = draft.stackModel && typeof draft.stackModel === 'object' ? draft.stackModel : {};
                    draft.stackModel[bucket] = draft.stackModel[bucket] || { enabled: true, min: 0, max: 99, application: 'add' };
                    const fallback = Number.isFinite(draft.stackModel[bucket][field]) ? draft.stackModel[bucket][field] : 0;
                    draft.stackModel[bucket][field] = Math.round(normalizeNumberInput(statusStackField.value, fallback));
                });
                renderCreatorScreen();
            }
            return;
        }

        const statusExpireCount = event.target.closest('[data-action="creator-status-expire-count"]');
        if (statusExpireCount) {
            updateCreatorStatusJson((draft) => {
                draft.stackModel = draft.stackModel && typeof draft.stackModel === 'object' ? draft.stackModel : {};
                if (statusExpireCount.checked) {
                    draft.stackModel.expireWhen = { countLte: 0 };
                } else {
                    delete draft.stackModel.expireWhen;
                }
            });
            renderCreatorScreen();
            return;
        }

        const hookFieldTarget = event.target.closest('[data-action="creator-hook-condition-field"], [data-action="creator-hook-action-field"], [data-action="creator-simple-effect-field"], [data-action="creator-hook-block-field"]');
        if (hookFieldTarget) {
            const creatorUi = getCreatorUi();
            const scope = hookFieldTarget.dataset.creatorScope || null;
            const hookName = hookFieldTarget.dataset.hookName || null;
            const entryIndex = Number(hookFieldTarget.dataset.hookEntryIndex);
            const field = hookFieldTarget.dataset.field || null;
            const rawValue = hookFieldTarget.value ?? '';
            if (!scope || !hookName || !Number.isInteger(entryIndex) || !field) {
                return;
            }
            const entityType = scope === 'status' ? 'status' : 'unit';
            const actionName = hookFieldTarget.dataset.action;
            runCreatorHookEntryMutation(entityType, scope, hookFieldTarget.dataset, (entry) => {
                if (actionName === 'creator-hook-block-field') {
                    if (field === 'oncePer') {
                        if (rawValue) {
                            entry.oncePer = rawValue;
                        } else {
                            delete entry.oncePer;
                        }
                    }
                    return;
                }
                if (actionName === 'creator-hook-condition-field') {
                    const condIndex = Number(hookFieldTarget.dataset.conditionIndex);
                    if (!Number.isInteger(condIndex)) {
                        return;
                    }
                    entry.conditions = Array.isArray(entry.conditions) ? entry.conditions : [];
                    const condition = entry.conditions[condIndex];
                    if (condition) {
                        creatorUi?.applyConditionFieldUpdate(condition, field, rawValue);
                    }
                    return;
                }
                const actionIndex = Number(hookFieldTarget.dataset.actionIndex);
                let effect = entry;
                if (actionName === 'creator-hook-action-field' && Number.isInteger(actionIndex)) {
                    entry.actions = Array.isArray(entry.actions) ? entry.actions : [];
                    effect = entry.actions[actionIndex];
                }
                if (effect && creatorUi) {
                    creatorUi.applyEffectFieldUpdate(effect, field, rawValue);
                }
            });
            renderCreatorScreen();
            return;
        }

        const skillEffectField = event.target.closest('[data-action="creator-skill-effect-field"], [data-action="creator-unit-skill-effect-field"]');
        if (skillEffectField) {
            const creatorUi = getCreatorUi();
            const skillIndex = Number(skillEffectField.dataset.skillIndex);
            const effectIndex = Number(skillEffectField.dataset.effectIndex);
            const field = skillEffectField.dataset.field || null;
            if (Number.isInteger(skillIndex) && Number.isInteger(effectIndex) && field) {
                const rawValue = skillEffectField.value ?? '';
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[skillIndex];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    skill.effects = Array.isArray(skill.effects) ? skill.effects : [];
                    const effect = skill.effects[effectIndex];
                    if (!effect || typeof effect !== 'object') {
                        return;
                    }
                    if (creatorUi) {
                        creatorUi.applyEffectFieldUpdate(effect, field, rawValue);
                    }
                });
                renderCreatorScreen();
            }
            return;
        }

        const passiveHooks = event.target.closest('[data-action="creator-unit-passive-hooks"]');
        if (passiveHooks) {
            const index = Number(passiveHooks.dataset.index);
            if (Number.isInteger(index)) {
                try {
                    const parsed = JSON.parse(passiveHooks.value || '{}');
                    updateCreatorUnitJson((draft) => {
                        draft.passives = Array.isArray(draft.passives) ? draft.passives : [];
                        const passive = draft.passives[index];
                        if (!passive || typeof passive !== 'object') {
                            return;
                        }
                        passive.hooks = parsed;
                    });
                    setCreatorMessage('success', 'Updated passive hooks.');
                } catch (error) {
                    setCreatorMessage('error', `Invalid hooks JSON: ${error?.message || error}`);
                }
                renderCreatorScreen();
            }
            return;
        }

        const skillField = event.target.closest('[data-action="creator-unit-skill-field"]');
        if (skillField) {
            const index = Number(skillField.dataset.index);
            const field = skillField.dataset.field || null;
            if (Number.isInteger(index) && field) {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[index];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    if (['id', 'name', 'damageType', 'sinType', 'skillType', 'description'].includes(field)) {
                        skill[field] = normalizeStringInput(skillField.value, '');
                        return;
                    }
                    if (['basePower', 'coinPower', 'coinCount'].includes(field)) {
                        skill[field] = Math.round(normalizeNumberInput(skillField.value, skill[field] ?? 0));
                    }
                });
                renderCreatorScreen();
            }
            return;
        }

        const skillEffects = event.target.closest('[data-action="creator-unit-skill-effects"]');
        if (skillEffects) {
            const index = Number(skillEffects.dataset.index);
            if (Number.isInteger(index)) {
                try {
                    const parsed = JSON.parse(skillEffects.value || '[]');
                    updateCreatorUnitJson((draft) => {
                        draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                        const skill = draft.skills[index];
                        if (!skill || typeof skill !== 'object') {
                            return;
                        }
                        skill.effects = parsed;
                    });
                    setCreatorMessage('success', 'Updated skill effects.');
                } catch (error) {
                    setCreatorMessage('error', `Invalid effects JSON: ${error?.message || error}`);
                }
                renderCreatorScreen();
            }
            return;
        }

        const spriteUpload = event.target.closest('[data-action="creator-upload-sprite"]');
        if (spriteUpload) {
            const spriteKey = spriteUpload.dataset.spriteKey || null;
            const file = spriteUpload.files?.[0] || null;
            if (spriteKey && file) {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                    if (!dataUrl) {
                        return;
                    }
                    updateCreatorUnitJson((draft) => {
                        draft.sprites = draft.sprites && typeof draft.sprites === 'object' && !Array.isArray(draft.sprites) ? draft.sprites : {};
                        draft.sprites[spriteKey] = dataUrl;
                    });
                    setCreatorMessage('success', `Uploaded ${spriteKey} sprite.`);
                    renderCreatorScreen();
                };
                reader.readAsDataURL(file);
            }
            return;
        }

        const skillSpriteUpload = event.target.closest('[data-action="creator-upload-skill-sprite"]');
        if (skillSpriteUpload) {
            const skillId = skillSpriteUpload.dataset.skillId || null;
            const file = skillSpriteUpload.files?.[0] || null;
            if (skillId && file) {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                    if (!dataUrl) {
                        return;
                    }
                    updateCreatorUnitJson((draft) => {
                        draft.sprites = draft.sprites && typeof draft.sprites === 'object' && !Array.isArray(draft.sprites) ? draft.sprites : {};
                        draft.sprites.skills = draft.sprites.skills && typeof draft.sprites.skills === 'object' && !Array.isArray(draft.sprites.skills) ? draft.sprites.skills : {};
                        draft.sprites.skills[skillId] = dataUrl;
                    });
                    setCreatorMessage('success', `Uploaded sprite for ${skillId}.`);
                    renderCreatorScreen();
                };
                reader.readAsDataURL(file);
            }
        }
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

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/\n/g, '&#10;');
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
        const isCreatorScreenOpen = state.activeScreen === 'creator';

        elements.root.classList.toggle('is-open', state.isOpen);
        elements.root.classList.toggle('is-character-select', isCharacterSelectOpen);
        elements.root.classList.toggle('is-combat-screen', isCombatScreenOpen);
        elements.root.classList.toggle('is-creator-screen', isCreatorScreenOpen);
        elements.button.setAttribute('aria-expanded', String(state.isOpen));
        elements.panel.setAttribute('aria-hidden', String(!state.isOpen));
        elements.mainMenu?.setAttribute('aria-hidden', String(state.activeScreen !== 'main-menu'));
        elements.characterSelect?.setAttribute('aria-hidden', String(!isCharacterSelectOpen));
        elements.creatorScreen?.setAttribute('aria-hidden', String(!isCreatorScreenOpen));
        elements.combatScreen?.setAttribute('aria-hidden', String(!isCombatScreenOpen));
        elements.characterTrayButton?.setAttribute('aria-pressed', String(isCharacterSelectOpen));
        elements.combatTrayButton?.setAttribute('aria-pressed', String(isCombatScreenOpen));
        elements.creatorTrayButton?.setAttribute('aria-pressed', String(isCreatorScreenOpen));
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

    async function handleCreatorTrayButtonClick() {
        await unlockAudioPlayback();

        if (state.activeScreen === 'creator') {
            return;
        }

        playSound('click');

        if (!elements.creatorTrayButton) {
            return;
        }

        state.activeScreen = 'creator';
        syncPanelState();
        void prepareCreatorSelection().catch((error) => {
            console.error(`${EXTENSION_ID}: creator initialization failed.`, error);
            setCreatorMessage('error', formatCombatModuleError(error));
            renderCreatorScreen();
        });
        renderCreatorScreen();
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
                        <div class="echoes-battle-panel__creator-screen" aria-hidden="true">
                            <div class="echoes-battle-panel__creator-content"></div>
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
                            <button
                                class="echoes-battle-panel__tray-button echoes-battle-panel__tray-button--creator"
                                type="button"
                                aria-label="Open creator"
                                aria-pressed="false"
                                title="Open creator"
                            >
                                <span class="echoes-battle-panel__tray-icon echoes-battle-panel__tray-icon--creator" aria-hidden="true"></span>
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
        elements.creatorScreen = root.querySelector('.echoes-battle-panel__creator-screen');
        elements.creatorContent = root.querySelector('.echoes-battle-panel__creator-content');
        elements.creatorTrayButton = root.querySelector('.echoes-battle-panel__tray-button--creator');

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
        elements.creatorTrayButton.addEventListener('mouseenter', handleTrayButtonHover);
        elements.creatorTrayButton.addEventListener('click', handleCreatorTrayButtonClick);
        elements.creatorContent.addEventListener('click', handleCreatorContentClick);
        elements.creatorContent.addEventListener('change', handleCreatorContentChange);
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
