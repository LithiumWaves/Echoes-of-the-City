(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'poise',
        label: 'Poise',
        description: 'At turn end, lose 1 Count.',
        iconPath: 'assets/statuseffects/keywordstatus/Poise.png',
        stackModel: {
            potency: { enabled: true, min: 0, max: 99, application: 'add' },
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: ['attack', 'counter'] },
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'poise', value: 1 },
                        { type: 'statusPotencyAtLeast', target: 'self', statusId: 'poise', value: 1 },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'critChanceBonus',
                            operation: 'addStatusPotencyScaled',
                            statusId: 'poise',
                            multiplier: 5,
                            cap: 100,
                        },
                    ],
                },
            ],
            hitDealt: [
                {
                    conditions: [
                        { type: 'criticalHit', value: true },
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'poise', value: 1 },
                    ],
                    actions: [
                        {
                            type: 'adjustStatus',
                            target: 'self',
                            statusId: 'poise',
                            countDelta: -1,
                        },
                    ],
                },
            ],
            turnEnd: [
                {
                    conditions: [
                        { type: 'always' },
                    ],
                    actions: [
                        {
                            type: 'adjustStatus',
                            target: 'self',
                            statusId: 'poise',
                            countDelta: -1,
                        },
                    ],
                },
            ],
        },
    });
})();
