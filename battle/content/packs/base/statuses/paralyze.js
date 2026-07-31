(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'paralysis',
        label: 'Paralysis',
        description: 'On coin roll, force the coin to roll tails and lose 1 Count. Expires at turn end.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            coinRoll: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'forceCoinZero',
                    operation: 'set',
                    value: true,
                },
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'paralysis',
                    countDelta: -1,
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'paralysis',
                },
            ],
        },
    }, { aliases: ['paralyze'] });
})();
