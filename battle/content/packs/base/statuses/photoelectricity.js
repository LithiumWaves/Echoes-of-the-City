(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'photoelectricity',
        label: 'Photoelectricity',
        description: 'Once per skill when hit, the attacker gains Charge Count equal to this value; attackers at 5 or less Charge Count gain 3 more. Expires at turn end.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 3, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            hitTaken: [
                {
                    oncePer: 'skill',
                    conditions: [
                        {
                            type: 'statusCountAtOrBelow',
                            target: 'opponent',
                            statusId: 'charge',
                            value: 5,
                        },
                    ],
                    actions: [
                        {
                            type: 'adjustStatus',
                            target: 'opponent',
                            statusId: 'charge',
                            countDelta: 3,
                        },
                    ],
                },
                {
                    oncePer: 'skill',
                    actions: [
                        {
                            type: 'adjustStatus',
                            target: 'opponent',
                            statusId: 'charge',
                            countAmount: {
                                statusCount: {
                                    target: 'self',
                                    statusId: 'photoelectricity',
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
                    statusId: 'photoelectricity',
                },
            ],
        },
    });
})();
