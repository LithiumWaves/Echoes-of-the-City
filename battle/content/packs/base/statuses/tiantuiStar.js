(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'tiantui_star',
        label: 'Tiantui Star [天退星]',
        description: 'Min & Max Speed +1. If this unit is 3+ Speed faster than the target, deal +(Speed difference x 2.5)% damage, up to 20%. Tremor inflicted by this unit\'s skills gains +1 Potency and +1 Count. If this unit has spent 8+ Tigermark/Savage Tigermark Rounds, convert this buff into Shin (心) - Tiantui Star next turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Unrelenting_Spirit_-剛氣-.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 1, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnStart: [
                {
                    type: 'modifySpeed',
                    target: 'self',
                    value: 1,
                },
            ],
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'damageMultiplier',
                            operation: 'addSpeedDifferenceScaled',
                            multiplier: 0.025,
                            minDifference: 3,
                            cap: 0.2,
                        },
                    ],
                },
            ],
            statusInflicted: [
                {
                    oncePer: 'coin',
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'tremor' },
                    ],
                    actions: [
                        {
                            type: 'applyStatus',
                            target: 'opponent',
                            statusId: 'tremor',
                            potency: 1,
                            count: 1,
                        },
                    ],
                },
            ],
            turnEnd: [
                {
                    conditions: [
                        {
                            type: 'encounterResourceAtLeast',
                            target: 'self',
                            resourceId: 'tigermark_rounds_spent',
                            value: 8,
                        },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'shin_tiantui_star',
                            count: 1,
                        },
                        {
                            type: 'consumeStatus',
                            target: 'self',
                            statusId: 'tiantui_star',
                        },
                    ],
                },
            ],
        },
    });
})();
