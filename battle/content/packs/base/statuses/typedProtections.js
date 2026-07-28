(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    function createCountOnlyStackModel() {
        return {
            count: { enabled: true, min: 0, max: 10, application: 'add' },
            expireWhen: { countLte: 0 },
        };
    }

    function registerTypedProtection(id, label, conditionType, conditionValue) {
        registerStatusDefinition({
            id,
            label,
            description: `Take 10% less matching damage per Count for one turn. Caps at 10 Count.`,
            countOnly: true,
            stackModel: createCountOnlyStackModel(),
            hooks: {
                beforeDamage: [
                    {
                        conditions: [
                            { type: conditionType, value: conditionValue },
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
                                direction: 'subtract',
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

    registerTypedProtection('slash_protection', 'Slash Protection', 'skillDamageType', 'slash');
    registerTypedProtection('pierce_protection', 'Pierce Protection', 'skillDamageType', 'pierce');
    registerTypedProtection('blunt_protection', 'Blunt Protection', 'skillDamageType', 'blunt');
    registerTypedProtection('wrath_protection', 'Wrath Protection', 'skillSinType', 'wrath');
    registerTypedProtection('lust_protection', 'Lust Protection', 'skillSinType', 'lust');
    registerTypedProtection('sloth_protection', 'Sloth Protection', 'skillSinType', 'sloth');
    registerTypedProtection('gluttony_protection', 'Gluttony Protection', 'skillSinType', 'gluttony');
    registerTypedProtection('gloom_protection', 'Gloom Protection', 'skillSinType', 'gloom');
    registerTypedProtection('pride_protection', 'Pride Protection', 'skillSinType', 'pride');
    registerTypedProtection('envy_protection', 'Envy Protection', 'skillSinType', 'envy');
})();
