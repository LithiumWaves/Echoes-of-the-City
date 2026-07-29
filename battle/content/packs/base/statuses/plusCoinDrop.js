(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'plus_coin_drop',
        label: 'Plus Coin Drop',
        description: 'Reduces plus-coin values this turn. Expires at turn end.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillCoinPowerSign', value: 'plus' },
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'plus_coin_drop', value: 1 },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'coinPowerBonus',
                            operation: 'addStatusCountScaled',
                            statusId: 'plus_coin_drop',
                            multiplier: 1,
                            direction: 'subtract',
                        },
                    ],
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'plus_coin_drop',
                },
            ],
        },
    });
})();
