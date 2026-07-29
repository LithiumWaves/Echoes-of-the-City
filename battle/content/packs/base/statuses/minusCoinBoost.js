(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'minus_coin_boost',
        label: 'Minus Coin Boost',
        description: 'Worsens minus-coin values this turn. Expires at turn end.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillCoinPowerSign', value: 'minus' },
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'minus_coin_boost', value: 1 },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'coinPowerBonus',
                            operation: 'addStatusCountScaled',
                            statusId: 'minus_coin_boost',
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
                    statusId: 'minus_coin_boost',
                },
            ],
        },
    });
})();
