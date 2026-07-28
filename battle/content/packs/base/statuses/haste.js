(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'haste',
        label: 'Haste',
        description: 'At turn start, gain Speed equal to Count. Expires at turn end.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnStart: [
                {
                    type: 'modifySpeed',
                    target: 'self',
                    amount: {
                        statusCount: {
                            target: 'self',
                            statusId: 'haste',
                        },
                    },
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'haste',
                },
            ],
        },
    });
})();
