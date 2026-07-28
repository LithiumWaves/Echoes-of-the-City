(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'clash_power_down',
        label: 'Clash Power Down',
        description: 'Lose Clash Power by the effect potency for one turn.',
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Clash_Power_Down.png',
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
                    field: 'clashPowerBonus',
                    operation: 'add',
                    amount: {
                        multiplier: -1,
                        statusPotency: {
                            target: 'self',
                            statusId: 'clash_power_down',
                        },
                    },
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'clash_power_down',
                },
            ],
        },
    });
})();
