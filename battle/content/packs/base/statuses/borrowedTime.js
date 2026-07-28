(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'borrowed_time',
        label: 'Borrowed Time',
        description: 'Turn End at 2+ Count: queue Haste, Clash Power Up, and Fragile next turn equal to Count - 1. At 1 Count: queue Bind equal to 2 x (Stacks - 1). Turn Start: if Bind exceeds Haste, expire and become Staggered. Turn End: gain 1 Stack and lose 1 Count.',
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Borrowed_Time.png',
        stackModel: {
            potency: { enabled: true, min: 0, max: 99, application: 'add' },
            count: { enabled: true, min: 0, max: 99, application: 'add' },
        },
        hooks: {
            turnStart: [
                {
                    conditions: [
                        {
                            type: 'statusCountGreaterThanStatus',
                            target: 'self',
                            statusId: 'bind',
                            otherTarget: 'self',
                            otherStatusId: 'haste',
                        },
                    ],
                    actions: [
                        { type: 'consumeStatus', target: 'self', statusId: 'borrowed_time' },
                        { type: 'staggerUnit', target: 'self', value: 1 },
                    ],
                },
            ],
            turnEnd: [
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'borrowed_time', value: 2 },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'haste',
                            countAmount: {
                                statusCount: { target: 'self', statusId: 'borrowed_time' },
                                offset: -1,
                            },
                        },
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'clash_power_up',
                            countAmount: {
                                statusCount: { target: 'self', statusId: 'borrowed_time' },
                                offset: -1,
                            },
                        },
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'fragile',
                            countAmount: {
                                statusCount: { target: 'self', statusId: 'borrowed_time' },
                                offset: -1,
                            },
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtOrBelow', target: 'self', statusId: 'borrowed_time', value: 1 },
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'borrowed_time', value: 1 },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'bind',
                            countAmount: {
                                statusPotency: { target: 'self', statusId: 'borrowed_time' },
                                multiplier: 2,
                                offset: -2,
                            },
                        },
                    ],
                },
                {
                    actions: [
                        {
                            type: 'adjustStatus',
                            target: 'self',
                            statusId: 'borrowed_time',
                            potencyDelta: 1,
                            countDelta: -1,
                        },
                    ],
                },
            ],
        },
    });
})();
