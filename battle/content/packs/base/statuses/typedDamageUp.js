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

    function registerTypedDamageUp(id, label, conditionType, conditionValue) {
        registerStatusDefinition({
            id,
            label,
            description: `Deal 10% more matching damage per Count for one turn. Caps at 10 Count.`,
            countOnly: true,
            stackModel: createCountOnlyStackModel(),
            hooks: {
                skillSelected: [
                    {
                        conditions: [
                            { type: conditionType, value: conditionValue },
                        ],
                        actions: [
                            {
                                type: 'modifyContext',
                                target: 'self',
                                field: 'dynamicDamageBonus',
                                operation: 'addStatusCountScaled',
                                statusId: id,
                                statusSource: 'self',
                                multiplier: 0.1,
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

    registerTypedDamageUp('slash_dmg_up', 'Slash DMG Up', 'skillDamageType', 'slash');
    registerTypedDamageUp('pierce_dmg_up', 'Pierce DMG Up', 'skillDamageType', 'pierce');
    registerTypedDamageUp('blunt_dmg_up', 'Blunt DMG Up', 'skillDamageType', 'blunt');
    registerTypedDamageUp('wrath_dmg_up', 'Wrath DMG Up', 'skillSinType', 'wrath');
    registerTypedDamageUp('lust_dmg_up', 'Lust DMG Up', 'skillSinType', 'lust');
    registerTypedDamageUp('sloth_dmg_up', 'Sloth DMG Up', 'skillSinType', 'sloth');
    registerTypedDamageUp('gluttony_dmg_up', 'Gluttony DMG Up', 'skillSinType', 'gluttony');
    registerTypedDamageUp('gloom_dmg_up', 'Gloom DMG Up', 'skillSinType', 'gloom');
    registerTypedDamageUp('pride_dmg_up', 'Pride DMG Up', 'skillSinType', 'pride');
    registerTypedDamageUp('envy_dmg_up', 'Envy DMG Up', 'skillSinType', 'envy');
})();
