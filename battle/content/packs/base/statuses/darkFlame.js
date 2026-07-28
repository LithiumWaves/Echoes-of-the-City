(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'dark_flame',
        label: 'Dark Flame',
        description: 'At turn start, lower Defense Level by its value. At turn end, deal fixed damage equal to Dark Flame multiplied by Burn, then expire.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 7, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnStart: [
                {
                    type: 'modifyDefenseLevel',
                    target: 'self',
                    amount: {
                        multiplier: -1,
                        statusCount: {
                            target: 'self',
                            statusId: 'dark_flame',
                        },
                    },
                },
            ],
            turnEnd: [
                {
                    type: 'dealFixedDamage',
                    target: 'self',
                    statusId: 'dark_flame',
                    amount: {
                        product: [
                            {
                                statusCount: {
                                    target: 'self',
                                    statusId: 'dark_flame',
                                },
                            },
                            {
                                statusPotency: {
                                    target: 'self',
                                    statusId: 'burn',
                                },
                            },
                        ],
                    },
                },
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'dark_flame',
                },
            ],
        },
    });
})();
