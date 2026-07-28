(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'spore',
        label: 'Spore',
        description: 'At turn end, gain 1 Burn Count for every 5 Spore and gain 1 Bind next turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Spore.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 15, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnEnd: [
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'spore', value: 5 },
                    ],
                    actions: [
                        {
                            type: 'applyStatus',
                            target: 'self',
                            statusId: 'burn',
                            potency: 0,
                            count: 1,
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'spore', value: 10 },
                    ],
                    actions: [
                        {
                            type: 'applyStatus',
                            target: 'self',
                            statusId: 'burn',
                            potency: 0,
                            count: 1,
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'spore', value: 15 },
                    ],
                    actions: [
                        {
                            type: 'applyStatus',
                            target: 'self',
                            statusId: 'burn',
                            potency: 0,
                            count: 1,
                        },
                    ],
                },
                {
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'bind',
                            count: 1,
                        },
                    ],
                },
            ],
        },
    });
})();
