(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    const syncBarrierShield = {
        type: 'gainShield',
        target: 'self',
        shieldId: 'charge_barrier',
        operation: 'set',
        stackSize: 3,
        expiresAt: 'turnEnd',
        linkedStatusId: 'charge_barrier',
        linkedStatusCountDeltaOnBreak: -1,
        amount: {
            statusCount: {
                target: 'self',
                statusId: 'charge_barrier',
            },
            multiplier: 3,
        },
    };

    registerStatusDefinition({
        id: 'charge_barrier',
        label: 'Charge Barrier',
        description: 'Maintains temporary shield worth 3 per stack. Broken shield layers reduce Charge Barrier by 1; at turn end, convert remaining stacks into Charge Count and expire.',
        countOnly: true,
        stackModel: {
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            statusApplied: [
                {
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'charge_barrier' },
                    ],
                    actions: [syncBarrierShield],
                },
            ],
            statusChanged: [
                {
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'charge_barrier' },
                    ],
                    actions: [syncBarrierShield],
                },
            ],
            turnStart: [
                syncBarrierShield,
            ],
            turnEnd: [
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'charge',
                    countAmount: {
                        statusCount: {
                            target: 'self',
                            statusId: 'charge_barrier',
                        },
                    },
                },
                {
                    type: 'consumeStatus',
                    target: 'self',
                    statusId: 'charge_barrier',
                },
            ],
        },
    });
})();
