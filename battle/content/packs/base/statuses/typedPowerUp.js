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

    function registerTypedPowerUp(id, label, conditionType, conditionValue) {
        registerStatusDefinition({
            id,
            label,
            description: `Gain matching skill Power equal to Count for one turn. Caps at 10 Count.`,
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
                                field: 'flatPowerBonus',
                                operation: 'add',
                                amount: {
                                    statusCount: {
                                        target: 'self',
                                        statusId: id,
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
                        statusId: id,
                    },
                ],
            },
        });
    }

    registerTypedPowerUp('slash_power_up', 'Slash Power Up', 'skillDamageType', 'slash');
    registerTypedPowerUp('pierce_power_up', 'Pierce Power Up', 'skillDamageType', 'pierce');
    registerTypedPowerUp('blunt_power_up', 'Blunt Power Up', 'skillDamageType', 'blunt');
    registerTypedPowerUp('wrath_power_up', 'Wrath Power Up', 'skillSinType', 'wrath');
    registerTypedPowerUp('lust_power_up', 'Lust Power Up', 'skillSinType', 'lust');
    registerTypedPowerUp('sloth_power_up', 'Sloth Power Up', 'skillSinType', 'sloth');
    registerTypedPowerUp('gluttony_power_up', 'Gluttony Power Up', 'skillSinType', 'gluttony');
    registerTypedPowerUp('gloom_power_up', 'Gloom Power Up', 'skillSinType', 'gloom');
    registerTypedPowerUp('pride_power_up', 'Pride Power Up', 'skillSinType', 'pride');
    registerTypedPowerUp('envy_power_up', 'Envy Power Up', 'skillSinType', 'envy');
})();
