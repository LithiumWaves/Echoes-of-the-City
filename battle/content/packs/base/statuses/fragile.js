(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'fragile',
        label: 'Fragile',
        description: 'Take 10% more damage per Count. Expires at turn end.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            beforeDamage: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'damageReductionMultiplier',
                    operation: 'setToOnePlusStatusCountScaled',
                    statusId: 'fragile',
                    statusSource: 'self',
                    multiplier: 0.1,
                },
            ],
            turnEnd: [
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'fragile',
                },
            ],
        },
    });
})();
