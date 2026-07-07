(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function parseForcedRollScript(sequenceText) {
        const tokens = String(sequenceText || '')
            .toUpperCase()
            .replace(/,/g, ' ')
            .split(/\s+/)
            .filter(Boolean);

        return tokens
            .map((token) => {
                if (token === 'H' || token === '1') {
                    return true;
                }
                if (token === 'T' || token === '0') {
                    return false;
                }

                const powerMatch = token.match(/^P(-?\d+)$/);
                if (powerMatch) {
                    return { type: 'power', value: Number.parseInt(powerMatch[1], 10) };
                }

                const headsMatch = token.match(/^K(\d+)$/);
                if (headsMatch) {
                    return { type: 'heads', value: Number.parseInt(headsMatch[1], 10) };
                }

                if (/^-?\d+$/.test(token)) {
                    return { type: 'power', value: Number.parseInt(token, 10) };
                }

                return null;
            })
            .filter(Boolean);
    }

    function createDebugRollManager() {
        let forcedCoinInputs = {};
        let forcedRollScripts = {};
        let activeForcedCoinIndices = {};

        function peekToken(slotId) {
            if (!slotId) {
                return null;
            }

            const sequence = forcedRollScripts[slotId];
            if (!Array.isArray(sequence) || !sequence.length) {
                return null;
            }

            const currentIndex = activeForcedCoinIndices[slotId] || 0;
            if (currentIndex >= sequence.length) {
                return null;
            }

            return sequence[currentIndex];
        }

        function consumeToken(slotId) {
            const token = peekToken(slotId);
            if (token === null) {
                return null;
            }

            activeForcedCoinIndices[slotId] = (activeForcedCoinIndices[slotId] || 0) + 1;
            return token;
        }

        function setSequence(slotId, sequenceText) {
            if (!slotId) {
                return false;
            }

            const nextInput = typeof sequenceText === 'string' ? sequenceText.toUpperCase() : '';
            const parsedSequence = parseForcedRollScript(nextInput);
            forcedCoinInputs[slotId] = nextInput;

            if (parsedSequence.length) {
                forcedRollScripts[slotId] = parsedSequence;
            } else {
                delete forcedRollScripts[slotId];
            }

            activeForcedCoinIndices[slotId] = 0;
            return true;
        }

        function clearAll(battle) {
            const slots = [...(battle?.playerSlots || []), ...(battle?.enemySlots || [])];
            slots.forEach((slot) => {
                setSequence(slot.id, '');
            });
        }

        function handleTurnStarted() {
            activeForcedCoinIndices = {};
        }

        function getUiState() {
            return {
                forcedCoinInputs: { ...forcedCoinInputs },
                forcedRollScripts: { ...forcedRollScripts },
                activeForcedCoinIndices: { ...activeForcedCoinIndices },
            };
        }

        return {
            peekToken,
            consumeToken,
            setSequence,
            clearAll,
            handleTurnStarted,
            getUiState,
        };
    }

    battleModules.createDebugRollManager = createDebugRollManager;
})();
