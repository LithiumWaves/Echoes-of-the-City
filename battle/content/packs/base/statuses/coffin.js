(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'coffin',
        label: 'Coffin',
        description: 'At turn end, gain next-turn Damage Up, Speed, and Clash Power based on current count.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Coffin.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 10, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnEnd: [
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'coffin', value: 3 },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'damage_up',
                            count: 2,
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'coffin', value: 6 },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'damage_up',
                            count: 2,
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'coffin', value: 9 },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'damage_up',
                            count: 2,
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'coffin', value: 4 },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'haste',
                            count: 1,
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'coffin', value: 8 },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'haste',
                            count: 1,
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'coffin', value: 5 },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'clash_power_up',
                            count: 1,
                        },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', target: 'self', statusId: 'coffin', value: 10 },
                    ],
                    actions: [
                        {
                            type: 'queueStatus',
                            target: 'self',
                            statusId: 'clash_power_up',
                            count: 1,
                        },
                    ],
                },
                {
                    actions: [
                        {
                            type: 'consumeStatus',
                            target: 'self',
                            statusId: 'coffin',
                        },
                    ],
                },
            ],
        },
    });
})();
