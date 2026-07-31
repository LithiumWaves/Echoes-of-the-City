(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const DEFAULT_DECK_COUNTS = { 1: 3, 2: 2, 3: 1 };
    const FOCUSED_MAX_SKILL_SLOTS = 7;
    const GENERAL_MAX_SKILL_SLOTS = 12;
    const DEFENSE_PRIORITY = ['guard', 'counter', 'evade'];

    function isAttackSkill(skill) {
        const type = skill?.skillType || 'attack';
        return type === 'attack';
    }

    function isDefenseSkill(skill) {
        return !isAttackSkill(skill);
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

    function getDefaultDeckCount(skill) {
        if (typeof skill?.deckCount === 'number' && Number.isFinite(skill.deckCount)) {
            return Math.max(0, Math.floor(skill.deckCount));
        }
        const rank = rankSkillSlot(skill);
        if (rank <= 3) {
            return DEFAULT_DECK_COUNTS[rank] || 1;
        }
        return 1;
    }

    function resolveAttackSkills(unit, battle, options = {}) {
        const resolvePlannerSkills = battleModules.plannerSkills?.resolvePlannerSkills
            || window.EchoesOfTheCityPlannerSkills?.resolvePlannerSkills;
        const allSkills = typeof resolvePlannerSkills === 'function'
            ? resolvePlannerSkills(unit, battle, options)
            : (Array.isArray(unit?.skills) ? unit.skills : []);
        return allSkills.filter((skill) => isAttackSkill(skill) && skill?.id);
    }

    function createDefaultDeck(unit, battle, options = {}) {
        const deck = {};
        const attackSkills = resolveAttackSkills(unit, battle, options);
        attackSkills.forEach((skill) => {
            deck[skill.id] = getDefaultDeckCount(skill);
        });
        return deck;
    }

    function cloneDeck(source) {
        const deck = {};
        if (!source || typeof source !== 'object') {
            return deck;
        }
        Object.keys(source).forEach((skillId) => {
            const value = source[skillId];
            deck[skillId] = typeof value === 'number' && Number.isFinite(value)
                ? Math.max(0, Math.floor(value))
                : 0;
        });
        return deck;
    }

    function getDeckTotal(deck) {
        return Object.values(deck).reduce((sum, count) => sum + (count || 0), 0);
    }

    function ensureSkillDeckRuntime(battle) {
        if (!battle.runtimeState || typeof battle.runtimeState !== 'object') {
            battle.runtimeState = {};
        }
        if (!battle.runtimeState.skillDeckByUnitId || typeof battle.runtimeState.skillDeckByUnitId !== 'object') {
            battle.runtimeState.skillDeckByUnitId = {};
        }
        return battle.runtimeState;
    }

    function initSkillDecks(battle, options = {}) {
        const runtimeState = ensureSkillDeckRuntime(battle);
        const allUnits = [...(battle.playerUnits || []), ...(battle.enemyUnits || [])];
        allUnits.forEach((unit) => {
            if (!unit?.id) {
                return;
            }
            runtimeState.skillDeckByUnitId[unit.id] = cloneDeck(createDefaultDeck(unit, battle, options));
        });
        runtimeState.skillSlotGrowthRotation = 0;
    }

    function initUnitDeck(battle, unit, options = {}) {
        const runtimeState = ensureSkillDeckRuntime(battle);
        if (!unit?.id) {
            return;
        }
        runtimeState.skillDeckByUnitId[unit.id] = cloneDeck(createDefaultDeck(unit, battle, options));
    }

    function reshuffleUnitDeck(battle, unit, options = {}) {
        const runtimeState = ensureSkillDeckRuntime(battle);
        if (!unit?.id) {
            return;
        }
        runtimeState.skillDeckByUnitId[unit.id] = cloneDeck(createDefaultDeck(unit, battle, options));
    }

    function getUnitDeck(battle, unitId) {
        const runtimeState = ensureSkillDeckRuntime(battle);
        return runtimeState.skillDeckByUnitId[unitId] || {};
    }

    function drawSkillIdFromDeck(battle, unit, options = {}) {
        const deck = getUnitDeck(battle, unit.id);
        const randomFn = options.randomFn || Math.random;
        const pool = Object.keys(deck).filter((skillId) => (deck[skillId] || 0) > 0);
        if (!pool.length) {
            reshuffleUnitDeck(battle, unit, options);
            const refreshed = getUnitDeck(battle, unit.id);
            const refreshedPool = Object.keys(refreshed).filter((skillId) => (refreshed[skillId] || 0) > 0);
            if (!refreshedPool.length) {
                return null;
            }
            const roll = Math.floor(randomFn() * refreshedPool.length);
            return refreshedPool[Math.max(0, Math.min(refreshedPool.length - 1, roll))];
        }
        const roll = Math.floor(randomFn() * pool.length);
        return pool[Math.max(0, Math.min(pool.length - 1, roll))];
    }

    function drawTurnOffers(battle, slot, unit, options = {}) {
        const offer = { top: null, bottom: null };
        if (!slot || !unit) {
            return offer;
        }

        const first = drawSkillIdFromDeck(battle, unit, options);
        if (first) {
            offer.top = first;
        }

        let second = drawSkillIdFromDeck(battle, unit, options);
        let guard = 0;
        while (second && second === offer.top && guard < 8) {
            second = drawSkillIdFromDeck(battle, unit, options);
            guard += 1;
        }
        if (second && second !== offer.top) {
            offer.bottom = second;
        }

        slot.rawSkillOffer = { ...offer };
        return applyDefenseModeToOffer(slot, unit);
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

    function applyDefenseModeToOffer(slot, unit) {
        const base = slot?.rawSkillOffer || { top: null, bottom: null };
        if (slot?.defenseMode) {
            const defenseSkill = pickDefenseSkill(unit);
            slot.skillOffer = {
                top: base.top,
                bottom: defenseSkill?.id || base.bottom,
            };
        } else {
            slot.skillOffer = { ...base };
        }
        return slot.skillOffer;
    }

    function refreshSlotSkillOffer(battle, slot, unit) {
        if (!slot) {
            return { top: null, bottom: null };
        }
        return applyDefenseModeToOffer(slot, unit);
    }

    function drawTurnOffersForSide(battle, side, options = {}) {
        const slots = side === 'enemy' ? battle.enemySlots : battle.playerSlots;
        if (!Array.isArray(slots)) {
            return;
        }
        slots.forEach((slot) => {
            const unit = side === 'player'
                ? battle.playerUnits?.find((entry) => entry.id === slot.unitId)
                : battle.enemyUnits?.find((entry) => entry.id === slot.unitId);
            if (!unit) {
                return;
            }
            drawTurnOffers(battle, slot, unit, options);
        });
    }

    function consumeSkill(battle, unitId, skillId) {
        if (!battle || !unitId || !skillId) {
            return false;
        }
        const runtimeState = ensureSkillDeckRuntime(battle);
        const deck = runtimeState.skillDeckByUnitId[unitId];
        if (!deck || typeof deck !== 'object') {
            return false;
        }
        const count = deck[skillId] || 0;
        if (count <= 0) {
            return false;
        }
        deck[skillId] = count - 1;
        return true;
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

    function pickFirstAttackOffer(slot, unit) {
        const offer = slot?.skillOffer || {};
        const skills = Array.isArray(unit?.skills) ? unit.skills : [];
        const topSkill = offer.top ? skills.find((skill) => skill.id === offer.top) : null;
        if (topSkill && isAttackSkill(topSkill)) {
            return offer.top;
        }
        const bottomSkill = offer.bottom ? skills.find((skill) => skill.id === offer.bottom) : null;
        if (bottomSkill && isAttackSkill(bottomSkill)) {
            return offer.bottom;
        }
        return offer.top || offer.bottom || null;
    }

    function resetSlotSkillState(slot) {
        if (!slot) {
            return;
        }
        slot.defenseMode = false;
        slot.rawSkillOffer = { top: null, bottom: null };
        slot.skillOffer = { top: null, bottom: null };
        slot.selectedOfferSlot = null;
    }

    function getMaxSkillSlots(battle, rules = {}) {
        const encounterType = rules.encounterType || battle?.rules?.encounterType || 'focused';
        if (encounterType === 'general') {
            return GENERAL_MAX_SKILL_SLOTS;
        }
        const encounterMax = Number.isInteger(rules.maxPlayerUnits)
            ? rules.maxPlayerUnits
            : (Number.isInteger(battle?.rules?.maxPlayerUnits) ? battle.rules.maxPlayerUnits : FOCUSED_MAX_SKILL_SLOTS);
        return Math.min(FOCUSED_MAX_SKILL_SLOTS, Math.max(1, encounterMax));
    }

    function grantSkillSlot(battle, side, unitId, createSlotFn) {
        if (!battle || !unitId || typeof createSlotFn !== 'function') {
            return null;
        }
        const slotsKey = side === 'enemy' ? 'enemySlots' : 'playerSlots';
        const slots = battle[slotsKey];
        if (!Array.isArray(slots)) {
            return null;
        }
        const unit = side === 'player'
            ? battle.playerUnits?.find((entry) => entry.id === unitId)
            : battle.enemyUnits?.find((entry) => entry.id === unitId);
        if (!unit) {
            return null;
        }
        const skillSlotIndex = slots.filter((slot) => slot.unitId === unitId).length;
        const slot = createSlotFn(unit, side, slots.length, skillSlotIndex);
        slots.push(slot);
        return slot;
    }

    function advanceSkillSlotGrowth(battle, rules = {}, createSlotFn) {
        if (!battle || battle.turn <= 1 || typeof createSlotFn !== 'function') {
            return false;
        }
        const maxSlots = getMaxSkillSlots(battle, rules);
        if (!Array.isArray(battle.playerSlots) || battle.playerSlots.length >= maxSlots) {
            return false;
        }

        const livingUnits = (battle.playerUnits || []).filter((unit) => unit.hp > 0);
        if (!livingUnits.length) {
            return false;
        }

        const sortedUnits = [...livingUnits].sort((left, right) => {
            const orderA = Number.isInteger(left.deploymentOrder) ? left.deploymentOrder : 999;
            const orderB = Number.isInteger(right.deploymentOrder) ? right.deploymentOrder : 999;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return String(left.id).localeCompare(String(right.id));
        });

        const runtimeState = ensureSkillDeckRuntime(battle);
        const rotation = Number.isInteger(runtimeState.skillSlotGrowthRotation)
            ? runtimeState.skillSlotGrowthRotation
            : 0;
        const unit = sortedUnits[rotation % sortedUnits.length];
        runtimeState.skillSlotGrowthRotation = rotation + 1;

        const slot = grantSkillSlot(battle, 'player', unit.id, createSlotFn);
        return Boolean(slot);
    }

    function sortDashboardSlots(slots, unitsById = {}) {
        return [...slots].sort((left, right) => {
            if (right.speed !== left.speed) {
                return right.speed - left.speed;
            }
            const leftUnit = unitsById[left.unitId];
            const rightUnit = unitsById[right.unitId];
            const orderA = Number.isInteger(leftUnit?.deploymentOrder) ? leftUnit.deploymentOrder : left.index;
            const orderB = Number.isInteger(rightUnit?.deploymentOrder) ? rightUnit.deploymentOrder : right.index;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            const slotIndexA = Number.isInteger(left.skillSlotIndex) ? left.skillSlotIndex : 0;
            const slotIndexB = Number.isInteger(right.skillSlotIndex) ? right.skillSlotIndex : 0;
            if (slotIndexA !== slotIndexB) {
                return slotIndexA - slotIndexB;
            }
            return left.index - right.index;
        });
    }

    const skillDeck = {
        FOCUSED_MAX_SKILL_SLOTS,
        GENERAL_MAX_SKILL_SLOTS,
        isAttackSkill,
        isDefenseSkill,
        createDefaultDeck,
        initSkillDecks,
        initUnitDeck,
        reshuffleUnitDeck,
        getUnitDeck,
        drawTurnOffers,
        drawTurnOffersForSide,
        consumeSkill,
        pickDefenseSkill,
        refreshSlotSkillOffer,
        applyDefenseModeToOffer,
        isSkillInOffer,
        getOfferSlotForSkill,
        pickSkillFromOffer,
        pickFirstAttackOffer,
        resetSlotSkillState,
        getMaxSkillSlots,
        grantSkillSlot,
        advanceSkillSlotGrowth,
        sortDashboardSlots,
    };

    battleModules.skillDeck = skillDeck;
    window.EchoesOfTheCitySkillDeck = skillDeck;
})();
