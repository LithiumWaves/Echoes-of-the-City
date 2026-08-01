(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createBattleHandler(options) {
        const {
            mountElement,
            clamp,
            resolveAssetUrl,
            battleDefinition = battleModules.defaultBattleDefinition || null,
            enableDebugTools = false,
            debugRollManager = null,
            storageKeyPrefix = 'echoes-of-the-city:battle',
            engineFactory = battleModules.createBattleEngine,
            rendererFactory = battleModules.createBattleRenderer,
            validateAndNormalizeBattleDefinition = battleModules.validateAndNormalizeBattleDefinition,
            playCombatSound = null,
        } = options;
        const combatSounds = battleModules.combatSounds || window.EchoesOfTheCityCombatSounds || null;
        const PLAYBACK_TIMINGS = {
            approach: 420,
            skillIntro: 480,
            roundReveal: 280,
            coinFlip: 280,
            coinBreak: 320,
            attackHit: 560,
            betweenEntries: 360,
        };
        const BATTLEFIELD_HEIGHT_STORAGE_KEY = `${storageKeyPrefix}:battlefield-height`;
        const TURN_DEBUG_STORAGE_KEY = `${storageKeyPrefix}:turn-debug-enabled`;

        if (!battleDefinition || typeof engineFactory !== 'function' || typeof rendererFactory !== 'function') {
            throw new Error('Battle modules are incomplete.');
        }

        const validationResult = typeof validateAndNormalizeBattleDefinition === 'function'
            ? validateAndNormalizeBattleDefinition(battleDefinition)
            : { normalizedDefinition: battleDefinition, errors: [], message: null };

        if (Array.isArray(validationResult.errors) && validationResult.errors.length) {
            throw new Error(validationResult.message || validationResult.errors.join('\n'));
        }

        const resolvedBattleDefinition = validationResult.normalizedDefinition || battleDefinition;

        const engine = engineFactory({
            clamp,
            battleDefinition: resolvedBattleDefinition,
            peekRollToken: debugRollManager?.peekToken?.bind(debugRollManager),
            consumeRollToken: debugRollManager?.consumeToken?.bind(debugRollManager),
            onTurnStarted: debugRollManager?.handleTurnStarted?.bind(debugRollManager),
        });
        const renderer = rendererFactory({
            mountElement,
            resolveAssetUrl,
        });
        const DEFAULT_BATTLEFIELD_HEIGHT = 58;
        const MIN_BATTLEFIELD_HEIGHT = 34;
        const MAX_BATTLEFIELD_HEIGHT = 78;
        let dragAssignment = null;
        let playbackToken = 0;
        let playbackState = createIdlePlaybackState();
        let battlefieldHeight = loadPersistedBattlefieldHeight();
        let activeResizePointerId = null;
        let turnDebugEnabled = enableDebugTools ? loadPersistedTurnDebugEnabled() : false;
        let debugPatchInput = '';
        let debugPatchMessage = null;
        let debugStatusId = '';
        let debugStatusPotency = '0';
        let debugStatusCount = '1';
        let debugSanityValue = '';
        let inspectState = typeof battleModules.createInspectState === 'function'
            ? battleModules.createInspectState()
            : { isOpen: false, unitId: null };

        function createIdlePlaybackState() {
            return {
                isRunning: false,
                entry: null,
                entryIndex: -1,
                totalEntries: 0,
                phase: 'idle',
                roundIndex: -1,
                hitIndex: -1,
                coinRevealIndex: -1,
                leftBroken: 0,
                rightBroken: 0,
                previewBattle: null,
                displayBattle: null,
            };
        }

        function normalizePlaybackFlips(flips) {
            if (combatSounds?.normalizeCoinFlips) {
                return combatSounds.normalizeCoinFlips(flips);
            }
            const lcUi = battleModules.lcCombatUi || window.EchoesOfTheCityLcCombatUi;
            if (lcUi?.normalizeCoinFlips) {
                return lcUi.normalizeCoinFlips(flips);
            }
            if (Array.isArray(flips)) {
                return flips;
            }
            if (typeof flips === 'string' && flips.trim()) {
                return flips.trim().split(/\s+/).filter(Boolean).map((token) => token === 'H');
            }
            return [];
        }

        function getRoundFlipCount(round) {
            const leftCount = normalizePlaybackFlips(round?.leftFlips).length;
            const rightCount = normalizePlaybackFlips(round?.rightFlips).length;
            return Math.max(leftCount, rightCount, 1);
        }

        function cloneBattleState(value) {
            if (typeof window.structuredClone === 'function') {
                try {
                    return window.structuredClone(value);
                } catch {
                    return JSON.parse(JSON.stringify(value));
                }
            }

            return JSON.parse(JSON.stringify(value));
        }

        function emitCombatSound(soundId) {
            if (!soundId || typeof playCombatSound !== 'function') {
                return;
            }
            playCombatSound(soundId);
        }

        function processCombatEvents(battle, fromIndex = 0, options = {}) {
            if (!combatSounds?.getSoundForBattleEvent || typeof playCombatSound !== 'function') {
                return;
            }
            const skipLifecycle = options?.skipLifecycle === true;
            const events = Array.isArray(battle?.events) ? battle.events : [];
            events.slice(fromIndex).forEach((event) => {
                if (skipLifecycle && (event?.type === 'unit_staggered' || event?.type === 'unit_defeated')) {
                    return;
                }
                const soundId = combatSounds.getSoundForBattleEvent(event);
                if (soundId) {
                    emitCombatSound(soundId);
                }
            });
        }

        const lcCombatUi = battleModules.lcCombatUi || window.EchoesOfTheCityLcCombatUi || null;

        function playLifecycleSoundsForHit(vitalsResult) {
            if (!vitalsResult || !combatSounds?.COMBAT_SOUND_IDS) {
                return;
            }
            const { previousHp, resolvedDefender, targetHp } = vitalsResult;
            if (Number.isFinite(targetHp) && targetHp <= 0 && previousHp > 0) {
                emitCombatSound(combatSounds.COMBAT_SOUND_IDS.unitDeath || 'unitDeath');
                return;
            }
            if (
                resolvedDefender
                && lcCombatUi?.didCrossStaggerThreshold
                && lcCombatUi.didCrossStaggerThreshold(resolvedDefender, previousHp, targetHp)
                && (resolvedDefender.staggerTurnsRemaining || 0) > 0
            ) {
                emitCombatSound(combatSounds.COMBAT_SOUND_IDS.stagger || 'stagger');
            }
        }

        function applyPlaybackHitVitals(entry, hitIndex, displayBattle) {
            if (!lcCombatUi?.applyPlaybackHitVitals) {
                return null;
            }
            return lcCombatUi.applyPlaybackHitVitals(
                entry,
                hitIndex,
                displayBattle,
                engine.getState(),
                getAttackingSide,
            );
        }

        function getAttackingSideForEntry(entry) {
            if (!entry) {
                return null;
            }
            if (entry.engagementType === 'clash') {
                return entry.winnerSide;
            }
            return entry.leftSkillId ? 'left' : 'right';
        }

        function resolveAttackingSkillDamageType(battle, entry) {
            const attackingSide = getAttackingSideForEntry(entry);
            if (!attackingSide) {
                return null;
            }
            const skillId = attackingSide === 'left' ? entry.leftSkillId : entry.rightSkillId;
            const slotId = attackingSide === 'left' ? entry.leftSlotId : entry.rightSlotId;
            const state = battle || engine.getState();
            const slot = [...(state.playerSlots || []), ...(state.enemySlots || [])].find((candidate) => candidate.id === slotId);
            if (!slot) {
                return null;
            }
            const unit = [...(state.playerUnits || []), ...(state.enemyUnits || [])].find((candidate) => candidate.id === slot.unitId);
            const skill = unit?.skills?.find((candidate) => candidate.id === skillId);
            return skill?.damageType || null;
        }

        function playAttackHitSound(battle, entry) {
            if (!combatSounds?.pickAttackHitSound) {
                return;
            }
            const soundId = combatSounds.pickAttackHitSound(resolveAttackingSkillDamageType(battle, entry));
            if (soundId) {
                emitCombatSound(soundId);
            }
        }

        function playCoinFlipSounds(flips = 1) {
            const soundId = combatSounds?.COMBAT_SOUND_IDS?.coinFlip || 'coinFlip';
            const flipCount = Math.max(0, Math.floor(Number(flips) || 0));
            if (!flipCount) {
                return;
            }
            for (let index = 0; index < flipCount; index += 1) {
                emitCombatSound(soundId);
            }
        }

        function playCoinFlipSoundsForRound(round) {
            const flipCount = combatSounds?.countCoinFlipsInRound
                ? combatSounds.countCoinFlipsInRound(round)
                : 0;
            playCoinFlipSounds(flipCount > 0 ? flipCount : 1);
        }

        function getSkillType(skill) {
            return skill?.skillType || skill?.type || 'attack';
        }

        function cancelPlayback() {
            playbackToken += 1;
            playbackState = createIdlePlaybackState();
        }

        async function waitForPlayback(ms, token) {
            await new Promise((resolve) => window.setTimeout(resolve, ms));
            return token === playbackToken;
        }

        function updatePlaybackState(patch) {
            playbackState = {
                ...playbackState,
                ...patch,
            };
            render();
        }

        function getAttackingSide(entry) {
            if (entry.engagementType === 'clash') {
                return entry.winnerSide;
            }

            return entry.leftSkillId ? 'left' : 'right';
        }

        async function playEntry(entry, entryIndex, totalEntries, token, previewBattle) {
            let leftBroken = 0;
            let rightBroken = 0;

            updatePlaybackState({
                isRunning: true,
                previewBattle,
                entry,
                entryIndex,
                totalEntries,
                phase: 'approach',
                roundIndex: -1,
                hitIndex: -1,
                coinRevealIndex: -1,
                leftBroken,
                rightBroken,
            });
            if (!(await waitForPlayback(PLAYBACK_TIMINGS.approach, token))) {
                return false;
            }

            updatePlaybackState({
                phase: 'skill-intro',
            });
            if (!(await waitForPlayback(PLAYBACK_TIMINGS.skillIntro, token))) {
                return false;
            }

            if (Array.isArray(entry.rounds) && entry.rounds.length) {
                for (let roundIndex = 0; roundIndex < entry.rounds.length; roundIndex += 1) {
                    const round = entry.rounds[roundIndex];
                    const flipCount = getRoundFlipCount(round);

                    updatePlaybackState({
                        phase: 'round-reveal',
                        roundIndex,
                        hitIndex: -1,
                        coinRevealIndex: -1,
                        leftBroken,
                        rightBroken,
                    });
                    if (!(await waitForPlayback(PLAYBACK_TIMINGS.roundReveal, token))) {
                        return false;
                    }

                    for (let flipIndex = 0; flipIndex < flipCount; flipIndex += 1) {
                        updatePlaybackState({
                            coinRevealIndex: flipIndex,
                        });
                        playCoinFlipSounds(1);
                        if (!(await waitForPlayback(PLAYBACK_TIMINGS.coinFlip, token))) {
                            return false;
                        }
                    }

                    updatePlaybackState({
                        coinRevealIndex: flipCount,
                    });

                    if (entry.engagementType === 'clash' && round.result === 'tie') {
                        emitCombatSound(combatSounds?.COMBAT_SOUND_IDS?.parryAtk || 'parryAtk');
                    }

                    if (round.result === 'left-win' || round.result === 'left-speed-break') {
                        rightBroken += 1;
                        updatePlaybackState({
                            phase: 'coin-break',
                            roundIndex,
                            rightBroken,
                        });
                        emitCombatSound(combatSounds?.COMBAT_SOUND_IDS?.parryAtk || 'parryAtk');
                        if (!(await waitForPlayback(PLAYBACK_TIMINGS.coinBreak, token))) {
                            return false;
                        }
                    } else if (round.result === 'right-win' || round.result === 'right-speed-break') {
                        leftBroken += 1;
                        updatePlaybackState({
                            phase: 'coin-break',
                            roundIndex,
                            leftBroken,
                        });
                        emitCombatSound(combatSounds?.COMBAT_SOUND_IDS?.parryAtk || 'parryAtk');
                        if (!(await waitForPlayback(PLAYBACK_TIMINGS.coinBreak, token))) {
                            return false;
                        }
                    }
                }
            }

            for (let hitIndex = 0; hitIndex < entry.hits.length; hitIndex += 1) {
                updatePlaybackState({
                    phase: 'attack-hit',
                    hitIndex,
                    coinRevealIndex: hitIndex,
                    roundIndex: entry.engagementType === 'clash' ? playbackState.roundIndex : -1,
                    leftBroken,
                    rightBroken,
                });

                playCoinFlipSounds(1);
                if (!(await waitForPlayback(PLAYBACK_TIMINGS.coinFlip, token))) {
                    return false;
                }

                updatePlaybackState({
                    coinRevealIndex: hitIndex + 1,
                });

                const vitalsResult = applyPlaybackHitVitals(entry, hitIndex, playbackState.displayBattle);
                playLifecycleSoundsForHit(vitalsResult);
                playAttackHitSound(playbackState.displayBattle || previewBattle, entry);
                render();

                if (!(await waitForPlayback(PLAYBACK_TIMINGS.attackHit, token))) {
                    return false;
                }
            }

            updatePlaybackState({
                phase: 'entry-end',
                leftBroken,
                rightBroken,
            });

            return waitForPlayback(PLAYBACK_TIMINGS.betweenEntries, token);
        }

        async function startPlayback(previewBattle) {
            const token = ++playbackToken;
            const resolvedBattle = engine.getState();
            const entries = Array.isArray(resolvedBattle.resolutionHistory) ? resolvedBattle.resolutionHistory : [];

            if (!entries.length) {
                playbackState = createIdlePlaybackState();
                render();
                return;
            }

            playbackState = createIdlePlaybackState();
            playbackState.isRunning = true;
            playbackState.previewBattle = previewBattle;
            playbackState.displayBattle = cloneBattleState(previewBattle);
            render();

            for (let index = 0; index < entries.length; index += 1) {
                const shouldContinue = await playEntry(entries[index], index, entries.length, token, previewBattle);
                if (!shouldContinue || token !== playbackToken) {
                    return;
                }
            }

            if (token !== playbackToken) {
                return;
            }

            playbackState = createIdlePlaybackState();
            render();
        }

        function clearDropTargetState() {
            if (!mountElement) {
                return;
            }

            mountElement
                .querySelectorAll('.echoes-battle-panel__combat-unit--drop-target.is-drop-hover')
                .forEach((element) => element.classList.remove('is-drop-hover'));
            mountElement.classList.remove('is-dragging-skill');
        }

        function loadPersistedBattlefieldHeight() {
            try {
                const rawValue = window.localStorage?.getItem(BATTLEFIELD_HEIGHT_STORAGE_KEY);
                const parsedValue = Number.parseFloat(rawValue || '');
                if (Number.isFinite(parsedValue)) {
                    return clamp(parsedValue, MIN_BATTLEFIELD_HEIGHT, MAX_BATTLEFIELD_HEIGHT);
                }
            } catch (error) {
                return DEFAULT_BATTLEFIELD_HEIGHT;
            }

            return DEFAULT_BATTLEFIELD_HEIGHT;
        }

        function persistBattlefieldHeight() {
            try {
                window.localStorage?.setItem(BATTLEFIELD_HEIGHT_STORAGE_KEY, String(battlefieldHeight));
            } catch (error) {
                return;
            }
        }

        function loadPersistedTurnDebugEnabled() {
            try {
                return window.localStorage?.getItem(TURN_DEBUG_STORAGE_KEY) === '1';
            } catch (error) {
                return false;
            }
        }

        function persistTurnDebugEnabled() {
            try {
                window.localStorage?.setItem(TURN_DEBUG_STORAGE_KEY, turnDebugEnabled ? '1' : '0');
            } catch (error) {
                return;
            }
        }

        function applyBattlefieldHeight() {
            mountElement?.style.setProperty('--echoes-battlefield-height', `${battlefieldHeight}%`);
        }

        function getCombatLayoutElement() {
            return mountElement?.querySelector('.echoes-battle-panel__combat-limbus') || mountElement;
        }

        function stopResizeBattlefield() {
            if (activeResizePointerId === null) {
                return;
            }

            activeResizePointerId = null;
            mountElement?.classList.remove('is-resizing-battlefield');
            window.removeEventListener('pointermove', handleResizePointerMove);
            window.removeEventListener('pointerup', handleResizePointerUp);
            window.removeEventListener('pointercancel', handleResizePointerUp);
        }

        function handleResizePointerMove(event) {
            if (activeResizePointerId !== event.pointerId) {
                return;
            }

            const layoutElement = getCombatLayoutElement();
            if (!layoutElement) {
                return;
            }

            const rect = layoutElement.getBoundingClientRect();
            if (!rect.height) {
                return;
            }

            const nextHeight = clamp(((event.clientY - rect.top) / rect.height) * 100, MIN_BATTLEFIELD_HEIGHT, MAX_BATTLEFIELD_HEIGHT);
            battlefieldHeight = nextHeight;
            applyBattlefieldHeight();
            persistBattlefieldHeight();
        }

        function handleResizePointerUp(event) {
            if (activeResizePointerId !== event.pointerId) {
                return;
            }

            stopResizeBattlefield();
        }

        function handlePointerDown(event) {
            const resizeHandle = event.target.closest('[data-resize-handle="battlefield"]');
            if (!resizeHandle) {
                return;
            }

            event.preventDefault();
            activeResizePointerId = event.pointerId;
            mountElement?.classList.add('is-resizing-battlefield');
            window.addEventListener('pointermove', handleResizePointerMove);
            window.addEventListener('pointerup', handleResizePointerUp);
            window.addEventListener('pointercancel', handleResizePointerUp);
        }

        function render() {
            const resolvedBattle = engine.getState();
            const displayBattle = playbackState.isRunning && playbackState.displayBattle
                ? playbackState.displayBattle
                : (playbackState.isRunning && playbackState.previewBattle
                    ? playbackState.previewBattle
                    : resolvedBattle);
            const debugIds = enableDebugTools && engine?.debug?.listIds
                ? engine.debug.listIds()
                : null;

            applyBattlefieldHeight();
            renderer.render(displayBattle, {
                resolvedBattle,
                playback: playbackState,
                isPlaybackRunning: playbackState.isRunning,
                turnDebugEnabled,
                debugToolsEnabled: enableDebugTools,
                debugRollState: debugRollManager?.getUiState?.() || null,
                debugPatchInput,
                debugPatchMessage,
                debugIds,
                debugStatusId,
                debugStatusPotency,
                debugStatusCount,
                debugSanityValue,
                inspect: inspectState,
            });
        }

        function handleClick(event) {
            const actionTarget = event.target.closest('[data-action]');
            if (!actionTarget) {
                return;
            }

            const {
                action,
                skillId,
                slotId,
                targetSlotId,
                unitId,
            } = actionTarget.dataset;

            if (playbackState.isRunning && !['reset-fight', 'toggle-turn-debug', 'toggle-inspect', 'close-inspect', 'inspect-select-unit'].includes(action)) {
                return;
            }

            if (action === 'toggle-turn-debug' && enableDebugTools) {
                turnDebugEnabled = !turnDebugEnabled;
                persistTurnDebugEnabled();
                render();
                return;
            }

            if (action === 'toggle-inspect') {
                inspectState = {
                    ...inspectState,
                    isOpen: !inspectState.isOpen,
                };
                if (inspectState.isOpen && !inspectState.unitId) {
                    const battle = engine.getState();
                    const activeSlot = battle.activePlayerSlotId ? battle.playerSlots.find((slot) => slot.id === battle.activePlayerSlotId) : null;
                    inspectState.unitId = activeSlot?.unitId || battle.playerUnits[0]?.id || battle.enemyUnits[0]?.id || null;
                }
                render();
                return;
            }

            if (action === 'close-inspect') {
                inspectState = {
                    ...inspectState,
                    isOpen: false,
                };
                render();
                return;
            }

            if (action === 'inspect-select-unit' && unitId) {
                inspectState = {
                    ...inspectState,
                    isOpen: true,
                    unitId,
                };
                render();
                return;
            }

            if (action === 'debug-roll-clear' && enableDebugTools && slotId && debugRollManager?.setSequence) {
                debugRollManager.setSequence(slotId, '');
                render();
                return;
            }

            if (action === 'debug-roll-clear-all' && enableDebugTools && debugRollManager?.clearAll) {
                const state = engine.getState();
                debugRollManager.clearAll(state);
                render();
                return;
            }

            if (action === 'debug-apply-patch' && enableDebugTools && engine?.debug?.applyPatchJson) {
                const result = engine.debug.applyPatchJson(debugPatchInput);
                debugPatchMessage = result?.ok
                    ? `Applied patch (${Array.isArray(result?.results) ? result.results.filter((entry) => entry.ok).length : 'ok'}).`
                    : (result?.message || 'Failed to apply patch.');
                render();
                return;
            }

            if (action === 'debug-dump-battle' && enableDebugTools && engine?.debug?.dumpBattleJson) {
                debugPatchInput = engine.debug.dumpBattleJson();
                debugPatchMessage = 'Dumped battle JSON.';
                render();
                return;
            }

            if (action === 'debug-dump-unit' && enableDebugTools && engine?.debug?.dumpUnitJson) {
                const dumpTargetId = unitId || inspectState?.unitId;
                debugPatchInput = dumpTargetId ? engine.debug.dumpUnitJson(dumpTargetId) : '';
                debugPatchMessage = dumpTargetId ? `Dumped unit JSON (${dumpTargetId}).` : 'No unit selected.';
                render();
                return;
            }

            if (action === 'debug-dump-slot' && enableDebugTools && engine?.debug?.dumpSlotJson) {
                debugPatchInput = slotId ? engine.debug.dumpSlotJson(slotId) : '';
                debugPatchMessage = slotId ? `Dumped slot JSON (${slotId}).` : 'No slot selected.';
                render();
                return;
            }

            if (action === 'debug-apply-status' && enableDebugTools && engine?.debug?.applyStatus) {
                const targetId = unitId || inspectState?.unitId;
                if (!targetId || !debugStatusId) {
                    debugPatchMessage = 'Missing unit or status id.';
                    render();
                    return;
                }
                const potency = Number.parseInt(debugStatusPotency || '0', 10);
                const count = Number.parseInt(debugStatusCount || '0', 10);
                const payload = {};
                if (Number.isFinite(potency) && potency !== 0) {
                    payload.potency = potency;
                }
                if (Number.isFinite(count) && count !== 0) {
                    payload.count = count;
                }
                const result = engine.debug.applyStatus(targetId, debugStatusId, payload);
                debugPatchMessage = result?.ok ? `Applied status ${debugStatusId} to ${targetId}.` : (result?.message || 'Failed to apply status.');
                render();
                return;
            }

            if (action === 'debug-clear-status' && enableDebugTools && engine?.debug?.clearStatus) {
                const targetId = unitId || inspectState?.unitId;
                if (!targetId || !debugStatusId) {
                    debugPatchMessage = 'Missing unit or status id.';
                    render();
                    return;
                }
                const result = engine.debug.clearStatus(targetId, debugStatusId);
                debugPatchMessage = result?.ok ? `Cleared status ${debugStatusId} on ${targetId}.` : (result?.message || 'Failed to clear status.');
                render();
                return;
            }

            if (action === 'debug-adjust-sanity' && enableDebugTools && engine?.debug?.adjustSanity) {
                const targetId = unitId || inspectState?.unitId;
                const delta = Number.parseInt(actionTarget.dataset.delta || '0', 10);
                if (!targetId || !Number.isFinite(delta)) {
                    debugPatchMessage = 'Missing unit or sanity delta.';
                    render();
                    return;
                }
                const result = engine.debug.adjustSanity(targetId, delta, { reason: 'debug' });
                debugPatchMessage = result?.ok ? `Adjusted SP by ${delta} (${result.previousSp} → ${result.nextSp}).` : (result?.message || 'Failed to adjust sanity.');
                render();
                return;
            }

            if (action === 'debug-set-sanity' && enableDebugTools && engine?.debug?.setSanity) {
                const targetId = unitId || inspectState?.unitId;
                const value = Number.parseInt(actionTarget.dataset.value || debugSanityValue || '0', 10);
                if (!targetId || !Number.isFinite(value)) {
                    debugPatchMessage = 'Missing unit or sanity value.';
                    render();
                    return;
                }
                const result = engine.debug.setSanity(targetId, value, { reason: 'debug' });
                debugPatchMessage = result?.ok ? `Set SP to ${result.nextSp} (${result.previousSp} → ${result.nextSp}).` : (result?.message || 'Failed to set sanity.');
                render();
                return;
            }

            if (action === 'debug-apply-sanity-model' && enableDebugTools && engine?.debug?.applySanityModel) {
                engine.debug.applySanityModel();
                debugPatchMessage = 'Re-applied sanity model.';
                render();
                return;
            }

            if (action === 'debug-force-clash' && enableDebugTools && debugRollManager?.setSequence && slotId && targetSlotId) {
                const mode = actionTarget.dataset.mode || 'win';
                const winnerDirective = 'P999';
                const loserDirective = 'P-999';
                if (mode === 'win') {
                    debugRollManager.setSequence(slotId, winnerDirective);
                    debugRollManager.setSequence(targetSlotId, loserDirective);
                    debugPatchMessage = `Forced clash: ${slotId} wins vs ${targetSlotId}.`;
                } else if (mode === 'lose') {
                    debugRollManager.setSequence(slotId, loserDirective);
                    debugRollManager.setSequence(targetSlotId, winnerDirective);
                    debugPatchMessage = `Forced clash: ${slotId} loses vs ${targetSlotId}.`;
                } else {
                    debugRollManager.setSequence(slotId, winnerDirective);
                    debugRollManager.setSequence(targetSlotId, winnerDirective);
                    debugPatchMessage = `Forced clash: ${slotId} ties vs ${targetSlotId} (speed-break will decide).`;
                }
                render();
                return;
            }

            if (action === 'select-slot' && slotId) {
                engine.selectSlot(slotId);
                render();
                return;
            }

            if (action === 'toggle-defense-mode' && slotId) {
                const didToggle = engine.toggleDefenseMode(slotId);
                if (didToggle) {
                    const stateAfter = engine.getState();
                    const slotAfter = stateAfter.playerSlots?.find((slot) => slot.id === slotId);
                    if (slotAfter?.defenseMode) {
                        const unit = stateAfter.playerUnits?.find((candidate) => candidate.id === slotAfter.unitId);
                        const selectedSkill = slotAfter.selectedSkillId
                            ? unit?.skills?.find((skill) => skill.id === slotAfter.selectedSkillId)
                            : null;
                        if (getSkillType(selectedSkill) === 'guard') {
                            emitCombatSound(combatSounds?.COMBAT_SOUND_IDS?.defenseGuard || 'defenseGuard');
                        }
                    }
                }
                render();
                return;
            }

            if (action === 'select-skill' && skillId) {
                const skillSlotId = slotId || engine.getState().activePlayerSlotId;
                const stateBefore = engine.getState();
                const slotBefore = stateBefore.playerSlots?.find((slot) => slot.id === skillSlotId);
                const unitBefore = stateBefore.playerUnits?.find((candidate) => candidate.id === slotBefore?.unitId);
                const skillBefore = unitBefore?.skills?.find((skill) => skill.id === skillId);
                const didSelect = engine.selectSkill(skillId, skillSlotId);
                if (didSelect) {
                    const skillType = getSkillType(skillBefore);
                    if (skillType === 'guard') {
                        emitCombatSound(combatSounds?.COMBAT_SOUND_IDS?.defenseGuard || 'defenseGuard');
                    } else if (skillType === 'attack') {
                        emitCombatSound(combatSounds?.COMBAT_SOUND_IDS?.uiClick || 'uiClick');
                    }
                }
                render();
                return;
            }

            if (action === 'select-target' && targetSlotId) {
                const activeState = engine.getState();
                const activeSlotId = slotId || activeState.activePlayerSlotId;
                if (!activeSlotId) {
                    return;
                }

                engine.selectTarget(targetSlotId, activeSlotId);
                render();
                return;
            }

            if (action === 'resolve-turn') {
                const previewBattle = cloneBattleState(engine.getState());
                const eventStart = previewBattle.events?.length || 0;
                const didResolve = engine.resolveTurn();
                if (!didResolve) {
                    const reason = engine.getResolveBlockReason?.() || 'Assign all skills before resolving.';
                    debugPatchMessage = reason;
                } else {
                    processCombatEvents(engine.getState(), eventStart, { skipLifecycle: true });
                }
                render();
                if (didResolve) {
                    startPlayback(previewBattle);
                }
                return;
            }

            if (action === 'next-turn') {
                const eventStart = engine.getState().events?.length || 0;
                engine.advanceTurn();
                processCombatEvents(engine.getState(), eventStart);
                render();
                return;
            }

            if (action === 'reset-fight') {
                cancelPlayback();
                engine.reset();
                render();
            }
        }

        function handleChange(event) {
            const patchInput = event.target.closest('[data-action="debug-patch-input"]');
            if (patchInput && enableDebugTools) {
                debugPatchInput = patchInput.value || '';
                return;
            }

            const statusIdInput = event.target.closest('[data-action="debug-status-id"]');
            if (statusIdInput && enableDebugTools) {
                debugStatusId = statusIdInput.value || '';
                return;
            }
            const statusPotencyInput = event.target.closest('[data-action="debug-status-potency"]');
            if (statusPotencyInput && enableDebugTools) {
                debugStatusPotency = statusPotencyInput.value || '';
                return;
            }
            const statusCountInput = event.target.closest('[data-action="debug-status-count"]');
            if (statusCountInput && enableDebugTools) {
                debugStatusCount = statusCountInput.value || '';
                return;
            }
            const sanityValueInput = event.target.closest('[data-action="debug-sanity-value"]');
            if (sanityValueInput && enableDebugTools) {
                debugSanityValue = sanityValueInput.value || '';
                return;
            }

            if (!enableDebugTools || !debugRollManager?.setSequence) {
                return;
            }

            const input = event.target.closest('[data-action="debug-roll-sequence"]');
            if (!input) {
                return;
            }

            const { slotId } = input.dataset;
            if (!slotId) {
                return;
            }

            debugRollManager.setSequence(slotId, input.value || '');
            render();
        }

        function handleDragStart(event) {
            if (playbackState.isRunning) {
                return;
            }

            const skillElement = event.target.closest('[data-drag-skill="true"]');
            if (!skillElement || skillElement.hasAttribute('disabled')) {
                return;
            }

            dragAssignment = {
                slotId: skillElement.dataset.slotId,
                skillId: skillElement.dataset.skillId,
            };
            mountElement?.classList.add('is-dragging-skill');
            skillElement.classList.add('is-dragging');
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', JSON.stringify(dragAssignment));
            }
        }

        function handleDragOver(event) {
            if (playbackState.isRunning) {
                return;
            }

            const dropTarget = event.target.closest('[data-drop-target="enemy-slot"]');
            if (!dropTarget || !dragAssignment) {
                return;
            }

            event.preventDefault();
            dropTarget.classList.add('is-drop-hover');
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        }

        function handleDragEnter(event) {
            if (playbackState.isRunning) {
                return;
            }

            const dropTarget = event.target.closest('[data-drop-target="enemy-slot"]');
            if (!dropTarget || !dragAssignment) {
                return;
            }

            event.preventDefault();
            dropTarget.classList.add('is-drop-hover');
        }

        function handleDragLeave(event) {
            const dropTarget = event.target.closest('[data-drop-target="enemy-slot"]');
            if (!dropTarget) {
                return;
            }

            const relatedTarget = event.relatedTarget;
            if (relatedTarget && dropTarget.contains(relatedTarget)) {
                return;
            }

            dropTarget.classList.remove('is-drop-hover');
        }

        function handleDrop(event) {
            if (playbackState.isRunning) {
                return;
            }

            const dropTarget = event.target.closest('[data-drop-target="enemy-slot"]');
            if (!dropTarget || !dragAssignment) {
                return;
            }

            event.preventDefault();
            const { slotId, skillId } = dragAssignment;
            const destinationSlotId = dropTarget.dataset.targetSlotId;
            clearDropTargetState();
            dragAssignment = null;

            if (!slotId || !skillId || !destinationSlotId) {
                return;
            }

            engine.selectSlot(slotId);
            engine.selectSkill(skillId, slotId);
            engine.selectTarget(destinationSlotId, slotId);
            render();
        }

        function handleDragEnd() {
            clearDropTargetState();
            dragAssignment = null;
            mountElement
                ?.querySelectorAll('.echoes-battle-panel__planner-skill.is-dragging, .echoes-battle-panel__combat-skill.is-dragging')
                .forEach((element) => element.classList.remove('is-dragging'));
        }

        return {
            handleClick,
            handleChange,
            handleDragStart,
            handleDragOver,
            handleDragEnter,
            handleDragLeave,
            handleDrop,
            handleDragEnd,
            handlePointerDown,
            render,
            reset() {
                stopResizeBattlefield();
                cancelPlayback();
                dragAssignment = null;
                clearDropTargetState();
                engine.reset();
                render();
            },
            leave() {
                stopResizeBattlefield();
                cancelPlayback();
                dragAssignment = null;
                clearDropTargetState();
            },
        };
    }

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        createBattleHandler,
    };
})();
