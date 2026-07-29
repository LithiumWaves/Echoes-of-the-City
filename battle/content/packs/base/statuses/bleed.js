(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'bleed',
        label: 'Bleed',
        description: 'On coin roll, take fixed damage equal to Potency, then lose 1 Count.',
        iconPath: 'assets/statuseffects/keywordstatus/Bleed.png',
        stackModel: {
            potency: { enabled: true, min: 0, max: 99, application: 'add' },
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            coinRoll: [
                {
                    type: 'dealFixedDamage',
                    target: 'self',
                    statusId: 'bleed',
                    amount: {
                        statusPotency: {
                            target: 'self',
                            statusId: 'bleed',
                        },
                    },
                },
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'bleed',
                    countDelta: -1,
                },
            ],
            afterDamage: [
                {
                    conditions: [
                        { type: 'damageSourceIs', value: 'status' },
                        { type: 'eventStatusIdIs', value: 'bleed' },
                        { type: 'damageAtLeast', value: 1 },
                    ],
                    actions: [
                        {
                            type: 'adjustEncounterResource',
                            resourceId: 'bloodfeast',
                            amount: { damage: true },
                            max: 999,
                            reason: 'bleed damage',
                        },
                    ],
                },
            ],
        },
    });
})();
