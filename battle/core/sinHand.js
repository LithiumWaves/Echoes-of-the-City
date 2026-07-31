(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const SIN_TYPES = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
    const DEFAULT_SIN_DECK_COUNT = 4;
    const DEFAULT_SIN_DRAW_COUNT = 12;
    const DEFENSE_PRIORITY = ['guard', 'counter', 'evade'];

    function isAttackSkill(skill) {
        const type = skill?.skillType || 'attack';
        return type === 'attack';
    }

    function isDefenseSkill(skill) {
        return !isAttackSkill(skill);
    }

    function createEmptySinCounts() {
        const counts = {};
        SIN_TYPES.forEach((sinType) => {
            counts[sinType] = 0;
        });
        return counts;
    }

    function cloneSinCounts(source) {
        const counts = createEmptySinCounts();
        if (!source || typeof source !== 'object') {
            return counts;
        }
        SIN_TYPES.forEach((sinType) => {
            const value = source[sinType];
            counts[sinType] = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
        });
        return counts;
    }

    function createDefaultSinDeck(rules = {}) {
        const deckConfig = rules?.sinDeck && typeof rules.sinDeck === 'object' && !Array.isArray(rules.sinDeck)
            ? rules.sinDeck
            : {};
        const counts = createEmptySinCounts();
        SIN_TYPES.forEach((sinType) => {
            const configured = deckConfig[sinType];
            counts[sinType] = typeof configured === 'number' && Number.isFinite(configured)
                ? Math.max(0, Math.floor(configured))
                : DEFAULT_SIN_DECK_COUNT;
        });
        return counts;
    }

    function getSinDrawCount(rules = {}) {
        const configured = rules?.sinDrawCount;
        if (typeof configured === 'number' && Number.isFinite(configured)) {
            return Math.max(1, Math.floor(configured));
        }
        return DEFAULT_SIN_DRAW_COUNT;
    }

    function ensureSinRuntimeState(battle) {
        if (!battle.runtimeState || typeof battle.runtimeState !== 'object') {
            battle.runtimeState = {};
        }
        if (!battle.runtimeState.sinDeckBySide || typeof battle.runtimeState.sinDeckBySide !== 'object') {
            battle.runtimeState.sinDeckBySide = { player: createEmptySinCounts(), enemy: createEmptySinCounts() };
        }
        if (!battle.runtimeState.sinHandBySide || typeof battle.runtimeState.sinHandBySide !== 'object') {
            battle.runtimeState.sinHandBySide = { player: createEmptySinCounts(), enemy: createEmptySinCounts() };
        }
        ['player', 'enemy'].forEach((side) => {
            if (!battle.runtimeState.sinDeckBySide[side]) {
                battle.runtimeState.sinDeckBySide[side] = createEmptySinCounts();
            }
            if (!battle.runtimeState.sinHandBySide[side]) {
                battle.runtimeState.sinHandBySide[side] = createEmptySinCounts();
            }
        });
        return battle.runtimeState;
    }

    function initSinState(battle, rules = {}) {
        const runtimeState = ensureSinRuntimeState(battle);
        runtimeState.sinDeckBySide.player = cloneSinCounts(createDefaultSinDeck(rules));
        runtimeState.sinDeckBySide.enemy = cloneSinCounts(createDefaultSinDeck(rules));
        runtimeState.sinHandBySide.player = createEmptySinCounts();
        runtimeState.sinHandBySide.enemy = createEmptySinCounts();
    }

    function getDeckTotal(deck) {
        return SIN_TYPES.reduce((sum, sinType) => sum + (deck[sinType] || 0), 0);
    }

    function reshuffleDeckFromRules(battle, side, rules = {}) {
        const runtimeState = ensureSinRuntimeState(battle);
        runtimeState.sinDeckBySide[side] = cloneSinCounts(createDefaultSinDeck(rules));
    }

    function drawSingleSin(deck, randomFn) {
        const pool = SIN_TYPES.filter((sinType) => (deck[sinType] || 0) > 0);
        if (!pool.length) {
            return null;
        }
        const roll = typeof randomFn === 'function' ? randomFn() : Math.random();
        const index = Math.floor(roll * pool.length);
        const sinType = pool[Math.max(0, Math.min(pool.length - 1, index))];
        deck[sinType] -= 1;
        return sinType;
    }

    function drawSinHand(battle, side, options = {}) {
        const rules = options.rules || battle?.rules || {};
        const randomFn = options.randomFn;
        const runtimeState = ensureSinRuntimeState(battle);
        const hand = runtimeState.sinHandBySide[side] || createEmptySinCounts();
        const deck = runtimeState.sinDeckBySide[side] || createEmptySinCounts();
        const drawCount = getSinDrawCount(rules);

        SIN_TYPES.forEach((sinType) => {
            hand[sinType] = 0;
        });

        for (let draw = 0; draw < drawCount; draw += 1) {
            if (getDeckTotal(deck) <= 0) {
                reshuffleDeckFromRules(battle, side, rules);
            }
            const sinType = drawSingleSin(deck, randomFn);
            if (!sinType) {
                break;
            }
            hand[sinType] = (hand[sinType] || 0) + 1;
        }

        runtimeState.sinHandBySide[side] = hand;
        return cloneSinCounts(hand);
    }

    function getSinHandCounts(battle, side) {
        const runtimeState = ensureSinRuntimeState(battle);
        return cloneSinCounts(runtimeState.sinHandBySide[side]);
    }

    function getAssignedSinList(slot) {
        return Array.isArray(slot?.assignedSins) ? slot.assignedSins.filter(Boolean) : [];
    }

    function pickDefenseSkill(unit) {
        const skills = Array.isArray(unit?.skills) ? unit.skills : [];
        for (const skillType of DEFENSE_PRIORITY) {
            const match = skills.find((skill) => (skill?.skillType || 'attack') === skillType);
            if (match) {
                return match;
            }
        }
        return skills.find((skill) => isDefenseSkill(skill)) || null;
    }

    function rankSkillSlot(skill) {
        if (skill?.skillSlot) {
            const match = String(skill.skillSlot).match(/(\d+)/);
            if (match) {
                return Number(match[1]);
            }
        }
        if (Number.isInteger(skill?.offenseLevel)) {
            return skill.offenseLevel + 1;
        }
        return 99;
    }

    function computeSkillOffer(unit, assignedSins, battle, options = {}) {
        const offer = { top: null, bottom: null };
        if (!unit) {
            return offer;
        }

        const resolvePlannerSkills = battleModules.plannerSkills?.resolvePlannerSkills
            || window.EchoesOfTheCityPlannerSkills?.resolvePlannerSkills;
        const allSkills = typeof resolvePlannerSkills === 'function'
            ? resolvePlannerSkills(unit, battle, options)
            : (Array.isArray(unit.skills) ? unit.skills : []);

        const sinSet = new Set(getAssignedSinList({ assignedSins }));
        const attackSkills = allSkills
            .filter((skill) => isAttackSkill(skill) && sinSet.has(skill?.sinType))
            .sort((left, right) => rankSkillSlot(left) - rankSkillSlot(right));

        if (attackSkills.length > 0) {
            offer.top = attackSkills[0]?.id || null;
        }
        if (attackSkills.length > 1) {
            offer.bottom = attackSkills[1]?.id || null;
        } else if (attackSkills.length === 1 && sinSet.size > 1) {
            const secondSinSkill = attackSkills.find((skill) => skill.id !== offer.top);
            offer.bottom = secondSinSkill?.id || null;
        }

        return offer;
    }

    function refreshSlotSkillOffer(battle, slot, unit) {
        if (!slot) {
            return { top: null, bottom: null };
        }
        const assignedSins = getAssignedSinList(slot);
        const baseOffer = computeSkillOffer(unit, assignedSins, battle);

        if (slot.defenseMode) {
            const defenseSkill = pickDefenseSkill(unit);
            slot.skillOffer = {
                top: baseOffer.top,
                bottom: defenseSkill?.id || baseOffer.bottom,
            };
        } else {
            slot.skillOffer = { ...baseOffer };
        }

        return slot.skillOffer;
    }

    function refreshAllSkillOffers(battle, side) {
        const slots = side === 'enemy' ? battle.enemySlots : battle.playerSlots;
        if (!Array.isArray(slots)) {
            return;
        }
        slots.forEach((slot) => {
            const unit = battle.playerUnits?.find((entry) => entry.id === slot.unitId)
                || battle.enemyUnits?.find((entry) => entry.id === slot.unitId);
            refreshSlotSkillOffer(battle, slot, unit);
        });
    }

    function isSkillInOffer(slot, skillId) {
        if (!slot || !skillId) {
            return false;
        }
        const offer = slot.skillOffer || {};
        return offer.top === skillId || offer.bottom === skillId;
    }

    function getOfferSlotForSkill(slot, skillId) {
        if (!slot?.skillOffer) {
            return null;
        }
        if (slot.skillOffer.top === skillId) {
            return 'top';
        }
        if (slot.skillOffer.bottom === skillId) {
            return 'bottom';
        }
        return null;
    }

    function assignSinToSlot(battle, slotId, sinType) {
        if (!battle || !slotId || !sinType || !SIN_TYPES.includes(sinType)) {
            return false;
        }
        const slot = [...(battle.playerSlots || []), ...(battle.enemySlots || [])].find((entry) => entry.id === slotId);
        if (!slot) {
            return false;
        }
        const runtimeState = ensureSinRuntimeState(battle);
        const hand = runtimeState.sinHandBySide[slot.side];
        if (!hand || (hand[sinType] || 0) <= 0) {
            return false;
        }

        hand[sinType] -= 1;
        slot.assignedSins = getAssignedSinList(slot);
        slot.assignedSins.push(sinType);

        const unit = slot.side === 'player'
            ? battle.playerUnits?.find((entry) => entry.id === slot.unitId)
            : battle.enemyUnits?.find((entry) => entry.id === slot.unitId);
        refreshSlotSkillOffer(battle, slot, unit);
        return true;
    }

    function removeSinFromSlot(battle, slotId, sinIndex) {
        const slot = [...(battle.playerSlots || []), ...(battle.enemySlots || [])].find((entry) => entry.id === slotId);
        if (!slot || !Number.isInteger(sinIndex)) {
            return false;
        }
        const assigned = getAssignedSinList(slot);
        const sinType = assigned[sinIndex];
        if (!sinType) {
            return false;
        }
        assigned.splice(sinIndex, 1);
        slot.assignedSins = assigned;

        const runtimeState = ensureSinRuntimeState(battle);
        const hand = runtimeState.sinHandBySide[slot.side];
        if (hand) {
            hand[sinType] = (hand[sinType] || 0) + 1;
        }

        const unit = slot.side === 'player'
            ? battle.playerUnits?.find((entry) => entry.id === slot.unitId)
            : battle.enemyUnits?.find((entry) => entry.id === slot.unitId);
        refreshSlotSkillOffer(battle, slot, unit);
        return true;
    }

    function clearSlotSins(battle, slotId) {
        const slot = [...(battle.playerSlots || []), ...(battle.enemySlots || [])].find((entry) => entry.id === slotId);
        if (!slot) {
            return false;
        }
        const runtimeState = ensureSinRuntimeState(battle);
        const hand = runtimeState.sinHandBySide[slot.side];
        getAssignedSinList(slot).forEach((sinType) => {
            if (hand) {
                hand[sinType] = (hand[sinType] || 0) + 1;
            }
        });
        slot.assignedSins = [];

        const unit = slot.side === 'player'
            ? battle.playerUnits?.find((entry) => entry.id === slot.unitId)
            : battle.enemyUnits?.find((entry) => entry.id === slot.unitId);
        refreshSlotSkillOffer(battle, slot, unit);
        return true;
    }

    function autoAssignEnemySins(battle, side, options = {}) {
        const randomFn = options.randomFn || Math.random;
        const slots = side === 'enemy' ? battle.enemySlots : battle.playerSlots;
        if (!Array.isArray(slots)) {
            return;
        }

        slots.forEach((slot) => {
            if (!slot?.unitId) {
                return;
            }
            slot.assignedSins = [];
            const unit = side === 'player'
                ? battle.playerUnits?.find((entry) => entry.id === slot.unitId)
                : battle.enemyUnits?.find((entry) => entry.id === slot.unitId);
            const attackSkills = (unit?.skills || []).filter((skill) => isAttackSkill(skill));
            const neededSins = Math.min(2, attackSkills.length);
            for (let index = 0; index < neededSins; index += 1) {
                const hand = getSinHandCounts(battle, side);
                const available = SIN_TYPES.filter((sinType) => (hand[sinType] || 0) > 0);
                if (!available.length) {
                    break;
                }
                const preferred = attackSkills.map((skill) => skill.sinType).filter((sinType) => available.includes(sinType));
                const pool = preferred.length ? preferred : available;
                const pick = pool[Math.floor(randomFn() * pool.length)];
                assignSinToSlot(battle, slot.id, pick);
            }
            refreshSlotSkillOffer(battle, slot, unit);
        });
    }

    function pickSkillFromOffer(slot, randomFn = Math.random) {
        const offer = slot?.skillOffer || {};
        const candidates = [];
        if (offer.top) {
            candidates.push(offer.top);
        }
        if (offer.bottom && offer.bottom !== offer.top) {
            candidates.push(offer.bottom);
        }
        if (!candidates.length) {
            return null;
        }
        const index = Math.floor(randomFn() * candidates.length);
        return candidates[Math.max(0, Math.min(candidates.length - 1, index))];
    }

    function resetSlotSinState(slot) {
        if (!slot) {
            return;
        }
        slot.assignedSins = [];
        slot.defenseMode = false;
        slot.skillOffer = { top: null, bottom: null };
        slot.selectedOfferSlot = null;
    }

    const sinHand = {
        SIN_TYPES,
        DEFAULT_SIN_DRAW_COUNT,
        createDefaultSinDeck,
        getSinDrawCount,
        initSinState,
        drawSinHand,
        getSinHandCounts,
        assignSinToSlot,
        removeSinFromSlot,
        clearSlotSins,
        computeSkillOffer,
        pickDefenseSkill,
        refreshSlotSkillOffer,
        refreshAllSkillOffers,
        isSkillInOffer,
        getOfferSlotForSkill,
        autoAssignEnemySins,
        pickSkillFromOffer,
        resetSlotSinState,
        isAttackSkill,
        isDefenseSkill,
    };

    battleModules.sinHand = sinHand;
    window.EchoesOfTheCitySinHand = sinHand;
})();
