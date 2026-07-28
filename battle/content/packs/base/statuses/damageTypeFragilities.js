(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    function registerDamageTypeFragility(id, label, damageType) {
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
                            { type: 'skillDamageType', value: damageType },
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

    registerDamageTypeFragility('slash_fragility', 'Slash Fragility', 'slash');
    registerDamageTypeFragility('pierce_fragility', 'Pierce Fragility', 'pierce');
    registerDamageTypeFragility('blunt_fragility', 'Blunt Fragility', 'blunt');
})();
