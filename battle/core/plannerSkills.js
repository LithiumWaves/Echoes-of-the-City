(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function getOpponentSide(side) {
        return side === 'player' ? 'enemy' : 'player';
    }

    function getFirstOpponentUnit(battle, unit) {
        if (!battle || !unit) {
            return null;
        }
        const opponentSide = getOpponentSide(unit.side);
        const slots = opponentSide === 'player' ? battle.playerSlots : battle.enemySlots;
        const firstSlot = Array.isArray(slots) ? slots.find((slot) => slot?.unitId) : null;
        if (!firstSlot?.unitId) {
            return null;
        }
        const units = opponentSide === 'player' ? battle.playerUnits : battle.enemyUnits;
        return Array.isArray(units) ? units.find((entry) => entry?.id === firstSlot.unitId) : null;
    }

    function createVariantRuntime(unit, battle) {
        return {
            unit,
            battle,
            sourceUnit: unit,
            targetUnit: getFirstOpponentUnit(battle, unit),
        };
    }

    function variantConditionsMatch(conditions, unit, battle, evaluateHookConditions) {
        if (!Array.isArray(conditions) || !conditions.length) {
            return true;
        }
        if (typeof evaluateHookConditions !== 'function') {
            return false;
        }
        return evaluateHookConditions(conditions, createVariantRuntime(unit, battle));
    }

    function pickActiveVariant(variants, unit, battle, evaluateHookConditions) {
        if (!Array.isArray(variants) || !variants.length) {
            return null;
        }
        const sorted = [...variants].sort((left, right) => {
            const leftPriority = Number.isInteger(left?.variantPriority) ? left.variantPriority : 0;
            const rightPriority = Number.isInteger(right?.variantPriority) ? right.variantPriority : 0;
            return rightPriority - leftPriority;
        });
        for (const skill of sorted) {
            const conditions = skill?.variantConditions;
            if (Array.isArray(conditions) && conditions.length) {
                if (variantConditionsMatch(conditions, unit, battle, evaluateHookConditions)) {
                    return skill;
                }
            }
        }
        return sorted.find((skill) => !Array.isArray(skill?.variantConditions) || !skill.variantConditions.length) || sorted[sorted.length - 1];
    }

    function resolvePlannerSkills(unit, battle, options = {}) {
        if (!unit || !Array.isArray(unit.skills)) {
            return [];
        }
        const evaluateHookConditions = options.evaluateHookConditions
            || (typeof battleModules.createHookConditionEvaluator === 'function'
                ? battleModules.createHookConditionEvaluator({})
                : null);
        const bySlot = new Map();
        const standalone = [];

        unit.skills.forEach((skill, index) => {
            if (!skill || skill.showInPlanner === false) {
                return;
            }
            if (skill.skillSlot) {
                if (!bySlot.has(skill.skillSlot)) {
                    bySlot.set(skill.skillSlot, []);
                }
                bySlot.get(skill.skillSlot).push({ skill, index });
                return;
            }
            standalone.push({ skill, index });
        });

        const slotted = [];
        bySlot.forEach((entries, slotId) => {
            const variants = entries.map((entry) => entry.skill);
            const active = pickActiveVariant(variants, unit, battle, evaluateHookConditions);
            if (active) {
                const sourceIndex = entries.find((entry) => entry.skill.id === active.id)?.index ?? entries[0].index;
                slotted.push({ skill: active, index: sourceIndex, skillSlot: slotId });
            }
        });

        const combined = [...standalone, ...slotted];
        combined.sort((left, right) => left.index - right.index);
        return combined.map((entry) => entry.skill);
    }

    const plannerSkills = {
        resolvePlannerSkills,
        pickActiveVariant,
    };

    battleModules.plannerSkills = plannerSkills;
    window.EchoesOfTheCityPlannerSkills = plannerSkills;
})();
