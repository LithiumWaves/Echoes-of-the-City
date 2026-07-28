(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    function createCountOnlyStackModel(maxCount = 3) {
        return {
            count: { enabled: true, min: 0, max: maxCount, application: 'add' },
            expireWhen: { countLte: 0 },
        };
    }

    registerStatusDefinition({
        id: 'high_noon',
        label: 'High Noon',
        description: 'Turn Start: gain +2 Speed. Base-tagged attack skills gain +2 Power and +(45 / Coin Count)% damage.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-High_Noon.png',
        stackModel: createCountOnlyStackModel(1),
        hooks: {
            turnStart: [
                {
                    actions: [
                        { type: 'modifySpeed', target: 'self', value: 2 },
                    ],
                },
            ],
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                        { type: 'skillHasTag', value: 'base' },
                    ],
                    actions: [
                        { type: 'modifyContext', target: 'self', field: 'flatPowerBonus', operation: 'add', value: 2 },
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'dynamicDamageBonus',
                            operation: 'add',
                            amount: {
                                skillCoinCount: true,
                                inverse: true,
                                multiplier: 0.45,
                            },
                        },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'dawnherald',
        label: 'Dawnherald',
        description: 'Base-tagged burn-tagged attack skills gain +10% damage, +15% if Wrath, and +1 Power. Turn End: lose 1 Stack.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Dawnherald.png',
        stackModel: createCountOnlyStackModel(3),
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                        { type: 'skillHasTag', value: 'base' },
                        { type: 'skillHasTag', value: 'burn' },
                    ],
                    actions: [
                        { type: 'modifyContext', target: 'self', field: 'flatPowerBonus', operation: 'add', value: 1 },
                        { type: 'modifyContext', target: 'self', field: 'dynamicDamageBonus', operation: 'add', value: 0.1 },
                    ],
                },
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                        { type: 'skillHasTag', value: 'base' },
                        { type: 'skillHasTag', value: 'burn' },
                        { type: 'skillSinType', value: 'wrath' },
                    ],
                    actions: [
                        { type: 'modifyContext', target: 'self', field: 'dynamicDamageBonus', operation: 'add', value: 0.05 },
                    ],
                },
            ],
            turnEnd: [
                {
                    actions: [
                        { type: 'adjustStatus', target: 'self', statusId: 'dawnherald', countDelta: -1 },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'dawn_office',
        label: 'Dawn Office',
        description: 'Turn Start: gain Offense Level equal to Stack Count. At 3 Stack, heal 5 SP.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Dawn_Office.png',
        stackModel: createCountOnlyStackModel(3),
        hooks: {
            turnStart: [
                {
                    actions: [
                        {
                            type: 'modifyOffenseLevel',
                            target: 'self',
                            amount: {
                                statusCount: { target: 'self', statusId: 'dawn_office' },
                            },
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'dawn_office', value: 3 },
                    ],
                    actions: [
                        { type: 'adjustSanity', target: 'self', value: 5 },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'from_dawnbreak_to_sunset',
        label: 'From Dawnbreak to Sunset',
        description: 'Turn Start: heal 5 SP. Turn End: if Staggered, recover from Stagger.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-From_Dawnbreak_to_Sunset.png',
        stackModel: createCountOnlyStackModel(1),
        hooks: {
            turnStart: [
                {
                    actions: [
                        { type: 'adjustSanity', target: 'self', value: 5 },
                    ],
                },
            ],
            turnEnd: [
                {
                    conditions: [
                        { type: 'targetStaggered', target: 'self', value: true },
                    ],
                    actions: [
                        { type: 'recoverStagger', target: 'self', value: 1 },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'blazing_sunset',
        label: 'Blazing Sunset',
        description: 'Turn Start: heal 8 SP. Once per battle at Turn Start, heal 50% HP and set SP to max. Turn End: if Staggered, recover from Stagger.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Blazing_Sunset.png',
        stackModel: createCountOnlyStackModel(1),
        hooks: {
            turnStart: [
                {
                    id: 'blazing-sunset-revival-burst',
                    oncePer: 'battle',
                    actions: [
                        { type: 'healHpPercent', target: 'self', value: 0.5 },
                        { type: 'setSanity', target: 'self', value: 45 },
                    ],
                },
                {
                    actions: [
                        { type: 'adjustSanity', target: 'self', value: 8 },
                    ],
                },
            ],
            turnEnd: [
                {
                    conditions: [
                        { type: 'targetStaggered', target: 'self', value: true },
                    ],
                    actions: [
                        { type: 'recoverStagger', target: 'self', value: 1 },
                    ],
                },
            ],
        },
    });
})();
