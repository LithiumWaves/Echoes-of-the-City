(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'attack_power_down',
        label: 'Attack Power Down',
        description: 'Attack skills lose Final Power by the effect potency for one turn.',
        stackModel: {
            potency: { enabled: true, min: 0, max: 99, application: 'add' },
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { potencyLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'flatPowerBonus',
                    operation: 'add',
                    amount: {
                        multiplier: -1,
                        statusPotency: {
                            target: 'self',
                            statusId: 'attack_power_down',
                        },
                    },
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'attack_power_down',
                },
            ],
        },
    });
})();
