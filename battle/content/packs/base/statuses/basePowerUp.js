(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'base_power_up',
        label: 'Base Power Up',
        description: 'Raise the base power of skills by the effect count for one turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Base_Power_Up.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'flatPowerBonus',
                    operation: 'add',
                    amount: {
                        statusCount: {
                            target: 'self',
                            statusId: 'base_power_up',
                        },
                    },
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'base_power_up',
                },
            ],
        },
    });
})();
