(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'burn',
        name: 'Burn',
        label: 'Burn',
        description: 'At turn end, take fixed damage equal to Potency, then lose 1 Count.',
        iconPath: 'assets/statuseffects/keywordstatus/Burn.png',
        stackModel: {
            potency: {
                enabled: true,
                min: 0,
                max: 99,
                application: 'add',
            },
            count: {
                enabled: true,
                min: 0,
                max: 99,
                application: 'add',
            },
            expireWhen: {
                countLte: 0,
            },
        },
        hooks: {
            turnEnd: [
                {
                    type: 'dealFixedDamage',
                    target: 'self',
                    statusId: 'burn',
                    amount: {
                        statusPotency: {
                            target: 'self',
                            statusId: 'burn',
                        },
                    },
                },
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'burn',
                    countDelta: -1,
                },
            ],
        },
    });
})();
