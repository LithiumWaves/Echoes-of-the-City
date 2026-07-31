(() => {
    const EXTENSION_ID = 'echoes-of-the-city';
    const ROOT_ID = `${EXTENSION_ID}-root`;
    const BUTTON_ID = `${EXTENSION_ID}-battle-launcher`;
    const BUTTON_MARGIN = 0;
    const PANEL_MARGIN = 8;
    const PANEL_GAP = 24;
    const DRAG_THRESHOLD = 6;
    const PANEL_ASPECT_RATIO = 1640 / 4120;
    const COMBAT_MAX_PLAYER_UNITS = 7;
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
        'battle/ui/sinColors.js',
        'battle/ui/creator/creatorUiHelpers.js',
        'battle/ui/creator/editorWorkbenchRenderer.js',
        'battle/ui/creator/movesetSheet/movesetSheetRenderer.js',
        'battle/ui/creator/encounterBuilder/encounterBuilderRenderer.js',
        'battle/ui/roster/teamBuilderRenderer.js',
        'battle/ui/drive/driveMenuRenderer.js',
        'battle/ui/inspect/inspectState.js',
        'battle/ui/combat/lcCombatUi.js',
        'battle/audio/combatSounds.js',
        'battle/core/damageFormula.js',
        'battle/core/plannerSkills.js',
        'battle/core/skillDeck.js',
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
    const COMBAT_AUDIO_PATHS = {
        uiClick: 'audio/combat/Ui_Click.wav',
        parryAtk: 'audio/combat/Parry_Atk.wav',
        defenseEvasion: 'audio/combat/Defense_Evasion.wav',
        defenseGuard: 'audio/combat/Defense_Guard.wav',
        effectBleeding: 'audio/combat/Effect_Bleeding.wav',
        effectBurn: 'audio/combat/Effect_Burn.wav',
        blowStab: 'audio/combat/Blow_Stab.wav',
        blowHori: 'audio/combat/Blow_Hori.wav',
        blowVert: 'audio/combat/Blow_Vert.wav',
        swordStab: 'audio/combat/Sword_Stab.wav',
        swordHori: 'audio/combat/Sword_Hori.wav',
        swordVert: 'audio/combat/Sword_Vert.wav',
        stagger: 'audio/combat/Stagger.mp3',
        coinFlip: 'audio/combat/Coin Flip.mp3',
        unitDeath: 'audio/combat/Unit Death.mp3',
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
        creatorPendingOpenLane: null,
        creatorUnitDraftCache: null,
        creatorBattleDraftCache: null,
        creatorRenderLock: false,
        teamPresets: null,
        teamRosterFilter: '',
        combatPhase: 'select',
        deploySelectedUnitIds: [],
        selectedDriveChapterId: null,
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
        characterScreen: null,
        characterLayout: null,
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
            const fullDefinition = typeof api.getBattleDefinition === 'function'
                ? api.getBattleDefinition(entry.id)
                : null;
            const backgroundImage = fullDefinition?.rules?.background?.image
                ? resolveExtensionUrl(fullDefinition.rules.background.image)
                : null;

            uniqueBattles.push({
                id: entry.id,
                name: entry.name || entry.id,
                isDebug: isDebugBattleId(entry.id),
                description: fullDefinition?.description || '',
                drive: fullDefinition?.drive && typeof fullDefinition.drive === 'object'
                    ? fullDefinition.drive
                    : null,
                backgroundImage,
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

    function getInstalledPacksForDrive() {
        const api = getBattleContentApi();
        const listedPacks = typeof api.listInstalledContentPacks === 'function'
            ? api.listInstalledContentPacks()
            : [];
        const battleModules = window.EchoesOfTheCityBattleModules || {};
        const installedEntries = battleModules.installedContentPacks || {};

        return listedPacks.map((pack) => {
            const entry = installedEntries[pack.id];
            return {
                id: pack.id,
                name: pack.name || pack.id,
                version: pack.version || null,
                battleIds: Array.isArray(entry?.ids?.battles) ? entry.ids.battles : [],
            };
        });
    }

    function syncDriveChapterSelection() {
        const driveMenu = getDriveMenu();
        if (!driveMenu) {
            return;
        }

        const chapters = driveMenu.groupBattlesForDriveMenu(
            state.availableBattles,
            getInstalledPacksForDrive(),
        );
        const chapterForBattle = driveMenu.findChapterForBattle(chapters, state.selectedBattleId);
        if (chapterForBattle) {
            state.selectedDriveChapterId = chapterForBattle.chapterId;
            return;
        }

        const hasCurrentChapter = chapters.some((chapter) => chapter.chapterId === state.selectedDriveChapterId);
        if (!hasCurrentChapter) {
            const preferredChapter = chapters.find((chapter) => chapter.chapterId !== driveMenu.DEBUG_CHAPTER_ID)
                || chapters[0]
                || null;
            state.selectedDriveChapterId = preferredChapter?.chapterId || null;
        }
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

        syncDriveChapterSelection();
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

    function getMovesetSheet() {
        return window.EchoesOfTheCityMovesetSheet || window.EchoesOfTheCityBattleModules?.movesetSheet || null;
    }

    function getEditorWorkbench() {
        return window.EchoesOfTheCityEditorWorkbench || window.EchoesOfTheCityBattleModules?.editorWorkbench || null;
    }

    function getDriveMenu() {
        return window.EchoesOfTheCityDriveMenu || window.EchoesOfTheCityBattleModules?.driveMenu || null;
    }

    function getTeamBuilder() {
        return window.EchoesOfTheCityTeamBuilder || window.EchoesOfTheCityBattleModules?.teamBuilder || null;
    }

    function ensureTeamPresetsLoaded() {
        const teamBuilder = getTeamBuilder();
        if (!teamBuilder) {
            return null;
        }
        if (!state.teamPresets) {
            try {
                const raw = window.localStorage?.getItem(teamBuilder.TEAM_PRESETS_STORAGE_KEY);
                state.teamPresets = teamBuilder.parseTeamPresetsFromStorage(raw);
            } catch {
                state.teamPresets = teamBuilder.createDefaultTeamPresetsState();
            }
        }
        return state.teamPresets;
    }

    function saveTeamPresetsState() {
        const teamBuilder = getTeamBuilder();
        if (!teamBuilder || !state.teamPresets) {
            return;
        }
        state.teamPresets = teamBuilder.normalizeTeamPresetsState(state.teamPresets);
        try {
            window.localStorage?.setItem(
                teamBuilder.TEAM_PRESETS_STORAGE_KEY,
                teamBuilder.serializeTeamPresetsState(state.teamPresets),
            );
        } catch {
            return;
        }
    }

    function getActiveTeamPreset() {
        const teamBuilder = getTeamBuilder();
        const normalized = teamBuilder?.normalizeTeamPresetsState(ensureTeamPresetsLoaded())
            || { presets: [], activePresetIndex: 0 };
        return normalized.presets[normalized.activePresetIndex] || { name: '', unitIds: [] };
    }

    function getActiveTeamUnitIds() {
        const preset = getActiveTeamPreset();
        return Array.isArray(preset.unitIds) ? preset.unitIds.slice() : [];
    }

    function getEncounterBuilder() {
        return window.EchoesOfTheCityEncounterBuilder || window.EchoesOfTheCityBattleModules?.encounterBuilder || null;
    }

    function getCreatorHookTriggers() {
        const registry = getRegistryApi();
        const labels = registry?.passiveHookLabels || {};
        return Object.keys(labels).map((id) => ({
            id,
            label: labels[id] || id,
        }));
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
        if (entityType === 'battle') {
            const fallback = creatorUi?.createDefaultBattleDefinition?.() || createDefaultBattleDefinition();
            const draft = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed
                : fallback;
            draft.enemyUnitIds = Array.isArray(draft.enemyUnitIds) ? draft.enemyUnitIds : [];
            draft.rules = draft.rules && typeof draft.rules === 'object' && !Array.isArray(draft.rules)
                ? draft.rules
                : { ...fallback.rules };
            draft.rules.encounterType = draft.rules.encounterType || 'focused';
            draft.rules.maxTurns = Number.isFinite(Number(draft.rules.maxTurns)) ? Number(draft.rules.maxTurns) : 100;
            draft.rules.victoryCondition = draft.rules.victoryCondition || 'defeat-all-enemies';
            draft.rules.failureCondition = draft.rules.failureCondition || 'all-allies-defeated';
            draft.rules.enemyAiProfile = draft.rules.enemyAiProfile && typeof draft.rules.enemyAiProfile === 'object'
                ? draft.rules.enemyAiProfile
                : { skill: 'cycle', target: 'mirror' };
            if (Array.isArray(draft.rules.waves)) {
                draft.rules.waves = draft.rules.waves.map((wave) => {
                    if (!wave || typeof wave !== 'object' || Array.isArray(wave)) {
                        return { enemyUnitIds: [] };
                    }
                    return {
                        enemyUnitIds: Array.isArray(wave.enemyUnitIds) ? wave.enemyUnitIds.slice() : [],
                    };
                });
            }
            if (Array.isArray(draft.rules.scriptedEvents)) {
                draft.rules.scriptedEvents = draft.rules.scriptedEvents.map((event) => (
                    event && typeof event === 'object' ? { ...event } : event
                ));
            }
            delete draft.playerUnits;
            delete draft.enemyUnits;
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

    function cloneCreatorDraft(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function resolveCreatorUnitParsed() {
        const parsed = getCreatorParsedJsonOrNull();
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            state.creatorUnitDraftCache = cloneCreatorDraft(parsed);
            return parsed;
        }
        if (state.creatorUnitDraftCache && typeof state.creatorUnitDraftCache === 'object') {
            return cloneCreatorDraft(state.creatorUnitDraftCache);
        }
        return null;
    }

    function syncBattleEnemyIdsFromWaves(draft) {
        const waves = draft?.rules?.waves;
        if (Array.isArray(waves) && waves.length) {
            const firstIds = waves[0]?.enemyUnitIds;
            if (Array.isArray(firstIds)) {
                draft.enemyUnitIds = firstIds.slice();
            }
        }
    }

    function serializeBattleAuthoringDraft(draft) {
        const copy = cloneCreatorDraft(draft);
        delete copy.playerUnits;
        delete copy.enemyUnits;
        if (copy.rules?.waves) {
            copy.rules.waves = copy.rules.waves.map((wave) => {
                const nextWave = { ...wave };
                delete nextWave.enemyUnits;
                return nextWave;
            });
        }
        return copy;
    }

    function battleDefinitionToAuthoringDraft(definition) {
        const fallback = getCreatorUi()?.createDefaultBattleDefinition?.() || createDefaultBattleDefinition();
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            return normalizeCreatorDraft('battle', fallback);
        }
        const draft = {
            id: definition.id || fallback.id,
            name: definition.name || fallback.name,
            description: definition.description || '',
            enemyUnitIds: [],
            rules: {
                ...fallback.rules,
                ...(definition.rules && typeof definition.rules === 'object' ? definition.rules : {}),
            },
        };
        if (Array.isArray(definition.enemyUnitIds)) {
            draft.enemyUnitIds = definition.enemyUnitIds.slice();
        } else if (Array.isArray(definition.enemyUnits)) {
            draft.enemyUnitIds = definition.enemyUnits.map((unit) => unit?.id).filter(Boolean);
        }
        if (Array.isArray(draft.rules.waves)) {
            draft.rules.waves = draft.rules.waves.map((wave) => {
                if (!wave || typeof wave !== 'object' || Array.isArray(wave)) {
                    return { enemyUnitIds: [] };
                }
                if (Array.isArray(wave.enemyUnitIds)) {
                    return { enemyUnitIds: wave.enemyUnitIds.slice() };
                }
                if (Array.isArray(wave.enemyUnits)) {
                    return { enemyUnitIds: wave.enemyUnits.map((unit) => unit?.id).filter(Boolean) };
                }
                return { enemyUnitIds: [] };
            });
            syncBattleEnemyIdsFromWaves(draft);
        }
        return normalizeCreatorDraft('battle', draft);
    }

    function resolveCreatorBattleParsed() {
        const parsed = getCreatorParsedJsonOrNull();
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const normalized = normalizeCreatorDraft('battle', parsed);
            state.creatorBattleDraftCache = cloneCreatorDraft(serializeBattleAuthoringDraft(normalized));
            return normalized;
        }
        if (state.creatorBattleDraftCache && typeof state.creatorBattleDraftCache === 'object') {
            return normalizeCreatorDraft('battle', cloneCreatorDraft(state.creatorBattleDraftCache));
        }
        return null;
    }

    function updateCreatorEntityJson(entityType, mutator) {
        let parsed = null;
        if (entityType === 'unit') {
            ensureCreatorUnitDraftLoaded();
            parsed = resolveCreatorUnitParsed();
        } else if (entityType === 'battle') {
            ensureCreatorBattleDraftLoaded();
            parsed = resolveCreatorBattleParsed();
        } else {
            parsed = getCreatorParsedJsonOrNull();
        }
        const draft = normalizeCreatorDraft(entityType, parsed);
        if (typeof mutator === 'function') {
            mutator(draft);
        }
        if (entityType === 'battle') {
            syncBattleEnemyIdsFromWaves(draft);
            const serialized = serializeBattleAuthoringDraft(draft);
            state.creatorJsonInput = JSON.stringify(serialized, null, 2);
            state.creatorBattleDraftCache = cloneCreatorDraft(serialized);
            return;
        }
        state.creatorJsonInput = JSON.stringify(draft, null, 2);
        if (entityType === 'unit') {
            state.creatorUnitDraftCache = cloneCreatorDraft(draft);
        }
    }

    function updateCreatorBattleJson(mutator) {
        if (state.creatorEntityType === 'battle') {
            ensureCreatorBattleDraftLoaded();
        }
        updateCreatorEntityJson('battle', mutator);
    }

    function updateCreatorUnitJson(mutator) {
        if (state.creatorEntityType === 'unit') {
            ensureCreatorUnitDraftLoaded();
        }
        updateCreatorEntityJson('unit', mutator);
    }

    function updateCreatorStatusJson(mutator) {
        updateCreatorEntityJson('status', mutator);
    }

    function ensureCreatorUnitDraftLoaded() {
        if (state.creatorEntityType !== 'unit') {
            return;
        }
        const raw = String(state.creatorJsonInput || '').trim();
        if (raw) {
            return;
        }
        if (state.creatorSelectedId) {
            const definition = getCreatorEntityDefinition('unit', state.creatorSelectedId);
            if (definition) {
                state.creatorJsonInput = JSON.stringify(definition, null, 2);
                state.creatorUnitDraftCache = cloneCreatorDraft(definition);
                return;
            }
        }
        const defaultUnit = getCreatorUi()?.createDefaultUnitDefinition?.() || createDefaultUnitDefinition();
        state.creatorJsonInput = JSON.stringify(defaultUnit, null, 2);
        state.creatorUnitDraftCache = cloneCreatorDraft(defaultUnit);
    }

    function ensureCreatorBattleDraftLoaded() {
        if (state.creatorEntityType !== 'battle') {
            return;
        }
        const raw = String(state.creatorJsonInput || '').trim();
        if (raw) {
            return;
        }
        if (state.creatorSelectedId) {
            const definition = getCreatorEntityDefinition('battle', state.creatorSelectedId);
            if (definition) {
                const authoring = battleDefinitionToAuthoringDraft(definition);
                state.creatorJsonInput = JSON.stringify(authoring, null, 2);
                state.creatorBattleDraftCache = cloneCreatorDraft(authoring);
                return;
            }
        }
        const defaultBattle = getCreatorUi()?.createDefaultBattleDefinition?.() || createDefaultBattleDefinition();
        state.creatorJsonInput = JSON.stringify(defaultBattle, null, 2);
        state.creatorBattleDraftCache = cloneCreatorDraft(defaultBattle);
    }

    function captureCreatorUiState() {
        const root = elements.creatorContent;
        if (!root) {
            return null;
        }
        const openLanes = [];
        root.querySelectorAll('.echoes-moveset__lane[data-lane-key]').forEach((lane) => {
            if (lane.open) {
                openLanes.push(lane.dataset.laneKey || '');
            }
        });
        const openDetails = [];
        root.querySelectorAll('details[data-creator-details-key]').forEach((details) => {
            if (details.open) {
                openDetails.push(details.dataset.creatorDetailsKey || '');
            }
        });
        const combatDebug = root.querySelector('.echoes-battle-panel__combat-debug');
        const sideColumn = root.querySelector('.echoes-moveset__side-column');
        return {
            creatorContentScrollTop: root.scrollTop,
            combatDebugScrollTop: combatDebug?.scrollTop ?? 0,
            skillsRowScrollLeft: root.querySelector('.echoes-moveset__skills-row')?.scrollLeft ?? 0,
            sideColumnScrollTop: sideColumn?.scrollTop ?? 0,
            openLanes,
            openDetails,
        };
    }

    function restoreCreatorUiState(uiState) {
        const root = elements.creatorContent;
        if (!root || !uiState) {
            return;
        }
        const combatDebug = root.querySelector('.echoes-battle-panel__combat-debug');
        if (combatDebug) {
            combatDebug.scrollTop = uiState.combatDebugScrollTop ?? 0;
        }
        root.scrollTop = uiState.creatorContentScrollTop ?? 0;
        const skillsRow = root.querySelector('.echoes-moveset__skills-row');
        if (skillsRow) {
            skillsRow.scrollLeft = uiState.skillsRowScrollLeft ?? 0;
        }
        const sideColumn = root.querySelector('.echoes-moveset__side-column');
        if (sideColumn) {
            sideColumn.scrollTop = uiState.sideColumnScrollTop ?? 0;
        }
        if (Array.isArray(uiState.openLanes)) {
            root.querySelectorAll('.echoes-moveset__lane[data-lane-key]').forEach((lane) => {
                if (uiState.openLanes.includes(lane.dataset.laneKey)) {
                    lane.open = true;
                }
            });
        }
        if (Array.isArray(uiState.openDetails)) {
            root.querySelectorAll('details[data-creator-details-key]').forEach((details) => {
                if (uiState.openDetails.includes(details.dataset.creatorDetailsKey)) {
                    details.open = true;
                }
            });
        }
        if (state.creatorPendingOpenLane) {
            root.querySelectorAll('.echoes-moveset__lane[data-lane-key]').forEach((lane) => {
                if (lane.dataset.laneKey === state.creatorPendingOpenLane) {
                    lane.open = true;
                }
            });
            state.creatorPendingOpenLane = null;
        }
    }

    function scheduleCreatorUiStateRestore(uiState) {
        if (!uiState) {
            return;
        }
        const restore = () => restoreCreatorUiState(uiState);
        restore();
        requestAnimationFrame(() => {
            restore();
            requestAnimationFrame(restore);
        });
    }

    function beginCreatorRenderLock() {
        state.creatorRenderLock = true;
    }

    function endCreatorRenderLock() {
        requestAnimationFrame(() => {
            state.creatorRenderLock = false;
        });
    }

    function appendLaneEffectCard(laneButton, effect, skillIndex, effectIndex) {
        const creatorUi = getCreatorUi();
        if (!creatorUi?.renderEffectFields) {
            return false;
        }
        const lane = laneButton.closest('.echoes-moveset__lane');
        const laneBody = lane?.querySelector('.echoes-moveset__lane-body');
        if (!lane || !laneBody) {
            return false;
        }
        lane.open = true;
        laneBody.querySelectorAll('.echoes-creator__hint').forEach((hint) => {
            if (/no effects/i.test(hint.textContent || '')) {
                hint.remove();
            }
        });
        const catalog = getCreatorCatalog();
        const fieldAttrs = `data-creator-scope="skill-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}" data-action="creator-skill-effect-field"`;
        const card = document.createElement('div');
        card.className = 'echoes-moveset__lane-effect';
        card.innerHTML = `
            ${creatorUi.renderEffectFields(effect, catalog, escapeAttribute, escapeHtml, fieldAttrs, { showFilters: true })}
            <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-skill-remove-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}">Remove</button>
        `;
        laneButton.insertAdjacentElement('beforebegin', card);
        return true;
    }

    function syncCreatorJsonTextareas() {
        const root = elements.creatorContent;
        if (!root) {
            return;
        }
        root.querySelectorAll('[data-action="creator-json-input"]').forEach((textarea) => {
            textarea.value = state.creatorJsonInput || '';
        });
    }

    function patchCreatorMovesetSheet() {
        const root = elements.creatorContent;
        if (!root) {
            return false;
        }
        const existing = root.querySelector('.echoes-moveset');
        if (!existing) {
            return false;
        }
        const movesetSheet = getMovesetSheet();
        const creatorUi = getCreatorUi();
        if (!movesetSheet?.renderMovesetSheet || !creatorUi) {
            return false;
        }

        const uiState = captureCreatorUiState();
        const unitDraft = normalizeCreatorDraft('unit', resolveCreatorUnitParsed());
        const catalog = getCreatorCatalog();
        const wrapper = document.createElement('div');
        beginCreatorRenderLock();
        try {
            wrapper.innerHTML = movesetSheet.renderMovesetSheet(
                unitDraft,
                catalog,
                creatorUi,
                escapeAttribute,
                escapeHtml,
            ).trim();
            const newMoveset = wrapper.firstElementChild;
            if (!newMoveset) {
                return false;
            }

            existing.replaceWith(newMoveset);
            scheduleCreatorUiStateRestore(uiState);
            return true;
        } catch (error) {
            console.error(`${EXTENSION_ID}: moveset sheet patch failed.`, error);
            return false;
        } finally {
            endCreatorRenderLock();
        }
    }

    function patchCreatorEncounterBuilder() {
        const root = elements.creatorContent;
        if (!root) {
            return false;
        }
        const existing = root.querySelector('.echoes-encounter');
        if (!existing) {
            return false;
        }
        const encounterBuilder = getEncounterBuilder();
        const creatorUi = getCreatorUi();
        if (!encounterBuilder?.renderEncounterBuilder || !creatorUi) {
            return false;
        }

        const uiState = captureCreatorUiState();
        const battleDraft = normalizeCreatorDraft('battle', resolveCreatorBattleParsed());
        const catalog = getCreatorCatalog();
        const unitList = getCreatorListEntries('unit');
        const wrapper = document.createElement('div');
        beginCreatorRenderLock();
        try {
            wrapper.innerHTML = encounterBuilder.renderEncounterBuilder(
                battleDraft,
                unitList,
                catalog,
                creatorUi,
                escapeAttribute,
                escapeHtml,
                { hookTriggers: getCreatorHookTriggers() },
            ).trim();
            const newEncounter = wrapper.firstElementChild;
            if (!newEncounter) {
                return false;
            }

            existing.replaceWith(newEncounter);
            scheduleCreatorUiStateRestore(uiState);
            return true;
        } catch (error) {
            console.error(`${EXTENSION_ID}: encounter builder patch failed.`, error);
            return false;
        } finally {
            endCreatorRenderLock();
        }
    }

    function handleCreatorLaneAddEffect(laneButton) {
        const skillIndex = Number(laneButton.getAttribute('data-skill-index'));
        const trigger = laneButton.getAttribute('data-trigger') || 'onHit';
        const coinIndexRaw = laneButton.getAttribute('data-coin-index');
        const coinIndex = coinIndexRaw !== null && String(coinIndexRaw) !== '' ? Number(coinIndexRaw) : null;
        const laneKey = laneButton.getAttribute('data-lane-key') || null;

        if (!Number.isInteger(skillIndex) || skillIndex < 0) {
            setCreatorMessage('error', 'Could not determine which skill to edit. Try reloading the unit.');
            return;
        }

        const effect = {
            trigger,
            type: 'applyStatus',
            target: 'opponent',
            statusId: '',
            potency: 1,
            count: 1,
        };
        if (trigger === 'onHit' && Number.isInteger(coinIndex) && coinIndex > 0) {
            effect.coinIndex = coinIndex;
        }

        let effectIndex = -1;
        let added = false;
        updateCreatorUnitJson((draft) => {
            draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
            const skill = draft.skills[skillIndex];
            if (!skill || typeof skill !== 'object') {
                return;
            }
            skill.effects = Array.isArray(skill.effects) ? skill.effects : [];
            skill.effects.push(effect);
            effectIndex = skill.effects.length - 1;
            added = true;
        });

        if (!added || effectIndex < 0) {
            setCreatorMessage('error', `Skill #${skillIndex + 1} was not found in the draft. Select the unit again or add a skill first.`);
            return;
        }

        syncCreatorJsonTextareas();

        beginCreatorRenderLock();
        try {
            if (appendLaneEffectCard(laneButton, effect, skillIndex, effectIndex)) {
                setCreatorMessage('success', `Added ${trigger} effect.`);
                return;
            }
            if (laneKey) {
                state.creatorPendingOpenLane = laneKey;
            }
            rerenderCreatorAfterUnitEdit();
            setCreatorMessage('success', `Added ${trigger} effect.`);
        } catch (error) {
            console.error(`${EXTENSION_ID}: lane add-effect render failed.`, error);
            setCreatorMessage('error', formatCombatModuleError(error));
            rerenderCreatorAfterUnitEdit({ full: true });
        } finally {
            endCreatorRenderLock();
        }
    }

    function refreshCreatorUnitEditor({ full = false } = {}) {
        if (!full && state.creatorTab === 'editor' && state.creatorEntityType === 'unit') {
            if (patchCreatorMovesetSheet()) {
                syncCreatorJsonTextareas();
                return;
            }
        }
        renderCreatorScreen();
    }

    function rerenderCreatorAfterUnitEdit({ full = false } = {}) {
        if (state.creatorTab === 'editor' && state.creatorEntityType === 'unit') {
            refreshCreatorUnitEditor({ full });
            return;
        }
        renderCreatorScreen();
    }

    function refreshCreatorBattleEditor({ full = false } = {}) {
        if (!full && state.creatorTab === 'editor' && state.creatorEntityType === 'battle') {
            if (patchCreatorEncounterBuilder()) {
                syncCreatorJsonTextareas();
                return;
            }
        }
        renderCreatorScreen();
    }

    function rerenderCreatorAfterBattleEdit({ full = false } = {}) {
        if (state.creatorTab === 'editor' && state.creatorEntityType === 'battle') {
            refreshCreatorBattleEditor({ full });
            return;
        }
        renderCreatorScreen();
    }

    function rerenderCreatorHookEditor(entityType, scope) {
        if (entityType === 'unit' && scope === 'unit-passive') {
            rerenderCreatorAfterUnitEdit();
            return;
        }
        renderCreatorScreen();
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
                rerenderCreatorHookEditor(entityType, scope);
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
            rerenderCreatorHookEditor(entityType, scope);
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
            rerenderCreatorHookEditor(entityType, scope);
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
            rerenderCreatorHookEditor(entityType, scope);
            return true;
        }

        if (action === 'creator-hook-remove-event' && hookName) {
            runCreatorHookMutation(entityType, scope, dataset, (hooks) => {
                delete hooks[hookName];
            });
            rerenderCreatorHookEditor(entityType, scope);
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
            rerenderCreatorHookEditor(entityType, scope);
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
            rerenderCreatorHookEditor(entityType, scope);
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
            rerenderCreatorHookEditor(entityType, scope);
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
            rerenderCreatorHookEditor(entityType, scope);
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
            rerenderCreatorHookEditor(entityType, scope);
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
            rerenderCreatorHookEditor(entityType, scope);
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
        if (entityType === 'battle') {
            ensureCreatorBattleDraftLoaded();
        } else if (entityType === 'unit') {
            ensureCreatorUnitDraftLoaded();
        }

        let parsed;
        if (entityType === 'battle') {
            parsed = serializeBattleAuthoringDraft(normalizeCreatorDraft('battle', resolveCreatorBattleParsed()));
            state.creatorJsonInput = JSON.stringify(parsed, null, 2);
        } else if (entityType === 'unit') {
            parsed = normalizeCreatorDraft('unit', resolveCreatorUnitParsed());
            state.creatorJsonInput = JSON.stringify(parsed, null, 2);
        } else {
            const raw = String(state.creatorJsonInput || '').trim();
            if (!raw) {
                setCreatorMessage('error', 'Paste JSON first.');
                renderCreatorScreen();
                return;
            }
            try {
                parsed = JSON.parse(raw);
            } catch (error) {
                setCreatorMessage('error', `Invalid JSON: ${error?.message || error}`);
                renderCreatorScreen();
                return;
            }
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
        let parsed;
        if (entityType === 'battle') {
            ensureCreatorBattleDraftLoaded();
            parsed = serializeBattleAuthoringDraft(normalizeCreatorDraft('battle', resolveCreatorBattleParsed()));
            state.creatorJsonInput = JSON.stringify(parsed, null, 2);
        } else if (entityType === 'unit') {
            ensureCreatorUnitDraftLoaded();
            parsed = normalizeCreatorDraft('unit', resolveCreatorUnitParsed());
            state.creatorJsonInput = JSON.stringify(parsed, null, 2);
        } else {
            const raw = String(state.creatorJsonInput || '').trim();
            if (!raw) {
                setCreatorMessage('error', 'Paste JSON first.');
                renderCreatorScreen();
                return;
            }
            try {
                parsed = JSON.parse(raw);
            } catch (error) {
                setCreatorMessage('error', `Invalid JSON: ${error?.message || error}`);
                renderCreatorScreen();
                return;
            }
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
                const resolvedBattle = typeof api.resolveBattleDefinitionComposition === 'function'
                    ? api.resolveBattleDefinitionComposition(parsed)
                    : parsed;
                const schemaApi = getSchemaApi();
                const validator = typeof schemaApi?.validateEncounterDefinition === 'function'
                    ? schemaApi.validateEncounterDefinition
                    : (typeof api.validateEncounterDefinition === 'function' ? api.validateEncounterDefinition : null);
                const result = validator
                    ? validator(resolvedBattle)
                    : { errors: [] };
                if (result.errors?.length) {
                    const formatter = schemaApi?.formatBattleDefinitionErrors || getSchemaApi()?.formatBattleDefinitionErrors;
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
        ensureCreatorBattleDraftLoaded();
        const parsed = serializeBattleAuthoringDraft(normalizeCreatorDraft('battle', resolveCreatorBattleParsed()));
        state.creatorJsonInput = JSON.stringify(parsed, null, 2);
        if (!parsed?.id) {
            setCreatorMessage('error', 'Encounter needs an id before playtest.');
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
            state.combatPhase = 'deploy';
            state.deploySelectedUnitIds = getActiveTeamUnitIds();
            syncPanelState();
            renderCombatScreen();
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
                splash: '',
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

    function createDefaultBattleDefinition() {
        const creatorUi = getCreatorUi();
        if (creatorUi?.createDefaultBattleDefinition) {
            return creatorUi.createDefaultBattleDefinition();
        }
        return {
            id: 'new-battle',
            name: 'New Encounter',
            description: '',
            enemyUnitIds: [],
            rules: {
                encounterType: 'focused',
                maxTurns: 100,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'cycle', target: 'mirror' },
            },
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

        const tab = state.creatorTab;
        const entityType = state.creatorEntityType;
        if (tab === 'editor' && entityType === 'unit') {
            ensureCreatorUnitDraftLoaded();
        }
        if (tab === 'editor' && entityType === 'battle') {
            ensureCreatorBattleDraftLoaded();
        }

        const creatorUiState = captureCreatorUiState();

        const api = getBattleContentApi();
        const installedPacks = typeof api.listInstalledContentPacks === 'function'
            ? api.listInstalledContentPacks()
            : [];
        const message = state.creatorMessage?.text ? { text: state.creatorMessage.text, type: state.creatorMessage.type } : null;

        const editorWorkbench = getEditorWorkbench();
        const LABELS = editorWorkbench?.EDITOR_LABELS || {
            draftCard: 'Draft Card',
            draftPack: 'Draft Pack',
            bindToCollection: 'Bind to Collection',
            trialRun: 'Trial Run',
            validate: 'Validate',
            advancedBinding: 'Advanced Binding',
        };

        let binderMarkup = '';
        if (editorWorkbench) {
            if (tab === 'library') {
                binderMarkup = installedPacks.map((pack) => editorWorkbench.renderPublishedSetRow(
                    pack,
                    escapeHtml,
                    escapeAttribute,
                )).join('');
            } else if (entityType === 'battle') {
                binderMarkup = getCreatorListEntries('battle').map((entry) => editorWorkbench.renderPackBinderTile(
                    entry,
                    entry.id === state.creatorSelectedId,
                    escapeHtml,
                    escapeAttribute,
                )).join('');
            } else if (entityType === 'unit') {
                binderMarkup = getCreatorListEntries('unit').map((entry) => {
                    const unitDef = getCreatorEntityDefinition('unit', entry.id);
                    return editorWorkbench.renderCardBinderTile(
                        entry,
                        unitDef,
                        entry.id === state.creatorSelectedId,
                        {
                            escapeHtml,
                            escapeAttribute,
                            resolveAssetUrl: resolveCreatorSpriteUrl,
                        },
                    );
                }).join('');
            } else if (entityType === 'status') {
                binderMarkup = getCreatorListEntries('status').map((entry) => editorWorkbench.renderStatusBinderTile(
                    entry,
                    entry.id === state.creatorSelectedId,
                    escapeHtml,
                    escapeAttribute,
                )).join('');
            }
        }

        const catalog = getCreatorCatalog();
        const creatorUi = getCreatorUi();
        const movesetSheet = getMovesetSheet();
        const encounterBuilder = getEncounterBuilder();
        const parsedEditorJson = entityType === 'unit'
            ? resolveCreatorUnitParsed()
            : (entityType === 'status' ? getCreatorParsedJsonOrNull() : null);
        const unitDraft = entityType === 'unit' ? normalizeCreatorDraft('unit', parsedEditorJson) : null;
        const battleDraft = entityType === 'battle' ? normalizeCreatorDraft('battle', resolveCreatorBattleParsed()) : null;
        const unitListForEncounter = entityType === 'battle' ? getCreatorListEntries('unit') : [];
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
                <div class="echoes-creator echoes-editor-desk-panel">
                    <div class="echoes-editor-workshop__action-bar">
                        <button class="echoes-editor-workshop__action" type="button" data-action="creator-unit-new">${escapeHtml(LABELS.draftCard)}</button>
                        <button class="echoes-editor-workshop__action" type="button" data-action="creator-validate">${escapeHtml(LABELS.validate)}</button>
                        <button class="echoes-editor-workshop__action" type="button" data-action="creator-save-workshop">${escapeHtml(LABELS.bindToCollection)}</button>
                    </div>

                    <p class="echoes-editor-workshop__tip">Shape an Identity Card: stats and art on the plate, then forge skills on the sheet — each lane is a combat phase (On Use, Clash, per-coin On Hit).</p>

                    <div class="echoes-editor-card-plate">
                        ${unitSprites?.splash ? `<div class="echoes-editor-card-plate__portrait" style="background-image:url('${escapeAttribute(resolveCreatorSpriteUrl(unitSprites.splash))}');"></div>` : '<div class="echoes-editor-card-plate__portrait echoes-editor-card-plate__portrait--empty"></div>'}
                        <div class="echoes-editor-card-plate__fields">
                            <div class="echoes-editor-field-grid echoes-editor-field-grid--2">
                                <div class="echoes-creator__field-row">
                                    <label>Card ID</label>
                                    <input data-action="creator-unit-field" data-field="id" value="${escapeAttribute(String(unitDraft?.id || ''))}" />
                                </div>
                                <div class="echoes-creator__field-row">
                                    <label>Display name</label>
                                    <input data-action="creator-unit-field" data-field="name" value="${escapeAttribute(String(unitDraft?.name || ''))}" />
                                </div>
                                <div class="echoes-creator__field-row">
                                    <label>Level</label>
                                    <input data-action="creator-unit-field" data-field="level" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.level ?? 1))}" />
                                </div>
                                <div class="echoes-creator__field-row">
                                    <label>Max HP</label>
                                    <input data-action="creator-unit-field" data-field="maxHp" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.maxHp ?? 100))}" />
                                </div>
                                <div class="echoes-creator__field-row">
                                    <label>SP</label>
                                    <input data-action="creator-unit-field" data-field="sp" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.sp ?? 0))}" />
                                </div>
                                <div class="echoes-creator__field-row">
                                    <label>Defense Level</label>
                                    <input data-action="creator-unit-field" data-field="defenseLevel" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.defenseLevel ?? 0))}" />
                                </div>
                            </div>
                            <div class="echoes-editor-field-grid echoes-editor-field-grid--2">
                                <div class="echoes-creator__field-row">
                                    <label>Speed Min</label>
                                    <input data-action="creator-unit-speed" data-index="0" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.speedRange?.[0] ?? 1))}" />
                                </div>
                                <div class="echoes-creator__field-row">
                                    <label>Speed Max</label>
                                    <input data-action="creator-unit-speed" data-index="1" inputmode="numeric" value="${escapeAttribute(String(unitDraft?.speedRange?.[1] ?? 1))}" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <details class="echoes-editor-workshop__details" open>
                        <summary class="echoes-editor-workshop__details-summary">Card art &amp; sprites</summary>
                        <div class="echoes-editor-workshop__details-body">
                            <div class="echoes-creator__field-row">
                                <label>Splash art (binder portrait)</label>
                                <div class="echoes-editor-sprite-row">
                                    <input data-action="creator-unit-sprite" data-sprite-key="splash" value="${escapeAttribute(String(unitSprites?.splash || ''))}" placeholder="assets/... or URL or data:" />
                                    <input type="file" accept="image/*" data-action="creator-upload-sprite" data-sprite-key="splash" />
                                </div>
                                ${unitSprites?.splash ? `<img class="echoes-editor-sprite-preview echoes-editor-sprite-preview--large" src="${escapeAttribute(resolveCreatorSpriteUrl(unitSprites.splash))}" alt="splash" />` : ''}
                            </div>
                            ${['idle', 'moving', 'hurt', 'guard', 'evade'].map((key) => `
                                <div class="echoes-editor-sprite-row">
                                    <span class="echoes-editor-sprite-label">${escapeHtml(key)}</span>
                                    <input data-action="creator-unit-sprite" data-sprite-key="${escapeAttribute(key)}" value="${escapeAttribute(String(unitSprites?.[key] || ''))}" placeholder="assets/... or URL or data:" />
                                    <input type="file" accept="image/*" data-action="creator-upload-sprite" data-sprite-key="${escapeAttribute(key)}" />
                                </div>
                                ${unitSprites?.[key] ? `<img class="echoes-editor-sprite-preview" src="${escapeAttribute(resolveCreatorSpriteUrl(unitSprites[key]))}" alt="${escapeAttribute(key)}" />` : ''}
                            `).join('')}

                            <details class="echoes-editor-workshop__details">
                                <summary class="echoes-editor-workshop__details-summary">Skill sprites</summary>
                                <div class="echoes-editor-workshop__details-body">
                                    ${unitSkills.map((skill) => {
                                        const skillId = skill?.id || '';
                                        if (!skillId) {
                                            return '';
                                        }
                                        const spriteValue = unitSkillSprites?.[skillId] || '';
                                        return `
                                            <div class="echoes-editor-sprite-row echoes-editor-sprite-row--skill">
                                                <span class="echoes-battle-panel__combat-pill">${escapeHtml(skillId)}</span>
                                                <input data-action="creator-unit-skill-sprite" data-skill-id="${escapeAttribute(skillId)}" value="${escapeAttribute(String(spriteValue))}" placeholder="assets/... or URL or data:" />
                                                <input type="file" accept="image/*" data-action="creator-upload-skill-sprite" data-skill-id="${escapeAttribute(skillId)}" />
                                                <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-unit-clear-skill-sprite" data-skill-id="${escapeAttribute(skillId)}">Clear</button>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </details>
                        </div>
                    </details>

                    ${creatorUi?.renderUnitDefensesPanel?.(unitDraft, catalog, escapeAttribute, escapeHtml)
                        || ''}

                    ${movesetSheet?.renderMovesetSheet(unitDraft, catalog, creatorUi, escapeAttribute, escapeHtml)
                        || '<span class="echoes-creator__hint">Moveset sheet module not loaded.</span>'}

                    <details class="echoes-editor-workshop__details">
                        <summary class="echoes-editor-workshop__details-summary">${escapeHtml(LABELS.advancedBinding)}</summary>
                        <textarea
                            data-action="creator-json-input"
                            rows="14"
                            class="echoes-creator__raw-json"
                            placeholder='Paste a unit JSON object here...'
                        >${escapeHtml(state.creatorJsonInput || '')}</textarea>
                    </details>
                </div>
            `
            : '';

        const battleEditorMarkup = tab === 'editor' && entityType === 'battle'
            ? `
                <div class="echoes-creator echoes-editor-desk-panel">
                    <div class="echoes-editor-workshop__action-bar">
                        <button class="echoes-editor-workshop__action" type="button" data-action="creator-battle-new">${escapeHtml(LABELS.draftPack)}</button>
                        <button class="echoes-editor-workshop__action" type="button" data-action="creator-validate">${escapeHtml(LABELS.validate)}</button>
                        <button class="echoes-editor-workshop__action" type="button" data-action="creator-save-workshop">${escapeHtml(LABELS.bindToCollection)}</button>
                        <button class="echoes-editor-workshop__action echoes-editor-workshop__action--accent" type="button" data-action="creator-playtest">${escapeHtml(LABELS.trialRun)}</button>
                    </div>
                    ${encounterBuilder?.renderEncounterBuilder(
                        battleDraft,
                        unitListForEncounter,
                        catalog,
                        creatorUi,
                        escapeAttribute,
                        escapeHtml,
                        { hookTriggers: getCreatorHookTriggers() },
                    ) || '<span class="echoes-creator__hint">Encounter builder module not loaded.</span>'}
                    <details class="echoes-editor-workshop__details">
                        <summary class="echoes-editor-workshop__details-summary">${escapeHtml(LABELS.advancedBinding)}</summary>
                        <textarea
                            data-action="creator-json-input"
                            rows="14"
                            class="echoes-creator__raw-json"
                            placeholder='Paste a battle JSON object here...'
                        >${escapeHtml(state.creatorJsonInput || '')}</textarea>
                    </details>
                </div>
            `
            : '';

        const statusEditorMarkup = tab === 'editor' && entityType === 'status'
            ? `
                <div class="echoes-creator echoes-editor-desk-panel echoes-editor-effect-plate">
                    <div class="echoes-editor-workshop__action-bar">
                        <button class="echoes-editor-workshop__action" type="button" data-action="creator-status-new">New Status Effect</button>
                        <button class="echoes-editor-workshop__action" type="button" data-action="creator-validate">${escapeHtml(LABELS.validate)}</button>
                        <button class="echoes-editor-workshop__action" type="button" data-action="creator-save-workshop">${escapeHtml(LABELS.bindToCollection)}</button>
                        <select class="echoes-editor-workshop__select" data-action="creator-status-template-pick">
                            <option value="">— Start from template —</option>
                            ${statusTemplates.map((template) => `<option value="${escapeAttribute(template.id)}">${escapeHtml(template.label)}</option>`).join('')}
                        </select>
                        <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-status-apply-template">Use Template</button>
                    </div>

                    <p class="echoes-editor-workshop__tip">Forge a Status Effect: choose triggers, conditions, and outcomes — no JSON required for most effects.</p>

                    <div class="echoes-editor-field-grid echoes-editor-field-grid--2">
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

                    <details class="echoes-editor-workshop__details" open>
                        <summary class="echoes-editor-workshop__details-summary">Stack rules</summary>
                        <div class="echoes-editor-workshop__details-body">
                            <label class="echoes-creator__checkbox">
                                <input type="checkbox" data-action="creator-status-count-only" ${statusView?.draft?.countOnly ? 'checked' : ''} />
                                Count only (no potency — like Damage Up)
                            </label>
                            <div class="echoes-editor-field-grid echoes-editor-field-grid--2">
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

                    <details class="echoes-editor-workshop__details" open>
                        <summary class="echoes-editor-workshop__details-summary">Behavior — triggers &amp; effects</summary>
                        <div class="echoes-editor-workshop__details-body">
                            ${creatorUi?.renderHooksEditor(
                                statusView?.draft?.hooks || {},
                                catalog,
                                escapeAttribute,
                                escapeHtml,
                                'data-creator-scope="status"',
                            ) || '<span class="echoes-creator__hint">Creator UI module not loaded.</span>'}
                        </div>
                    </details>

                    <details class="echoes-editor-workshop__details">
                        <summary class="echoes-editor-workshop__details-summary">${escapeHtml(LABELS.advancedBinding)}</summary>
                        <textarea data-action="creator-json-input" rows="12" class="echoes-creator__raw-json">${escapeHtml(state.creatorJsonInput || '')}</textarea>
                    </details>
                </div>
            `
            : '';

        const deskMarkup = tab === 'library'
            ? `
                <div class="echoes-editor-desk-panel echoes-editor-desk-panel--collection">
                    <p class="echoes-editor-workshop__tip">Published sets are saved locally. Export a set to download its data payload, or uninstall to remove it from your collection.</p>
                </div>
            `
            : `
                ${entityType === 'unit' ? unitEditorMarkup : ''}
                ${entityType === 'status' ? statusEditorMarkup : ''}
                ${entityType === 'battle' ? battleEditorMarkup : ''}
            `;

        beginCreatorRenderLock();
        try {
            elements.creatorContent.innerHTML = editorWorkbench?.renderEditorWorkbenchShell({
                escapeHtml,
                tab,
                entityType,
                binderMarkup,
                deskMarkup,
                message,
            }) || `
                <div class="echoes-battle-panel__planner-empty">Workshop module not loaded.</div>
            `;
        } catch (error) {
            console.error(`${EXTENSION_ID}: creator screen render failed.`, error);
            setCreatorMessage('error', formatCombatModuleError(error));
        } finally {
            endCreatorRenderLock();
        }
        scheduleCreatorUiStateRestore(creatorUiState);
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

    function buildDriveAdvancedMarkup(selectedBattle, installedPacks) {
        const installedPackSummary = installedPacks.length
            ? `Installed packs: ${installedPacks.length}`
            : 'No installed packs';
        const contentImportMessage = formatContentImportMessage(state.contentImportMessage);
        const messageClass = state.contentImportMessage?.type === 'error'
            ? ' is-error'
            : ' is-success';
        const driveMenu = getDriveMenu();
        const advancedLabel = driveMenu?.DRIVE_LABELS?.advancedImport || 'Import / Export';

        return `
            <details class="echoes-drive__advanced">
                <summary class="echoes-drive__advanced-summary">${escapeHtml(advancedLabel)}</summary>
                <div class="echoes-drive__advanced-body">
                    <p class="echoes-drive__advanced-hint">Import a battle, unit, status, or full content pack JSON. Export the selected battle or a reusable dependency pack.</p>
                    <p class="echoes-drive__advanced-hint">Data-only JSON packs persist locally after import.</p>
                    <div class="echoes-drive__advanced-toolbar">
                        <span class="echoes-drive__deploy-pill">${escapeHtml(installedPackSummary)}</span>
                        <button class="echoes-drive__action echoes-drive__action--ghost" type="button" data-action="clear-installed-packs" ${installedPacks.length ? '' : 'disabled'}>Clear Installed Packs</button>
                    </div>
                    <textarea
                        class="echoes-drive__import-textarea"
                        data-action="content-json-input"
                        rows="6"
                        placeholder='{"id":"custom-battle","name":"Custom Battle","enemyUnitIds":[...]}'
                    >${escapeHtml(state.contentJsonInput || '')}</textarea>
                    <div class="echoes-drive__advanced-actions">
                        <button class="echoes-drive__action echoes-drive__action--ghost" type="button" data-action="import-content-json">Import JSON</button>
                        <button class="echoes-drive__action echoes-drive__action--ghost" type="button" data-action="import-content-file">Import File</button>
                        <button class="echoes-drive__action echoes-drive__action--ghost" type="button" data-action="export-selected-battle" ${selectedBattle ? '' : 'disabled'}>Export Battle</button>
                        <button class="echoes-drive__action echoes-drive__action--ghost" type="button" data-action="export-selected-pack" ${selectedBattle ? '' : 'disabled'}>Export Battle Pack</button>
                    </div>
                    ${contentImportMessage
                        ? `<div class="echoes-drive__message${messageClass}">${escapeHtml(contentImportMessage)}</div>`
                        : ''}
                </div>
            </details>
        `;
    }

    function renderBattleStartScreen() {
        if (!elements.combatContent) {
            return;
        }

        if (state.battleHandler) {
            state.battleHandler.render();
            return;
        }

        const driveMenu = getDriveMenu();

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

            elements.combatContent.innerHTML = driveMenu?.renderDriveShell({
                escapeHtml,
                bodyMarkup: `
                    <div class="echoes-drive__loading">
                        <p class="echoes-drive__preview-empty">Loading registered battle definitions...</p>
                    </div>
                `,
                footerMarkup: driveMenu.renderFooterNav('drive', escapeHtml),
            }) || `
                <div class="echoes-battle-panel__planner-empty">Loading registered battle definitions...</div>
            `;
            return;
        }

        const api = getBattleContentApi();
        const installedPacks = typeof api.listInstalledContentPacks === 'function'
            ? api.listInstalledContentPacks()
            : [];
        const installedPacksForDrive = getInstalledPacksForDrive();
        const chapters = driveMenu?.groupBattlesForDriveMenu(state.availableBattles, installedPacksForDrive) || [];
        const selectedBattle = state.availableBattles.find((battle) => battle.id === state.selectedBattleId)
            || state.availableBattles[0]
            || null;

        syncDriveChapterSelection();

        elements.combatContent.innerHTML = driveMenu?.renderDriveSelectScreen({
            escapeHtml,
            escapeAttribute,
            chapters,
            selectedChapterId: state.selectedDriveChapterId,
            selectedBattleId: state.selectedBattleId,
            selectedBattle,
            showDebugToolsToggle: Boolean(selectedBattle && !selectedBattle.isDebug),
            debugToolsEnabled: state.battleDebugToolsEnabled,
            advancedMarkup: buildDriveAdvancedMarkup(selectedBattle, installedPacks),
        }) || `
            <div class="echoes-battle-panel__planner-empty">Drive menu module not loaded.</div>
        `;
    }

    function renderDeployScreen() {
        if (!elements.combatContent) {
            return;
        }

        const driveMenu = getDriveMenu();
        const api = getBattleContentApi();
        const encounter = typeof api.getBattleDefinition === 'function'
            ? api.getBattleDefinition(state.selectedBattleId)
            : null;
        const selectedBattle = state.availableBattles.find((battle) => battle.id === state.selectedBattleId) || null;
        const activePreset = getActiveTeamPreset();
        const unitList = typeof api.listUnitDefinitions === 'function' ? api.listUnitDefinitions() : [];
        const encounterCap = Number.isInteger(encounter?.rules?.maxPlayerUnits)
            ? encounter.rules.maxPlayerUnits
            : null;
        const deployCap = encounterCap != null
            ? Math.min(encounterCap, COMBAT_MAX_PLAYER_UNITS)
            : COMBAT_MAX_PLAYER_UNITS;
        const selectedIds = Array.isArray(state.deploySelectedUnitIds) ? state.deploySelectedUnitIds : [];
        const teamUnitIds = Array.isArray(activePreset.unitIds) ? activePreset.unitIds : [];

        const deployCards = teamUnitIds.length
            ? teamUnitIds.map((unitId) => {
                const teamBuilder = getTeamBuilder();
                const unit = unitList.find((entry) => entry?.id === unitId);
                const checked = selectedIds.includes(unitId);
                if (teamBuilder?.renderIdentityCard) {
                    return teamBuilder.renderIdentityCard(unit, unitList, escapeAttribute, escapeHtml, {
                        variant: 'deploy',
                        unitId,
                        selectable: true,
                        selected: checked,
                        resolveAssetUrl: resolveExtensionUrl,
                    });
                }
                return '';
            }).join('')
            : '<p class="echoes-battle-panel__planner-empty">No units in the active team preset. Build your team in Characters first.</p>';

        const capHint = `<p class="echoes-drive__deploy-cap">Deploy up to ${deployCap} identities (combat field limit).</p>`;

        elements.combatContent.innerHTML = driveMenu?.renderDriveDeployScreen({
            escapeHtml,
            escapeAttribute,
            selectedBattle,
            encounterName: encounter?.name || selectedBattle?.name || 'Encounter',
            teamName: activePreset.name || 'Active team',
            capHintMarkup: capHint,
            deployCardsMarkup: deployCards,
        }) || `
            <div class="echoes-battle-panel__planner-empty">Drive menu module not loaded.</div>
        `;
    }

    async function initializeBattleHandler(battleId = state.selectedBattleId, options = {}) {
        if (!elements.combatContent) {
            return;
        }

        await prepareBattleSelection();

        const selectedBattleId = battleId || state.selectedBattleId;
        const api = getBattleContentApi();
        const encounter = typeof api.getBattleDefinition === 'function'
            ? api.getBattleDefinition(selectedBattleId)
            : null;
        if (!encounter) {
            throw new Error(`Battle definition "${selectedBattleId}" is not available.`);
        }

        let battleDefinition = encounter;
        const playerUnitIds = Array.isArray(options.playerUnitIds) ? options.playerUnitIds.filter(Boolean) : null;
        if (playerUnitIds?.length && typeof api.buildRuntimeBattleDefinition === 'function') {
            battleDefinition = api.buildRuntimeBattleDefinition(encounter, playerUnitIds);
        } else if (!isDebugBattleId(encounter.id) && typeof api.buildRuntimeBattleDefinition === 'function') {
            const teamIds = getActiveTeamUnitIds();
            if (teamIds.length) {
                battleDefinition = api.buildRuntimeBattleDefinition(encounter, teamIds);
            }
        }

        state.selectedBattleId = battleDefinition.id;
        state.combatPhase = 'select';

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
                playCombatSound,
            });
        }

        state.battleHandler.render();
    }

    function renderCombatScreen() {
        if (state.battleHandler) {
            state.battleHandler.render();
            return;
        }

        if (state.combatPhase === 'deploy') {
            renderDeployScreen();
            return;
        }

        renderBattleStartScreen();
    }

    async function renderCharacterSelectScreen() {
        if (!elements.characterScreen) {
            return;
        }

        try {
            await ensureBattleModuleLoaded();
        } catch (error) {
            console.error(`${EXTENSION_ID}: team builder module load failed.`, error);
            elements.characterScreen.innerHTML = `<p class="echoes-team__empty">Failed to load team builder.</p>`;
            return;
        }

        const teamBuilder = getTeamBuilder();
        const api = getBattleContentApi();
        if (!teamBuilder) {
            elements.characterScreen.innerHTML = `<p class="echoes-team__empty">Team builder is not available.</p>`;
            return;
        }

        ensureTeamPresetsLoaded();
        const unitList = typeof api.listUnitDefinitions === 'function' ? api.listUnitDefinitions() : [];
        elements.characterScreen.innerHTML = teamBuilder.renderTeamBuilder(
            state.teamPresets,
            unitList,
            escapeAttribute,
            escapeHtml,
            {
                rosterFilter: state.teamRosterFilter,
                resolveAssetUrl: resolveExtensionUrl,
            },
        );
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

        const { action, battleId, chapterId } = actionTarget.dataset;

        if (action === 'select-drive-chapter' && chapterId) {
            const driveMenu = getDriveMenu();
            const chapters = driveMenu?.groupBattlesForDriveMenu(
                state.availableBattles,
                getInstalledPacksForDrive(),
            ) || [];
            state.selectedDriveChapterId = chapterId;
            const chapter = chapters.find((entry) => entry.chapterId === chapterId);
            if (chapter && !chapter.encounters.some((encounter) => encounter.id === state.selectedBattleId)) {
                state.selectedBattleId = chapter.encounters[0]?.id || state.selectedBattleId;
            }
            state.combatPhase = 'select';
            renderBattleStartScreen();
            return;
        }

        if (action === 'drive-nav-sinners') {
            void handleCharacterTrayButtonClick();
            return;
        }

        if (action === 'drive-nav-workshop') {
            void handleCreatorTrayButtonClick();
            return;
        }

        if (action === 'select-battle' && battleId) {
            state.selectedBattleId = battleId;
            state.combatPhase = 'select';
            const driveMenu = getDriveMenu();
            const chapterForBattle = driveMenu?.findChapterForBattle(
                driveMenu.groupBattlesForDriveMenu(state.availableBattles, getInstalledPacksForDrive()),
                battleId,
            );
            if (chapterForBattle) {
                state.selectedDriveChapterId = chapterForBattle.chapterId;
            }
            renderBattleStartScreen();
            return;
        }

        if (action === 'launch-selected-battle') {
            try {
                if (isDebugBattleId(state.selectedBattleId)) {
                    await initializeBattleHandler(state.selectedBattleId);
                    renderCombatScreen();
                    return;
                }
                state.combatPhase = 'deploy';
                state.deploySelectedUnitIds = getActiveTeamUnitIds();
                renderDeployScreen();
            } catch (error) {
                console.error(`${EXTENSION_ID}: combat module initialization failed.`, error);
                renderCombatLoadError(error);
            }
            return;
        }

        if (action === 'cancel-deployment') {
            state.combatPhase = 'select';
            renderBattleStartScreen();
            return;
        }

        if (action === 'confirm-deployment') {
            try {
                const selectedIds = Array.isArray(state.deploySelectedUnitIds)
                    ? state.deploySelectedUnitIds.filter(Boolean)
                    : [];
                if (!selectedIds.length) {
                    throw new Error('Select at least one unit to deploy.');
                }
                const encounter = getBattleContentApi().getBattleDefinition?.(state.selectedBattleId);
                const encounterCap = Number.isInteger(encounter?.rules?.maxPlayerUnits)
                    ? encounter.rules.maxPlayerUnits
                    : null;
                const maxPlayerUnits = encounterCap != null
                    ? Math.min(encounterCap, COMBAT_MAX_PLAYER_UNITS)
                    : COMBAT_MAX_PLAYER_UNITS;
                if (selectedIds.length > maxPlayerUnits) {
                    throw new Error(`Combat supports up to ${maxPlayerUnits} identities per side.`);
                }
                await initializeBattleHandler(state.selectedBattleId, { playerUnitIds: selectedIds });
                renderCombatScreen();
            } catch (error) {
                console.error(`${EXTENSION_ID}: deployment failed.`, error);
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
            if (state.combatPhase === 'deploy') {
                renderDeployScreen();
            } else {
                renderBattleStartScreen();
            }
            return;
        }

        const deployToggle = event.target.closest('[data-action="toggle-deploy-unit"]');
        if (deployToggle) {
            const unitId = deployToggle.dataset.unitId || '';
            if (!unitId) {
                return;
            }
            const api = getBattleContentApi();
            const encounter = api.getBattleDefinition?.(state.selectedBattleId);
            const encounterCap = Number.isInteger(encounter?.rules?.maxPlayerUnits)
                ? encounter.rules.maxPlayerUnits
                : null;
            const maxPlayerUnits = encounterCap != null
                ? Math.min(encounterCap, COMBAT_MAX_PLAYER_UNITS)
                : COMBAT_MAX_PLAYER_UNITS;
            const selected = new Set(state.deploySelectedUnitIds || []);
            if (deployToggle.checked) {
                if (maxPlayerUnits != null && selected.size >= maxPlayerUnits && !selected.has(unitId)) {
                    deployToggle.checked = false;
                    return;
                }
                selected.add(unitId);
            } else {
                selected.delete(unitId);
            }
            state.deploySelectedUnitIds = [...selected];
            renderDeployScreen();
            return;
        }

        state.battleHandler?.handleChange?.(event);
    }

    async function handleCreatorContentClick(event) {
        const laneAddButton = event.target.closest('[data-creator-action="lane-add-effect"]');
        if (laneAddButton) {
            event.preventDefault();
            handleCreatorLaneAddEffect(laneAddButton);
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) {
            return;
        }
        if (actionTarget.tagName === 'BUTTON') {
            event.preventDefault();
            event.stopPropagation();
        }
        const action = actionTarget.dataset.action || actionTarget.getAttribute('data-action');

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
            state.creatorUnitDraftCache = null;
            state.creatorBattleDraftCache = null;
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
            state.creatorUnitDraftCache = null;
            state.creatorBattleDraftCache = null;
            if (entityType === 'unit' && definition) {
                state.creatorUnitDraftCache = cloneCreatorDraft(definition);
                state.creatorJsonInput = JSON.stringify(definition, null, 2);
            } else if (entityType === 'battle' && definition) {
                const authoring = battleDefinitionToAuthoringDraft(definition);
                state.creatorBattleDraftCache = cloneCreatorDraft(authoring);
                state.creatorJsonInput = JSON.stringify(authoring, null, 2);
            } else {
                state.creatorJsonInput = definition ? JSON.stringify(definition, null, 2) : '';
            }
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
            return;
        }

        if (action === 'creator-battle-new') {
            updateCreatorBattleJson((draft) => {
                const next = createDefaultBattleDefinition();
                Object.keys(draft).forEach((key) => delete draft[key]);
                Object.assign(draft, next);
            });
            state.creatorSelectedId = null;
            setCreatorMessage('success', 'Created a new encounter draft.');
            renderCreatorScreen();
            return;
        }

        if (action === 'creator-encounter-remove-unit') {
            const listKind = actionTarget.dataset.listKind || '';
            const unitIndex = Number(actionTarget.dataset.unitIndex);
            const waveIndex = actionTarget.dataset.waveIndex !== undefined && actionTarget.dataset.waveIndex !== ''
                ? Number(actionTarget.dataset.waveIndex)
                : null;
            if (!Number.isInteger(unitIndex)) {
                return;
            }
            updateCreatorBattleJson((draft) => {
                if (listKind === 'enemy') {
                    draft.enemyUnitIds = Array.isArray(draft.enemyUnitIds) ? draft.enemyUnitIds : [];
                    draft.enemyUnitIds.splice(unitIndex, 1);
                    return;
                }
                if (listKind === 'wave-enemy' && Number.isInteger(waveIndex)) {
                    draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                    draft.rules.waves = Array.isArray(draft.rules.waves) ? draft.rules.waves : [];
                    const wave = draft.rules.waves[waveIndex];
                    if (wave?.enemyUnitIds) {
                        wave.enemyUnitIds.splice(unitIndex, 1);
                    }
                }
            });
            rerenderCreatorAfterBattleEdit();
            return;
        }

        if (action === 'creator-encounter-add-wave') {
            updateCreatorBattleJson((draft) => {
                draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                draft.rules.waves = Array.isArray(draft.rules.waves) ? draft.rules.waves : [];
                draft.rules.waves.push({ enemyUnitIds: [] });
            });
            rerenderCreatorAfterBattleEdit();
            return;
        }

        if (action === 'creator-encounter-remove-wave') {
            const waveIndex = Number(actionTarget.dataset.waveIndex);
            if (!Number.isInteger(waveIndex)) {
                return;
            }
            updateCreatorBattleJson((draft) => {
                draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                draft.rules.waves = Array.isArray(draft.rules.waves) ? draft.rules.waves : [];
                draft.rules.waves.splice(waveIndex, 1);
                if (!draft.rules.waves.length) {
                    delete draft.rules.waves;
                }
            });
            rerenderCreatorAfterBattleEdit();
            return;
        }

        if (action === 'creator-scripted-event-add') {
            updateCreatorBattleJson((draft) => {
                draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                draft.rules.scriptedEvents = Array.isArray(draft.rules.scriptedEvents) ? draft.rules.scriptedEvents : [];
                draft.rules.scriptedEvents.push({
                    id: `evt_${draft.rules.scriptedEvents.length + 1}`,
                    trigger: 'battleStart',
                    side: 'player',
                    hook: [{
                        type: 'applyStatus',
                        target: 'self',
                        statusId: '',
                        count: 1,
                    }],
                });
            });
            rerenderCreatorAfterBattleEdit();
            return;
        }

        if (action === 'creator-scripted-event-remove') {
            const eventIndex = Number(actionTarget.dataset.eventIndex);
            if (!Number.isInteger(eventIndex)) {
                return;
            }
            updateCreatorBattleJson((draft) => {
                draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                draft.rules.scriptedEvents = Array.isArray(draft.rules.scriptedEvents) ? draft.rules.scriptedEvents : [];
                draft.rules.scriptedEvents.splice(eventIndex, 1);
                if (!draft.rules.scriptedEvents.length) {
                    delete draft.rules.scriptedEvents;
                }
            });
            rerenderCreatorAfterBattleEdit();
            return;
        }

        if (action === 'creator-scripted-event-add-action') {
            const eventIndex = Number(actionTarget.dataset.eventIndex);
            if (!Number.isInteger(eventIndex)) {
                return;
            }
            updateCreatorBattleJson((draft) => {
                draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                draft.rules.scriptedEvents = Array.isArray(draft.rules.scriptedEvents) ? draft.rules.scriptedEvents : [];
                const event = draft.rules.scriptedEvents[eventIndex];
                if (!event || typeof event !== 'object') {
                    return;
                }
                event.hook = Array.isArray(event.hook) ? event.hook : [];
                event.hook.push({
                    type: 'applyStatus',
                    target: 'self',
                    statusId: '',
                    potency: 1,
                    count: 1,
                });
            });
            rerenderCreatorAfterBattleEdit();
            return;
        }

        if (action === 'creator-scripted-event-remove-action') {
            const eventIndex = Number(actionTarget.dataset.eventIndex);
            const actionIndex = Number(actionTarget.dataset.actionIndex);
            if (!Number.isInteger(eventIndex) || !Number.isInteger(actionIndex)) {
                return;
            }
            updateCreatorBattleJson((draft) => {
                draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                draft.rules.scriptedEvents = Array.isArray(draft.rules.scriptedEvents) ? draft.rules.scriptedEvents : [];
                const event = draft.rules.scriptedEvents[eventIndex];
                if (!event?.hook) {
                    return;
                }
                event.hook.splice(actionIndex, 1);
            });
            rerenderCreatorAfterBattleEdit();
            return;
        }

        if (action === 'creator-unit-stagger-add') {
            updateCreatorUnitJson((draft) => {
                draft.staggerThresholds = Array.isArray(draft.staggerThresholds) ? draft.staggerThresholds : [];
                draft.staggerThresholds.push(0.5);
            });
            rerenderCreatorAfterUnitEdit({ full: true });
            return;
        }

        if (action === 'creator-unit-stagger-remove') {
            const staggerIndex = Number(actionTarget.dataset.staggerIndex);
            if (!Number.isInteger(staggerIndex)) {
                return;
            }
            updateCreatorUnitJson((draft) => {
                draft.staggerThresholds = Array.isArray(draft.staggerThresholds) ? draft.staggerThresholds : [];
                draft.staggerThresholds.splice(staggerIndex, 1);
            });
            rerenderCreatorAfterUnitEdit({ full: true });
            return;
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
            rerenderCreatorAfterUnitEdit();
        }

        if (action === 'creator-unit-remove-passive') {
            const index = Number(actionTarget.dataset.index);
            if (Number.isInteger(index)) {
                updateCreatorUnitJson((draft) => {
                    draft.passives = Array.isArray(draft.passives) ? draft.passives : [];
                    draft.passives.splice(index, 1);
                });
                rerenderCreatorAfterUnitEdit();
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
            rerenderCreatorAfterUnitEdit();
            return;
        }

        if (action === 'creator-unit-skill-add-effect') {
            const index = Number(actionTarget.dataset.index ?? actionTarget.dataset.skillIndex);
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
                rerenderCreatorAfterUnitEdit();
            }
            return;
        }

        if (action === 'creator-skill-add-preset') {
            const skillIndex = Number(actionTarget.dataset.skillIndex);
            const presetPick = elements.creatorContent?.querySelector(`[data-action="creator-skill-preset-pick"][data-skill-index="${skillIndex}"]`);
            const presetIndex = Number(presetPick?.value);
            const creatorUi = getCreatorUi();
            const presets = creatorUi?.SKILL_EFFECT_PRESETS || [];
            const preset = Number.isInteger(presetIndex) ? presets[presetIndex] : null;
            if (Number.isInteger(skillIndex) && preset) {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[skillIndex];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    skill.effects = Array.isArray(skill.effects) ? skill.effects : [];
                    skill.effects.push({ ...preset, label: undefined });
                    const last = skill.effects[skill.effects.length - 1];
                    delete last.label;
                });
                rerenderCreatorAfterUnitEdit();
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
                rerenderCreatorAfterUnitEdit();
            }
            return;
        }

        if (action === 'creator-lane-add-effect') {
            handleCreatorLaneAddEffect(actionTarget);
            return;
        }

        if (action === 'creator-skill-add-variant') {
            const index = Number(actionTarget.dataset.index);
            if (Number.isInteger(index)) {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const base = draft.skills[index];
                    if (!base || typeof base !== 'object') {
                        return;
                    }
                    const slot = base.skillSlot || base.id || `slot-${index + 1}`;
                    base.skillSlot = slot;
                    const variantId = `${base.id || 'skill'}-variant-${draft.skills.length + 1}`;
                    draft.skills.push({
                        ...JSON.parse(JSON.stringify(base)),
                        id: variantId,
                        name: `${base.name || base.id || 'Skill'} (variant)`,
                        skillSlot: slot,
                        variantPriority: (Number.isInteger(base.variantPriority) ? base.variantPriority : 0) + 1,
                        variantConditions: [{
                            type: 'statusCountAtLeast',
                            target: 'self',
                            statusId: '',
                            value: 1,
                        }],
                    });
                });
                rerenderCreatorAfterUnitEdit();
            }
            return;
        }

        if (action === 'creator-skill-variant-add-condition') {
            const index = Number(actionTarget.dataset.skillIndex);
            if (Number.isInteger(index)) {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[index];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    skill.variantConditions = Array.isArray(skill.variantConditions) ? skill.variantConditions : [];
                    skill.variantConditions.push({
                        type: 'statusCountAtLeast',
                        target: 'self',
                        statusId: '',
                        value: 1,
                    });
                });
                rerenderCreatorAfterUnitEdit();
            }
            return;
        }

        if (action === 'creator-skill-variant-remove-condition') {
            const index = Number(actionTarget.dataset.skillIndex);
            const condIndex = Number(actionTarget.dataset.conditionIndex);
            if (Number.isInteger(index) && Number.isInteger(condIndex)) {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[index];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    skill.variantConditions = Array.isArray(skill.variantConditions) ? skill.variantConditions : [];
                    skill.variantConditions.splice(condIndex, 1);
                    if (!skill.variantConditions.length) {
                        delete skill.variantConditions;
                    }
                });
                rerenderCreatorAfterUnitEdit();
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
                rerenderCreatorAfterUnitEdit();
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
                rerenderCreatorAfterUnitEdit({ full: true });
            }
        }
    }

    function handleCreatorContentChange(event) {
        if (state.creatorRenderLock) {
            return;
        }

        const textarea = event.target.closest('[data-action="creator-json-input"]');
        if (textarea) {
            state.creatorJsonInput = textarea.value || '';
            try {
                const parsed = JSON.parse(state.creatorJsonInput || '{}');
                if (state.creatorEntityType === 'unit' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    state.creatorUnitDraftCache = cloneCreatorDraft(parsed);
                }
                if (state.creatorEntityType === 'battle' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    state.creatorBattleDraftCache = cloneCreatorDraft(parsed);
                }
            } catch {
                // Keep editing; cache retains last valid draft.
            }
            return;
        }

        const encounterUnitPick = event.target.closest('[data-action="creator-encounter-unit-pick"]');
        if (encounterUnitPick && encounterUnitPick.value) {
            const listKind = encounterUnitPick.dataset.listKind || '';
            const unitId = encounterUnitPick.value;
            const waveIndexRaw = encounterUnitPick.dataset.waveIndex;
            const waveIndex = waveIndexRaw !== undefined && String(waveIndexRaw) !== '' ? Number(waveIndexRaw) : null;
            updateCreatorBattleJson((draft) => {
                if (listKind === 'enemy') {
                    draft.enemyUnitIds = Array.isArray(draft.enemyUnitIds) ? draft.enemyUnitIds : [];
                    if (!draft.enemyUnitIds.includes(unitId)) {
                        draft.enemyUnitIds.push(unitId);
                    }
                    return;
                }
                if (listKind === 'wave-enemy' && Number.isInteger(waveIndex)) {
                    draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                    draft.rules.waves = Array.isArray(draft.rules.waves) ? draft.rules.waves : [];
                    if (!draft.rules.waves[waveIndex]) {
                        draft.rules.waves[waveIndex] = { enemyUnitIds: [] };
                    }
                    draft.rules.waves[waveIndex].enemyUnitIds = Array.isArray(draft.rules.waves[waveIndex].enemyUnitIds)
                        ? draft.rules.waves[waveIndex].enemyUnitIds
                        : [];
                    if (!draft.rules.waves[waveIndex].enemyUnitIds.includes(unitId)) {
                        draft.rules.waves[waveIndex].enemyUnitIds.push(unitId);
                    }
                }
            });
            encounterUnitPick.value = '';
            rerenderCreatorAfterBattleEdit();
            return;
        }

        const encounterMultiWave = event.target.closest('[data-action="creator-encounter-multi-wave"]');
        if (encounterMultiWave) {
            updateCreatorBattleJson((draft) => {
                draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                if (encounterMultiWave.checked) {
                    const enemyIds = Array.isArray(draft.enemyUnitIds) ? draft.enemyUnitIds.slice() : [];
                    draft.rules.waves = [{ enemyUnitIds: enemyIds }];
                } else {
                    delete draft.rules.waves;
                }
            });
            rerenderCreatorAfterBattleEdit();
            return;
        }

        const battleField = event.target.closest('[data-action="creator-battle-field"]');
        if (battleField) {
            const field = battleField.dataset.field || null;
            if (field) {
                updateCreatorBattleJson((draft) => {
                    draft[field] = normalizeStringInput(battleField.value, '');
                });
                rerenderCreatorAfterBattleEdit();
            }
            return;
        }

        const battleRulesField = event.target.closest('[data-action="creator-battle-rules-field"]');
        if (battleRulesField) {
            const field = battleRulesField.dataset.field || null;
            if (field) {
                updateCreatorBattleJson((draft) => {
                    draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                    if (field === 'maxTurns') {
                        draft.rules.maxTurns = Math.max(1, Math.round(normalizeNumberInput(battleRulesField.value, draft.rules.maxTurns ?? 100)));
                    } else if (field.startsWith('background.')) {
                        const subField = field.slice('background.'.length);
                        const value = normalizeStringInput(battleRulesField.value, '');
                        if (!draft.rules.background || typeof draft.rules.background !== 'object') {
                            draft.rules.background = {};
                        }
                        if (value) {
                            draft.rules.background[subField] = value;
                        } else {
                            delete draft.rules.background[subField];
                            if (!Object.keys(draft.rules.background).length) {
                                delete draft.rules.background;
                            }
                        }
                    } else {
                        draft.rules[field] = normalizeStringInput(battleRulesField.value, draft.rules[field] || '');
                    }
                });
                rerenderCreatorAfterBattleEdit();
            }
            return;
        }

        const battleAiField = event.target.closest('[data-action="creator-battle-ai-field"]');
        if (battleAiField) {
            const field = battleAiField.dataset.field || null;
            if (field) {
                updateCreatorBattleJson((draft) => {
                    draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                    draft.rules.enemyAiProfile = draft.rules.enemyAiProfile && typeof draft.rules.enemyAiProfile === 'object'
                        ? draft.rules.enemyAiProfile
                        : { skill: 'cycle', target: 'mirror' };
                    draft.rules.enemyAiProfile[field] = normalizeStringInput(battleAiField.value, draft.rules.enemyAiProfile[field] || '');
                });
                rerenderCreatorAfterBattleEdit();
            }
            return;
        }

        const scriptedEventField = event.target.closest('[data-action="creator-scripted-event-field"]');
        if (scriptedEventField) {
            const eventIndex = Number(scriptedEventField.dataset.eventIndex);
            const field = scriptedEventField.dataset.field || null;
            if (Number.isInteger(eventIndex) && field) {
                updateCreatorBattleJson((draft) => {
                    draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                    draft.rules.scriptedEvents = Array.isArray(draft.rules.scriptedEvents) ? draft.rules.scriptedEvents : [];
                    const entry = draft.rules.scriptedEvents[eventIndex];
                    if (!entry || typeof entry !== 'object') {
                        return;
                    }
                    const rawValue = normalizeStringInput(scriptedEventField.value, '');
                    if (field === 'side' && !rawValue) {
                        delete entry.side;
                    } else if (field === 'unitId' && !rawValue) {
                        delete entry.unitId;
                    } else if (field === 'threshold') {
                        if (!rawValue) {
                            delete entry.threshold;
                        } else {
                            const thresholdValue = Number(rawValue);
                            if (Number.isFinite(thresholdValue)) {
                                entry.threshold = thresholdValue;
                            }
                        }
                    } else {
                        entry[field] = rawValue;
                    }
                });
                rerenderCreatorAfterBattleEdit();
            }
            return;
        }

        const scriptedEventActionField = event.target.closest('[data-action="creator-scripted-event-action-field"]');
        if (scriptedEventActionField) {
            const creatorUi = getCreatorUi();
            const eventIndex = Number(scriptedEventActionField.dataset.eventIndex);
            const actionIndex = Number(scriptedEventActionField.dataset.actionIndex);
            const field = scriptedEventActionField.dataset.field || null;
            if (Number.isInteger(eventIndex) && Number.isInteger(actionIndex) && (field || scriptedEventActionField.dataset.amountMode)) {
                const rawValue = scriptedEventActionField.type === 'checkbox'
                    ? scriptedEventActionField.checked
                    : (scriptedEventActionField.value ?? '');
                const amountMode = scriptedEventActionField.dataset.amountMode || null;
                const amountSubField = scriptedEventActionField.dataset.amountField || null;
                updateCreatorBattleJson((draft) => {
                    draft.rules = draft.rules && typeof draft.rules === 'object' ? draft.rules : {};
                    draft.rules.scriptedEvents = Array.isArray(draft.rules.scriptedEvents) ? draft.rules.scriptedEvents : [];
                    const entry = draft.rules.scriptedEvents[eventIndex];
                    if (!entry || typeof entry !== 'object') {
                        return;
                    }
                    entry.hook = Array.isArray(entry.hook) ? entry.hook : [];
                    const effect = entry.hook[actionIndex];
                    if (!effect || typeof effect !== 'object') {
                        return;
                    }
                    if (creatorUi) {
                        creatorUi.applyEffectFieldUpdate(effect, field || 'amount', rawValue, { amountMode, amountSubField });
                    }
                });
                rerenderCreatorAfterBattleEdit();
            }
            return;
        }

        const unitResistance = event.target.closest('[data-action="creator-unit-resistance"]');
        if (unitResistance) {
            const kind = unitResistance.dataset.resistanceKind || 'physical';
            const key = unitResistance.dataset.resistanceKey || '';
            if (key) {
                updateCreatorUnitJson((draft) => {
                    draft.resistances = draft.resistances && typeof draft.resistances === 'object' ? draft.resistances : {};
                    if (kind === 'physical') {
                        draft.resistances.physical = draft.resistances.physical && typeof draft.resistances.physical === 'object'
                            ? draft.resistances.physical
                            : {};
                        draft.resistances.physical[key] = normalizeNumberInput(unitResistance.value, 1);
                    } else {
                        draft.resistances.sin = draft.resistances.sin && typeof draft.resistances.sin === 'object'
                            ? draft.resistances.sin
                            : {};
                        draft.resistances.sin[key] = normalizeNumberInput(unitResistance.value, 1);
                    }
                });
                rerenderCreatorAfterUnitEdit({ full: true });
            }
            return;
        }

        const staggerField = event.target.closest('[data-action="creator-unit-stagger-field"]');
        if (staggerField) {
            const staggerIndex = Number(staggerField.dataset.staggerIndex);
            if (Number.isInteger(staggerIndex)) {
                updateCreatorUnitJson((draft) => {
                    draft.staggerThresholds = Array.isArray(draft.staggerThresholds) ? draft.staggerThresholds : [];
                    const value = normalizeNumberInput(staggerField.value, 0);
                    draft.staggerThresholds[staggerIndex] = Math.min(1, Math.max(0, value));
                });
                rerenderCreatorAfterUnitEdit({ full: true });
            }
            return;
        }

        const unitDeployment = event.target.closest('[data-action="creator-unit-deployment"]');
        if (unitDeployment) {
            updateCreatorUnitJson((draft) => {
                const trimmed = String(unitDeployment.value ?? '').trim();
                if (trimmed) {
                    draft.deploymentOrder = Math.max(1, Math.round(normalizeNumberInput(trimmed, 1)));
                } else {
                    delete draft.deploymentOrder;
                }
            });
            rerenderCreatorAfterUnitEdit({ full: true });
            return;
        }

        const unitSlotWeight = event.target.closest('[data-action="creator-unit-slot-weight"]');
        if (unitSlotWeight) {
            updateCreatorUnitJson((draft) => {
                const trimmed = String(unitSlotWeight.value ?? '').trim();
                if (trimmed) {
                    draft.slotWeight = Math.max(1, Math.round(normalizeNumberInput(trimmed, 1)));
                } else {
                    delete draft.slotWeight;
                }
            });
            rerenderCreatorAfterUnitEdit({ full: true });
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
            rerenderCreatorAfterUnitEdit({ full: true });
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
            rerenderCreatorAfterUnitEdit({ full: true });
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
                rerenderCreatorAfterUnitEdit({ full: true });
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
                rerenderCreatorAfterUnitEdit({ full: true });
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
                rerenderCreatorAfterUnitEdit();
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

        const hookFieldTarget = event.target.closest('[data-action="creator-hook-condition-field"], [data-action="creator-hook-action-field"], [data-action="creator-simple-effect-field"], [data-action="creator-hook-block-field"], [data-action="creator-skill-variant-condition-field"]');
        if (hookFieldTarget) {
            const creatorUi = getCreatorUi();
            const actionName = hookFieldTarget.dataset.action;

            if (actionName === 'creator-skill-variant-condition-field') {
                const skillIndex = Number(hookFieldTarget.dataset.skillIndex);
                const condIndex = Number(hookFieldTarget.dataset.conditionIndex);
                const variantField = hookFieldTarget.dataset.field || null;
                const variantRawValue = hookFieldTarget.type === 'checkbox' ? hookFieldTarget.checked : (hookFieldTarget.value ?? '');
                if (!Number.isInteger(skillIndex) || !Number.isInteger(condIndex) || !variantField) {
                    return;
                }
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[skillIndex];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    skill.variantConditions = Array.isArray(skill.variantConditions) ? skill.variantConditions : [];
                    const condition = skill.variantConditions[condIndex];
                    if (condition && creatorUi) {
                        creatorUi.applyConditionFieldUpdate(condition, variantField, variantRawValue);
                    }
                });
                rerenderCreatorAfterUnitEdit();
                return;
            }

            const scope = hookFieldTarget.dataset.creatorScope || null;
            const hookName = hookFieldTarget.dataset.hookName || null;
            const entryIndex = Number(hookFieldTarget.dataset.hookEntryIndex);
            const field = hookFieldTarget.dataset.field || null;
            const rawValue = hookFieldTarget.type === 'checkbox' ? hookFieldTarget.checked : (hookFieldTarget.value ?? '');
            const amountMode = hookFieldTarget.dataset.amountMode || null;
            const amountSubField = hookFieldTarget.dataset.amountField || null;
            if (!scope || !hookName || !Number.isInteger(entryIndex) || (!field && !amountMode)) {
                return;
            }
            const entityType = scope === 'status' ? 'status' : 'unit';
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
                    creatorUi.applyEffectFieldUpdate(effect, field || 'amount', rawValue, { amountMode, amountSubField });
                }
            });
            rerenderCreatorHookEditor(entityType, scope);
            return;
        }

        const skillEffectField = event.target.closest('[data-action="creator-skill-effect-field"], [data-action="creator-unit-skill-effect-field"]');
        if (skillEffectField) {
            const creatorUi = getCreatorUi();
            const skillIndex = Number(skillEffectField.dataset.skillIndex);
            const effectIndex = Number(skillEffectField.dataset.effectIndex);
            const field = skillEffectField.dataset.field || null;
            if (Number.isInteger(skillIndex) && Number.isInteger(effectIndex) && (field || skillEffectField.dataset.amountMode)) {
                const rawValue = skillEffectField.type === 'checkbox' ? skillEffectField.checked : (skillEffectField.value ?? '');
                const amountMode = skillEffectField.dataset.amountMode || null;
                const amountSubField = skillEffectField.dataset.amountField || null;
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
                        creatorUi.applyEffectFieldUpdate(effect, field || 'amount', rawValue, { amountMode, amountSubField });
                    }
                });
                rerenderCreatorAfterUnitEdit();
            }
            return;
        }

        const skillToggle = event.target.closest('[data-action="creator-unit-skill-toggle"]');
        if (skillToggle) {
            const index = Number(skillToggle.dataset.index);
            const field = skillToggle.dataset.field || null;
            if (Number.isInteger(index) && field === 'showInPlanner') {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[index];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    if (skillToggle.checked) {
                        delete skill.showInPlanner;
                    } else {
                        skill.showInPlanner = false;
                    }
                });
                rerenderCreatorAfterUnitEdit();
            }
            return;
        }

        const passiveReq = event.target.closest('[data-action="creator-passive-req"]');
        if (passiveReq) {
            const index = Number(passiveReq.dataset.index);
            const field = passiveReq.dataset.field || null;
            if (Number.isInteger(index) && field) {
                updateCreatorUnitJson((draft) => {
                    draft.passives = Array.isArray(draft.passives) ? draft.passives : [];
                    const passive = draft.passives[index];
                    if (!passive || typeof passive !== 'object') {
                        return;
                    }
                    passive.requirements = passive.requirements && typeof passive.requirements === 'object'
                        ? passive.requirements
                        : {};
                    if (field === 'owned') {
                        if (passiveReq.checked) {
                            passive.requirements.owned = true;
                            delete passive.requirements.resonance;
                        } else {
                            delete passive.requirements.owned;
                        }
                    } else if (field === 'resonanceSinType') {
                        passive.requirements.resonance = passive.requirements.resonance || {};
                        delete passive.requirements.owned;
                        const sinType = normalizeStringInput(passiveReq.value, '');
                        if (sinType) {
                            passive.requirements.resonance.sinType = sinType;
                        } else {
                            delete passive.requirements.resonance.sinType;
                        }
                    } else if (field === 'resonanceMinimum') {
                        passive.requirements.resonance = passive.requirements.resonance || {};
                        delete passive.requirements.owned;
                        passive.requirements.resonance = passive.requirements.resonance || {};
                        const trimmed = String(passiveReq.value ?? '').trim();
                        if (trimmed) {
                            passive.requirements.resonance.minimum = Math.round(normalizeNumberInput(trimmed, 0));
                        } else {
                            delete passive.requirements.resonance.minimum;
                        }
                    }
                    if (passive.requirements.resonance && !passive.requirements.resonance.sinType && !passive.requirements.resonance.minimum) {
                        delete passive.requirements.resonance;
                    }
                    if (!passive.requirements.owned && !passive.requirements.resonance) {
                        delete passive.requirements;
                    }
                });
                rerenderCreatorAfterUnitEdit();
            }
            return;
        }

        const skillTags = event.target.closest('[data-action="creator-unit-skill-tags"]');
        if (skillTags) {
            const index = Number(skillTags.dataset.index);
            if (Number.isInteger(index)) {
                updateCreatorUnitJson((draft) => {
                    draft.skills = Array.isArray(draft.skills) ? draft.skills : [];
                    const skill = draft.skills[index];
                    if (!skill || typeof skill !== 'object') {
                        return;
                    }
                    skill.tags = String(skillTags.value || '')
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean);
                });
                rerenderCreatorAfterUnitEdit();
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
                rerenderCreatorAfterUnitEdit();
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
                    if (['id', 'name', 'damageType', 'sinType', 'skillType', 'description', 'skillSlot'].includes(field)) {
                        skill[field] = normalizeStringInput(skillField.value, '');
                        if (field === 'skillSlot' && !skill[field]) {
                            delete skill.skillSlot;
                        }
                        return;
                    }
                    if (['basePower', 'coinPower', 'coinCount', 'offenseLevel', 'variantPriority', 'attackWeight'].includes(field)) {
                        const fallback = skill[field] ?? 0;
                        const parsed = normalizeNumberInput(skillField.value, fallback);
                        if ((field === 'offenseLevel' || field === 'variantPriority' || field === 'attackWeight') && !String(skillField.value ?? '').trim()) {
                            delete skill[field];
                        } else {
                            skill[field] = Math.round(parsed);
                        }
                    }
                });
                rerenderCreatorAfterUnitEdit();
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
                rerenderCreatorAfterUnitEdit();
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
                    rerenderCreatorAfterUnitEdit({ full: true });
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

    function playCombatSound(soundId) {
        if (!soundId || !state.audioUnlocked) {
            return;
        }

        const volume = 0.88;
        if (playBufferedAudio(soundId, volume)) {
            return;
        }

        const relativePath = COMBAT_AUDIO_PATHS[soundId];
        if (!relativePath) {
            return;
        }

        try {
            const audioInstance = new Audio(resolveExtensionUrl(relativePath));
            audioInstance.volume = volume;
            const playPromise = audioInstance.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        } catch (error) {
            console.debug(`${EXTENSION_ID}: combat audio playback skipped.`, error);
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

        if (isCharacterSelectOpen) {
            void renderCharacterSelectScreen();
        }
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

    async function handleCharacterScreenClick(event) {
        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) {
            return;
        }

        const { action } = actionTarget.dataset;
        const teamBuilder = getTeamBuilder();
        if (!teamBuilder) {
            return;
        }

        ensureTeamPresetsLoaded();
        const normalized = teamBuilder.normalizeTeamPresetsState(state.teamPresets);

        if (action === 'team-select-preset') {
            const presetIndex = Number(actionTarget.dataset.presetIndex);
            if (!Number.isInteger(presetIndex)) {
                return;
            }
            normalized.activePresetIndex = Math.max(0, Math.min(teamBuilder.MAX_TEAM_PRESETS - 1, presetIndex));
            state.teamPresets = normalized;
            saveTeamPresetsState();
            renderCharacterSelectScreen();
            return;
        }

        if (action === 'team-focus-roster') {
            state.teamRosterFilter = '';
            renderCharacterSelectScreen();
            const rosterSearch = elements.characterScreen?.querySelector('[data-action="team-roster-filter"]');
            if (rosterSearch) {
                rosterSearch.focus();
            }
            return;
        }

        if (action === 'team-add-unit') {
            const unitId = actionTarget.dataset.unitId || '';
            if (!unitId) {
                return;
            }
            const preset = normalized.presets[normalized.activePresetIndex];
            if (!preset || preset.unitIds.includes(unitId)) {
                return;
            }
            if (preset.unitIds.length >= teamBuilder.MAX_TEAM_SIZE) {
                return;
            }
            preset.unitIds.push(unitId);
            state.teamPresets = normalized;
            saveTeamPresetsState();
            renderCharacterSelectScreen();
            return;
        }

        if (action === 'team-remove-unit') {
            const unitIndex = Number(actionTarget.dataset.unitIndex);
            if (!Number.isInteger(unitIndex)) {
                return;
            }
            const preset = normalized.presets[normalized.activePresetIndex];
            if (!preset?.unitIds) {
                return;
            }
            preset.unitIds.splice(unitIndex, 1);
            state.teamPresets = normalized;
            saveTeamPresetsState();
            renderCharacterSelectScreen();
            return;
        }
    }

    function handleCharacterScreenChange(event) {
        const teamBuilder = getTeamBuilder();
        if (!teamBuilder) {
            return;
        }

        const presetNameInput = event.target.closest('[data-action="team-preset-name"]');
        if (presetNameInput) {
            ensureTeamPresetsLoaded();
            const normalized = teamBuilder.normalizeTeamPresetsState(state.teamPresets);
            const preset = normalized.presets[normalized.activePresetIndex];
            if (preset) {
                preset.name = normalizeStringInput(presetNameInput.value, preset.name);
                state.teamPresets = normalized;
                saveTeamPresetsState();
            }
            return;
        }

        const rosterFilter = event.target.closest('[data-action="team-roster-filter"]');
        if (rosterFilter) {
            state.teamRosterFilter = rosterFilter.value || '';
            renderCharacterSelectScreen();
        }
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
        const bufferLoads = [
            loadAudioBuffer('hover', resolveExtensionUrl(ASSET_RELATIVE_PATHS.hover)),
            loadAudioBuffer('click', resolveExtensionUrl(ASSET_RELATIVE_PATHS.click)),
        ];
        Object.entries(COMBAT_AUDIO_PATHS).forEach(([soundId, relativePath]) => {
            bufferLoads.push(loadAudioBuffer(soundId, resolveExtensionUrl(relativePath)));
        });
        void Promise.all(bufferLoads);
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
                                aria-label="Open Workshop"
                                aria-pressed="false"
                                title="Open Workshop"
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
        elements.characterLayout = root.querySelector('.echoes-battle-panel__character-layout');
        elements.characterScreen = root.querySelector('.echoes-battle-panel__character-screen');
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
        elements.characterScreen?.addEventListener('click', handleCharacterScreenClick);
        elements.characterScreen?.addEventListener('change', handleCharacterScreenChange);
        elements.characterScreen?.addEventListener('input', handleCharacterScreenChange);
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
