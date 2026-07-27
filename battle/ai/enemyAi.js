(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function normalizeEnemyAiProfile(profile) {
        if (!profile) {
            return { skill: 'cycle', target: 'mirror' };
        }

        if (typeof profile === 'string') {
            return { skill: profile, target: 'mirror' };
        }

        if (typeof profile !== 'object') {
            return { skill: 'cycle', target: 'mirror' };
        }

        return {
            skill: profile.skill || 'cycle',
            target: profile.target || 'mirror',
        };
    }

    function pickEnemySkillId(profile, battle, slot, unit) {
        const skills = Array.isArray(unit?.skills) ? unit.skills : [];
        if (!skills.length) {
            return null;
        }

        if (profile.skill === 'random') {
            const index = Math.floor(Math.random() * skills.length);
            return skills[index]?.id || skills[0].id;
        }

        if (profile.skill === 'first') {
            return skills[0].id;
        }

        const index = (battle.turn + slot.index - 1) % skills.length;
        return skills[index]?.id || skills[0].id;
    }

    function pickLowestHpTarget(battle, playerSlots, getUnitById) {
        const alive = playerSlots
            .map((candidate) => ({
                slot: candidate,
                unit: getUnitById(battle, candidate.unitId),
            }))
            .filter(({ unit }) => unit && unit.hp > 0);

        alive.sort((left, right) => {
            if (left.unit.hp !== right.unit.hp) {
                return left.unit.hp - right.unit.hp;
            }
            return left.slot.index - right.slot.index;
        });

        return alive[0]?.slot?.id || null;
    }

    function pickEnemyTargetSlotId(profile, battle, slot, unit, helpers) {
        const {
            getFirstLivingSlotId,
            isSlotAlive,
            getUnitById,
        } = helpers || {};

        const playerSlots = Array.isArray(battle.playerSlots) ? battle.playerSlots : [];

        if (profile.target === 'random') {
            const living = playerSlots.filter((candidate) => (typeof isSlotAlive === 'function' ? isSlotAlive(battle, candidate) : true));
            if (!living.length) {
                return typeof getFirstLivingSlotId === 'function' ? getFirstLivingSlotId(battle, 'player') : null;
            }
            const index = Math.floor(Math.random() * living.length);
            return living[index]?.id || living[0].id;
        }

        if (profile.target === 'lowestHp' && typeof getUnitById === 'function') {
            return pickLowestHpTarget(battle, playerSlots, getUnitById) || (typeof getFirstLivingSlotId === 'function' ? getFirstLivingSlotId(battle, 'player') : null);
        }

        if (profile.target === 'firstLiving') {
            return typeof getFirstLivingSlotId === 'function' ? getFirstLivingSlotId(battle, 'player') : null;
        }

        const mirroredPlayerSlot = playerSlots[slot.index];
        if (mirroredPlayerSlot && typeof isSlotAlive === 'function' && isSlotAlive(battle, mirroredPlayerSlot)) {
            return mirroredPlayerSlot.id;
        }

        return typeof getFirstLivingSlotId === 'function' ? getFirstLivingSlotId(battle, 'player') : null;
    }

    function createEnemyAi(profileInput) {
        const profile = normalizeEnemyAiProfile(profileInput);
        return {
            profile,
            pickEnemySkillId: (battle, slot, unit) => pickEnemySkillId(profile, battle, slot, unit),
            pickEnemyTargetSlotId: (battle, slot, unit, helpers) => pickEnemyTargetSlotId(profile, battle, slot, unit, helpers),
        };
    }

    battleModules.createEnemyAi = createEnemyAi;

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        createEnemyAi,
    };
})();

