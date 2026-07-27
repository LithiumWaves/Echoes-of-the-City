(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'sinking',
        label: 'Sinking',
        description: 'When hit, lose SP equal to Potency, then lose 1 Count.',
        iconPath: 'assets/statuseffects/keywordstatus/Sinking.png',
        stackModel: {
            potency: { enabled: true, min: 0, max: 99, application: 'add' },
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            hitTaken: [
                {
                    type: 'adjustSanity',
                    target: 'self',
                    statusId: 'sinking',
                    reason: 'sinking',
                    amount: {
                        multiplier: -1,
                        statusPotency: {
                            target: 'self',
                            statusId: 'sinking',
                        },
                    },
                },
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'sinking',
                    countDelta: -1,
                },
            ],
        },
    });
})();
