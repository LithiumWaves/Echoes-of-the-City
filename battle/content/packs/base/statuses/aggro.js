(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'aggro',
        label: 'Aggro',
        description: 'In focused encounters, slots with higher Aggro are more likely to be targeted by enemies this turn.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'aggro',
                },
            ],
        },
    });
})();
