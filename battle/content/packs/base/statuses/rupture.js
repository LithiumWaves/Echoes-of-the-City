(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'rupture',
        label: 'Rupture',
        description: 'When hit, take fixed damage equal to Potency, then lose 1 Count.',
        iconPath: 'assets/statuseffects/keywordstatus/Rupture.png',
        stackModel: {
            potency: { enabled: true, min: 0, max: 99, application: 'add' },
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            hitTaken: [
                {
                    type: 'dealFixedDamage',
                    target: 'self',
                    statusId: 'rupture',
                    amount: {
                        statusPotency: {
                            target: 'self',
                            statusId: 'rupture',
                        },
                    },
                },
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'rupture',
                    countDelta: -1,
                },
            ],
        },
    });
})();
