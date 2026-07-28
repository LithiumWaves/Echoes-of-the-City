(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    const retaliationBlocks = [1, 2, 3].flatMap((coinIndex) => ([
        {
            id: `fairy-lure-rupture-${coinIndex}`,
            oncePer: 'coin',
            conditions: [
                { type: 'coinIndex', value: coinIndex },
                { type: 'statusCountAtOrBelow', target: 'opponent', statusId: 'rupture', value: 14 },
            ],
            actions: [
                {
                    type: 'applyStatus',
                    target: 'opponent',
                    statusId: 'rupture',
                    potency: 1,
                    count: 1,
                },
            ],
        },
        {
            id: `fairy-lure-bonus-rupture-${coinIndex}`,
            oncePer: 'coin',
            conditions: [
                { type: 'coinIndex', value: coinIndex },
                { type: 'hpPercentAtOrBelow', target: 'self', value: 50 },
                { type: 'statusCountAtOrBelow', target: 'opponent', statusId: 'rupture', value: 13 },
            ],
            actions: [
                {
                    type: 'applyStatus',
                    target: 'opponent',
                    statusId: 'rupture',
                    potency: 1,
                    count: 1,
                },
            ],
        },
    ]));

    registerStatusDefinition({
        id: 'fairy_lure',
        label: 'Fairy Lure',
        description: 'Gain 10 Aggro at turn start, take 50% more damage, and retaliate with Rupture on the first three hits of an enemy skill. At 50% HP or below, retaliate with 1 additional Rupture. Reduced by 1 at turn end.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Fairy_Lure.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 5, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnStart: [
                {
                    type: 'applyStatus',
                    target: 'self',
                    statusId: 'aggro',
                    count: 10,
                },
            ],
            beforeDamage: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'damageReductionMultiplier',
                    operation: 'set',
                    value: 1.5,
                },
            ],
            hitTaken: retaliationBlocks,
            turnEnd: [
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'fairy_lure',
                    countDelta: -1,
                },
            ],
        },
    });
})();
