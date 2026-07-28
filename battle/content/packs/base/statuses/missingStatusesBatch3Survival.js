(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    function createCountOnlyStackModel(maxCount = 1) {
        return {
            count: { enabled: true, min: 0, max: maxCount, application: 'add' },
            expireWhen: { countLte: 0 },
        };
    }

    registerStatusDefinition({
        id: 'wild_hunt',
        label: 'Wild Hunt',
        description: 'For this turn: cannot drop below 1 HP. If reduced to 1 HP, revive at turn end (heal 50% HP, set SP to 0), then die at end of next turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Wild_Hunt.png',
        stackModel: createCountOnlyStackModel(1),
        hooks: {
            beforeDamage: [
                {
                    conditions: [
                        { type: 'damageSourceIs', value: 'skill' },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'minHpAfterDamage',
                            operation: 'set',
                            value: 1,
                        },
                    ],
                },
            ],
            turnEnd: [
                {
                    conditions: [
                        { type: 'hpAtOrBelow', target: 'self', value: 1 },
                    ],
                    actions: [
                        { type: 'reviveUnit', target: 'self', value: 1 },
                        { type: 'healHpPercent', target: 'self', value: 0.5 },
                        { type: 'setSanity', target: 'self', value: 0 },
                        { type: 'applyStatus', target: 'self', statusId: 'wild_hunt_doom', count: 1 },
                        { type: 'consumeStatus', target: 'self', statusId: 'wild_hunt' },
                    ],
                },
                {
                    conditions: [
                        { type: 'hpAtOrAbove', target: 'self', value: 2 },
                    ],
                    actions: [
                        { type: 'consumeStatus', target: 'self', statusId: 'wild_hunt' },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'wild_hunt_doom',
        label: 'Wild Hunt (Doomed)',
        description: 'Dies at turn end.',
        countOnly: true,
        stackModel: createCountOnlyStackModel(1),
        hooks: {
            turnEnd: [
                { type: 'dealFixedDamage', target: 'self', statusId: 'wild_hunt_doom', amount: 9999 },
                { type: 'consumeStatus', target: 'self', statusId: 'wild_hunt_doom' },
            ],
        },
    });

    registerStatusDefinition({
        id: 'loneliness_at_high_noon',
        label: 'Loneliness at High Noon',
        description: 'Once per encounter: when taking fatal damage, HP cannot drop below 1 for the turn, and recover from Stagger.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Loneliness_at_High_Noon.png',
        stackModel: createCountOnlyStackModel(1),
        hooks: {
            beforeDamage: [
                {
                    conditions: [
                        { type: 'damageSourceIs', value: 'skill' },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'minHpAfterDamage',
                            operation: 'set',
                            value: 1,
                        },
                    ],
                },
            ],
            afterDamage: [
                {
                    conditions: [
                        { type: 'damageSourceIs', value: 'skill' },
                        { type: 'hpAtOrBelow', target: 'self', value: 1 },
                    ],
                    actions: [
                        { type: 'recoverStagger', target: 'self', value: 1 },
                        { type: 'consumeStatus', target: 'self', statusId: 'loneliness_at_high_noon' },
                    ],
                },
            ],
        },
    });
})();
