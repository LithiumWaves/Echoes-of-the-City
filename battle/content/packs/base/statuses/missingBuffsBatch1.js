(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'power_up',
        label: 'Power Up',
        description: 'All skills gain Final Power by Count for one turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Power_Up.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'flatPowerBonus',
                    operation: 'addStatusCountScaled',
                    statusId: 'power_up',
                    multiplier: 1,
                },
            ],
            turnEnd: [
                { type: 'consumeStatus', target: 'self', statusId: 'power_up' },
            ],
        },
    });

    registerStatusDefinition({
        id: 'weak_resist_dmg_boost',
        label: 'Weak-resist DMG Boost',
        description: 'Boost damage vs weak resistances by 1% per Count for one turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Weak-resist_DMG_Boost.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'weakResistanceDamageBonus',
                    operation: 'addStatusCountScaled',
                    statusId: 'weak_resist_dmg_boost',
                    multiplier: 0.01,
                    cap: 0.99,
                },
            ],
            turnEnd: [
                { type: 'consumeStatus', target: 'self', statusId: 'weak_resist_dmg_boost' },
            ],
        },
    });

    registerStatusDefinition({
        id: 'hp_healing_boost',
        label: 'HP Healing Boost',
        description: 'Increase HP healing by 10% per Count (max 5).',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-HP_Healing_Boost.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 5, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            beforeHeal: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'healingMultiplier',
                    operation: 'setToOnePlusStatusCountScaled',
                    statusId: 'hp_healing_boost',
                    multiplier: 0.1,
                    cap: 0.5,
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'rupture_protection',
        label: 'Rupture Protection',
        description: 'Take -1 damage per Count from Rupture effects for one turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Rupture_Protection.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            beforeDamage: [
                {
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'rupture' },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'damageReductionFlat',
                            operation: 'addStatusCountScaled',
                            statusId: 'rupture_protection',
                            multiplier: 1,
                        },
                    ],
                },
            ],
            turnEnd: [
                { type: 'consumeStatus', target: 'self', statusId: 'rupture_protection' },
            ],
        },
    });

    registerStatusDefinition({
        id: 'commanding_cry',
        label: 'Commanding Cry',
        description: 'Gain 1 Clash Power and 2 Defense Level. Expires at turn end.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Commanding_Cry.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 1, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnStart: [
                { type: 'modifyDefenseLevel', target: 'self', value: 2 },
            ],
            skillSelected: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'clashPowerBonus',
                    operation: 'add',
                    value: 1,
                },
            ],
            turnEnd: [
                { type: 'consumeStatus', target: 'self', statusId: 'commanding_cry' },
            ],
        },
    });

    registerStatusDefinition({
        id: 'unrelenting_storm',
        label: 'Unrelenting Storm',
        description: 'At turn start, gain 1 Offense Level and 1 Defense Level per stack.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Unrelenting_Storm.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 2, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnStart: [
                {
                    type: 'modifyOffenseLevel',
                    target: 'self',
                    amount: {
                        statusCount: { target: 'self', statusId: 'unrelenting_storm' },
                    },
                },
                {
                    type: 'modifyDefenseLevel',
                    target: 'self',
                    amount: {
                        statusCount: { target: 'self', statusId: 'unrelenting_storm' },
                    },
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'somatic_frisson_inspiring_melody',
        label: 'Somatic Frisson-inspiring Melody',
        description: 'Min & Max Speed +1. Base attack skills gain +1 Clash Power and +10% damage.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Somatic_Frisson-inspiring_Melody.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 1, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnStart: [
                { type: 'modifySpeed', target: 'self', value: 1 },
            ],
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                    ],
                    actions: [
                        { type: 'modifyContext', target: 'self', field: 'clashPowerBonus', operation: 'add', value: 1 },
                        { type: 'modifyContext', target: 'self', field: 'damageMultiplier', operation: 'add', value: 0.1 },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'scarlet_moth',
        label: 'Scarlet Moth',
        description: 'At turn end, heal HP% and SP equal to stacks, then lose 1 stack.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Scarlet_Moth.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 3, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnEnd: [
                {
                    type: 'healHpPercent',
                    target: 'self',
                    amount: {
                        multiplier: 0.01,
                        statusCount: { target: 'self', statusId: 'scarlet_moth' },
                    },
                },
                {
                    type: 'adjustSanity',
                    target: 'self',
                    amount: {
                        statusCount: { target: 'self', statusId: 'scarlet_moth' },
                    },
                },
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'scarlet_moth',
                    countDelta: -1,
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'dark_cloud_blade',
        label: 'Dark Cloud Blade',
        description: 'Gain +1 Final Power with Slash skills. On hit with Slash skills, inflict 1 Bleed.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Dark_Cloud_Blade.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 1, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillDamageType', value: 'slash' },
                    ],
                    actions: [
                        { type: 'modifyContext', target: 'self', field: 'flatPowerBonus', operation: 'add', value: 1 },
                    ],
                },
            ],
            hitDealt: [
                {
                    conditions: [
                        { type: 'skillDamageType', value: 'slash' },
                    ],
                    actions: [
                        { type: 'applyStatus', target: 'opponent', statusId: 'bleed', potency: 1, count: 1 },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'battle_ready',
        label: 'Battle Ready',
        description: 'Bleed inflicted +1 Potency and +1 Count. Slash skills gain +1 Final Power and +3% damage.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Battle_Ready.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 1, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            statusInflicted: [
                {
                    oncePer: 'coin',
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'bleed' },
                    ],
                    actions: [
                        { type: 'applyStatus', target: 'opponent', statusId: 'bleed', potency: 1, count: 1 },
                    ],
                },
            ],
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillDamageType', value: 'slash' },
                    ],
                    actions: [
                        { type: 'modifyContext', target: 'self', field: 'flatPowerBonus', operation: 'add', value: 1 },
                        { type: 'modifyContext', target: 'self', field: 'damageMultiplier', operation: 'add', value: 0.03 },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'strider_wu',
        label: 'Strider【Wu】',
        description: 'At turn end, gain Haste +2 next turn and Aggro equal to (stack x 2) next turn. On the first 6 hits of a turn, inflict Tremor Potency equal to stacks. Lose 1 stack at turn end.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Strider_-Wu-.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 3, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            hitDealt: [
                ...[1, 2, 3, 4, 5, 6].map((coinIndex) => ({
                    conditions: [
                        { type: 'coinIndex', value: coinIndex },
                        { type: 'skillType', value: 'attack' },
                    ],
                    actions: [
                        {
                            type: 'applyStatus',
                            target: 'opponent',
                            statusId: 'tremor',
                            potencyAmount: { statusCount: { target: 'self', statusId: 'strider_wu' } },
                            count: 1,
                        },
                    ],
                })),
            ],
            turnEnd: [
                {
                    type: 'queueStatus',
                    target: 'self',
                    statusId: 'haste',
                    count: 2,
                },
                {
                    type: 'queueStatus',
                    target: 'self',
                    statusId: 'aggro',
                    countAmount: {
                        multiplier: 2,
                        statusCount: { target: 'self', statusId: 'strider_wu' },
                    },
                },
                { type: 'adjustStatus', target: 'self', statusId: 'strider_wu', countDelta: -1 },
            ],
        },
    });

    registerStatusDefinition({
        id: 'strider_mao',
        label: 'Strider【Mao】',
        description: 'At turn end, gain 5 Haste next turn, then lose 1 stack.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Strider_-Mao-.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 3, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnEnd: [
                { type: 'queueStatus', target: 'self', statusId: 'haste', count: 5 },
                { type: 'adjustStatus', target: 'self', statusId: 'strider_mao', countDelta: -1 },
            ],
        },
    });

    registerStatusDefinition({
        id: 'burgeoning_of_horns',
        label: 'Burgeoning of Horns [發角]',
        description: 'Base skills inflict +1 Rupture Potency and +1 Sinking Potency. Lose 1 stack at turn end.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Burgeoning_of_Horns_-發角-.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 3, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            statusInflicted: [
                {
                    oncePer: 'coin',
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'rupture' },
                    ],
                    actions: [
                        { type: 'applyStatus', target: 'opponent', statusId: 'rupture', potency: 1, count: 0 },
                    ],
                },
                {
                    oncePer: 'coin',
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'sinking' },
                    ],
                    actions: [
                        { type: 'applyStatus', target: 'opponent', statusId: 'sinking', potency: 1, count: 0 },
                    ],
                },
            ],
            turnEnd: [
                { type: 'adjustStatus', target: 'self', statusId: 'burgeoning_of_horns', countDelta: -1 },
            ],
        },
    });
})();
