(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    function createCountOnlyStackModel(maxCount = 10) {
        return {
            count: { enabled: true, min: 0, max: maxCount, application: 'add' },
            expireWhen: { countLte: 0 },
        };
    }

    function createBloomingThornHooks(statusId, options = {}) {
        const {
            extraPotency = 0,
            promoteAt = null,
            promoteTo = null,
            demoteBelow = null,
            demoteTo = null,
        } = options;
        const turnStartBlocks = [];

        for (let threshold = 2; threshold <= 10; threshold += 2) {
            turnStartBlocks.push({
                conditions: [
                    { type: 'statusCountAtLeast', target: 'self', statusId, value: threshold },
                ],
                actions: [
                    { type: 'modifyDefenseLevel', target: 'self', value: 1 },
                ],
            });
        }

        const statusHooks = {
            turnStart: turnStartBlocks,
            hitTaken: [
                {
                    actions: [
                        { type: 'applyStatus', target: 'opponent', statusId: 'bleed', potency: 1, count: 1 },
                        { type: 'adjustStatus', target: 'self', statusId, countDelta: -1 },
                    ],
                },
            ],
        };

        if (extraPotency > 0) {
            statusHooks.statusInflicted = [
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                        { type: 'skillHasTag', value: 'base' },
                        { type: 'eventStatusIdIs', value: 'bleed' },
                    ],
                    actions: [
                        { type: 'adjustStatus', target: 'opponent', statusId: 'bleed', potencyDelta: extraPotency, countDelta: 0 },
                    ],
                },
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                        { type: 'skillHasTag', value: 'base' },
                        { type: 'eventStatusIdIs', value: 'rupture' },
                    ],
                    actions: [
                        { type: 'adjustStatus', target: 'opponent', statusId: 'rupture', potencyDelta: extraPotency, countDelta: 0 },
                    ],
                },
            ];
        }

        const conversionBlocks = [];
        if (typeof promoteAt === 'number' && promoteTo) {
            conversionBlocks.push({
                conditions: [
                    { type: 'eventStatusIdIs', value: statusId },
                    { type: 'statusCountAtLeast', target: 'self', statusId, value: promoteAt },
                ],
                actions: [
                    {
                        type: 'applyStatus',
                        target: 'self',
                        statusId: promoteTo,
                        countAmount: {
                            statusCount: { target: 'self', statusId },
                        },
                    },
                    { type: 'consumeStatus', target: 'self', statusId },
                ],
            });
        }
        if (typeof demoteBelow === 'number' && demoteTo) {
            conversionBlocks.push({
                conditions: [
                    { type: 'eventStatusIdIs', value: statusId },
                    { type: 'statusCountAtOrBelow', target: 'self', statusId, value: demoteBelow - 1 },
                ],
                actions: [
                    {
                        type: 'applyStatus',
                        target: 'self',
                        statusId: demoteTo,
                        countAmount: {
                            statusCount: { target: 'self', statusId },
                        },
                    },
                    { type: 'consumeStatus', target: 'self', statusId },
                ],
            });
        }

        if (conversionBlocks.length) {
            statusHooks.statusApplied = conversionBlocks;
            statusHooks.statusChanged = conversionBlocks;
        }

        return statusHooks;
    }

    registerStatusDefinition({
        id: 'bloodflame',
        label: 'Bloodflame [血炎]',
        description: 'Base-tagged attack skills inflict +1 Burn and Rupture potency. On the first staggered target hit each turn, heal 3 SP; at max SP, queue 1 Haste and 1 Offense Level Up next turn. Turn End: lose 1 Stack.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Bloodflame_-血炎-.png',
        stackModel: createCountOnlyStackModel(3),
        hooks: {
            statusInflicted: [
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                        { type: 'skillHasTag', value: 'base' },
                        { type: 'eventStatusIdIs', value: 'burn' },
                    ],
                    actions: [
                        { type: 'adjustStatus', target: 'opponent', statusId: 'burn', potencyDelta: 1, countDelta: 0 },
                    ],
                },
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                        { type: 'skillHasTag', value: 'base' },
                        { type: 'eventStatusIdIs', value: 'rupture' },
                    ],
                    actions: [
                        { type: 'adjustStatus', target: 'opponent', statusId: 'rupture', potencyDelta: 1, countDelta: 0 },
                    ],
                },
            ],
            hitDealt: [
                {
                    id: 'bloodflame-stagger-sp',
                    oncePer: 'turn',
                    conditions: [
                        { type: 'targetStaggered', value: true },
                    ],
                    actions: [
                        { type: 'adjustSanity', target: 'self', value: 3 },
                    ],
                },
                {
                    id: 'bloodflame-stagger-bonus',
                    oncePer: 'turn',
                    conditions: [
                        { type: 'targetStaggered', value: true },
                        { type: 'spAtOrAbove', target: 'self', value: 45 },
                    ],
                    actions: [
                        { type: 'queueStatus', target: 'self', statusId: 'offense_level_up', count: 1 },
                        { type: 'queueStatus', target: 'self', statusId: 'haste', count: 1 },
                    ],
                },
            ],
            turnEnd: [
                {
                    actions: [
                        { type: 'adjustStatus', target: 'self', statusId: 'bloodflame', countDelta: -1 },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'fanatic',
        label: 'Fanatic',
        description: 'For the turn, gain Final Power equal to Stack Count against targets with Nails.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Fanatic.png',
        stackModel: createCountOnlyStackModel(10),
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'hasStatus', target: 'opponent', statusId: 'nails' },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'flatPowerBonus',
                            operation: 'addStatusCountScaled',
                            statusId: 'fanatic',
                            multiplier: 1,
                        },
                    ],
                },
            ],
            turnEnd: [
                {
                    actions: [
                        { type: 'consumeStatus', target: 'self', statusId: 'fanatic' },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'blooming_thorn',
        label: 'Blooming Thorn',
        description: 'Stage I. Gain 1 Defense Level for every 2 Stack (max 5). When hit, inflict 1 Bleed on the attacker and lose 1 Stack. At 10+ Stack, become Blooming Thorn II.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Blooming_Thorn.png',
        stackModel: createCountOnlyStackModel(30),
        hooks: createBloomingThornHooks('blooming_thorn', {
            extraPotency: 0,
            promoteAt: 10,
            promoteTo: 'blooming_thorn_ii',
        }),
    });

    registerStatusDefinition({
        id: 'blooming_thorn_ii',
        label: 'Blooming Thorn II',
        description: 'Stage II. Gain 1 Defense Level for every 2 Stack (max 5). When hit, inflict 1 Bleed on the attacker and lose 1 Stack. Base-tagged attack skills inflict +1 Bleed and Rupture potency. At 20+ Stack, become Blooming Thorn III; below 10 Stack, revert to Stage I.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Bloodwoven_Thorn.png',
        stackModel: createCountOnlyStackModel(30),
        hooks: createBloomingThornHooks('blooming_thorn_ii', {
            extraPotency: 1,
            promoteAt: 20,
            promoteTo: 'blooming_thorn_iii',
            demoteBelow: 10,
            demoteTo: 'blooming_thorn',
        }),
    });

    registerStatusDefinition({
        id: 'blooming_thorn_iii',
        label: 'Blooming Thorn III',
        description: 'Stage III. Gain 1 Defense Level for every 2 Stack (max 5). When hit, inflict 1 Bleed on the attacker and lose 1 Stack. Base-tagged attack skills inflict +2 Bleed and Rupture potency. Below 20 Stack, revert to Stage II.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Bloodmolded_Thorn.png',
        stackModel: createCountOnlyStackModel(30),
        hooks: createBloomingThornHooks('blooming_thorn_iii', {
            extraPotency: 2,
            demoteBelow: 20,
            demoteTo: 'blooming_thorn_ii',
        }),
    });

    registerStatusDefinition({
        id: 'festive_fever',
        label: 'Festive Fever',
        description: 'Against Bleeding targets, deal +1.5% damage per Stack. Bloodfeast-tagged skills gain an additional +1.5% damage per Stack. Expires at Turn End.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Festive_Fever.png',
        stackModel: createCountOnlyStackModel(10),
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'hasStatus', target: 'opponent', statusId: 'bleed' },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'dynamicDamageBonus',
                            operation: 'addStatusCountScaled',
                            statusId: 'festive_fever',
                            multiplier: 0.015,
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'hasStatus', target: 'opponent', statusId: 'bleed' },
                        { type: 'skillHasTag', value: 'bloodfeast' },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'dynamicDamageBonus',
                            operation: 'addStatusCountScaled',
                            statusId: 'festive_fever',
                            multiplier: 0.015,
                        },
                    ],
                },
            ],
            turnEnd: [
                {
                    actions: [
                        { type: 'consumeStatus', target: 'self', statusId: 'festive_fever' },
                    ],
                },
            ],
        },
    });
})();
