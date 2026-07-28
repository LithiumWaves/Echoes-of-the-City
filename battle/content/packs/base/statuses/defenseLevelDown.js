(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'defense_level_down',
        label: 'Defense Level Down',
        description: 'At turn start, lose Defense Level equal to Count. Expires at turn end.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
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
                            statusId: 'defense_level_down',
                        },
                    },
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'defense_level_down',
                },
            ],
        },
    });
})();
