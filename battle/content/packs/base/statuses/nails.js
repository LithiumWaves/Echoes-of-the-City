(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'nails',
        label: 'Nails',
        description: 'At turn start, gain 1 Bleed and Bleed Count equal to Nails Count. At turn end, halve Nails Count, rounded down.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnStart: [
                {
                    type: 'applyStatus',
                    target: 'self',
                    statusId: 'bleed',
                    potency: 1,
                    countAmount: {
                        statusCount: {
                            target: 'self',
                            statusId: 'nails',
                        },
                    },
                },
            ],
            turnEnd: [
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'nails',
                    countOperation: 'set',
                    countAmount: {
                        multiplier: 0.5,
                        statusCount: {
                            target: 'self',
                            statusId: 'nails',
                        },
                    },
                },
            ],
        },
    });
})();
