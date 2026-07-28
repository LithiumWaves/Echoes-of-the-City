(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    function registerSinFragility(id, label, sinType) {
        registerStatusDefinition({
            id,
            label,
            description: `Take 10% more ${label.replace(' Fragility', '')} damage per Count. Expires at turn end.`,
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {
                beforeDamage: [
                    {
                        conditions: [
                            { type: 'skillSinType', value: sinType },
                        ],
                        actions: [
                            {
                                type: 'modifyContext',
                                target: 'self',
                                field: 'damageReductionMultiplier',
                                operation: 'addStatusCountScaled',
                                statusId: id,
                                statusSource: 'self',
                                multiplier: 0.1,
                                direction: 'add',
                            },
                        ],
                    },
                ],
                turnEnd: [
                    {
                        type: 'consumeStatus',
                        target: 'self',
                        statusId: id,
                    },
                ],
            },
        });
    }

    registerSinFragility('wrath_fragility', 'Wrath Fragility', 'wrath');
    registerSinFragility('lust_fragility', 'Lust Fragility', 'lust');
    registerSinFragility('sloth_fragility', 'Sloth Fragility', 'sloth');
    registerSinFragility('gluttony_fragility', 'Gluttony Fragility', 'gluttony');
    registerSinFragility('gloom_fragility', 'Gloom Fragility', 'gloom');
    registerSinFragility('pride_fragility', 'Pride Fragility', 'pride');
    registerSinFragility('envy_fragility', 'Envy Fragility', 'envy');
})();
