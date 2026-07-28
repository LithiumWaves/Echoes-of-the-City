(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'damage_down',
        label: 'Damage Down',
        description: 'Deal 10% less damage with skills per count for one turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Damage_Down.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 10, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: ['attack', 'counter'] },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'dynamicDamageBonus',
                            operation: 'addStatusCountScaled',
                            statusId: 'damage_down',
                            multiplier: 0.1,
                            cap: 1,
                            direction: 'subtract',
                        },
                    ],
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'damage_down',
                },
            ],
        },
    });
})();
