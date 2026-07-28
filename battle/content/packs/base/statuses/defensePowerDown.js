(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'defense_power_down',
        label: 'Defense Power Down',
        description: 'Defense skills lose Final Power by the effect potency for one turn.',
        stackModel: {
            potency: { enabled: true, min: 0, max: 99, application: 'add' },
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { potencyLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: ['guard', 'evade', 'counter'] },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'flatPowerBonus',
                            operation: 'add',
                            amount: {
                                multiplier: -1,
                                statusPotency: {
                                    target: 'self',
                                    statusId: 'defense_power_down',
                                },
                            },
                        },
                    ],
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'defense_power_down',
                },
            ],
        },
    });
})();
