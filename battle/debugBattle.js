(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createDebugBattleController(options) {
        const { mountElement, clamp, resolveAssetUrl } = options;
        const { debugFightTemplate, createDebugBattleEngine, createDebugBattleRenderer } = battleModules;
        const PLAYBACK_TIMINGS = {
            approach: 420,
            skillIntro: 480,
            roundReveal: 780,
            coinBreak: 320,
            attackHit: 560,
            betweenEntries: 360,
        };

        if (!debugFightTemplate || typeof createDebugBattleEngine !== 'function' || typeof createDebugBattleRenderer !== 'function') {
            throw new Error('Battle modules are incomplete.');
        }

        const engine = createDebugBattleEngine({
            clamp,
            debugFightTemplate,
        });
        const renderer = createDebugBattleRenderer({
            mountElement,
            resolveAssetUrl,
        });
        let dragAssignment = null;
        let playbackToken = 0;
        let playbackState = createIdlePlaybackState();

        function createIdlePlaybackState() {
            return {
                isRunning: false,
                entry: null,
                entryIndex: -1,
                totalEntries: 0,
                phase: 'idle',
                roundIndex: -1,
                hitIndex: -1,
                leftBroken: 0,
                rightBroken: 0,
                previewBattle: null,
            };
        }

        function cloneBattleState(value) {
            if (typeof window.structuredClone === 'function') {
                return window.structuredClone(value);
            }

            return JSON.parse(JSON.stringify(value));
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

            if (entry.engagementType === 'clash') {
                for (let roundIndex = 0; roundIndex < entry.rounds.length; roundIndex += 1) {
                    const round = entry.rounds[roundIndex];
                    updatePlaybackState({
                        phase: 'round-reveal',
                        roundIndex,
                        hitIndex: -1,
                        leftBroken,
                        rightBroken,
                    });
                    if (!(await waitForPlayback(PLAYBACK_TIMINGS.roundReveal, token))) {
                        return false;
                    }

                    if (round.result === 'left-win' || round.result === 'left-speed-break') {
                        rightBroken += 1;
                        updatePlaybackState({
                            phase: 'coin-break',
                            roundIndex,
                            rightBroken,
                        });
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
                    roundIndex: entry.engagementType === 'clash' ? playbackState.roundIndex : -1,
                    leftBroken,
                    rightBroken,
                });
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

        function render() {
            const resolvedBattle = engine.getState();
            const displayBattle = playbackState.isRunning && playbackState.previewBattle
                ? playbackState.previewBattle
                : resolvedBattle;

            renderer.render(displayBattle, {
                resolvedBattle,
                playback: playbackState,
                isPlaybackRunning: playbackState.isRunning,
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
            } = actionTarget.dataset;

            if (playbackState.isRunning && action !== 'reset-fight') {
                return;
            }

            if (action === 'select-slot' && slotId) {
                engine.selectSlot(slotId);
                render();
                return;
            }

            if (action === 'select-skill' && skillId) {
                engine.selectSkill(skillId, slotId);
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
                const didResolve = engine.resolveTurn();
                render();
                if (didResolve) {
                    startPlayback(previewBattle);
                }
                return;
            }

            if (action === 'next-turn') {
                engine.advanceTurn();
                render();
                return;
            }

            if (action === 'reset-fight') {
                cancelPlayback();
                engine.reset();
                render();
            }
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
            handleDragStart,
            handleDragOver,
            handleDragEnter,
            handleDragLeave,
            handleDrop,
            handleDragEnd,
            render,
            reset() {
                cancelPlayback();
                dragAssignment = null;
                clearDropTargetState();
                engine.reset();
                render();
            },
        };
    }

    window.EchoesOfTheCityBattle = {
        createDebugBattleController,
    };
})();
