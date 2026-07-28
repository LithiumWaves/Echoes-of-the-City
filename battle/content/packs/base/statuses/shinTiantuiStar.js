(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'shin_tiantui_star',
        label: 'Shin (心) - Tiantui Star [天退星]',
        description: 'Min & Max Speed +3. If this unit is 3+ Speed faster than the target, deal +(Speed difference x 5)% damage, up to 40%. Tremor inflicted by this unit\'s skills gains +2 Potency and +2 Count.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Unrelenting_Spirit_-_Shin_-剛氣-心-.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 1, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnStart: [
                {
                    type: 'modifySpeed',
                    target: 'self',
                    value: 3,
                },
            ],
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: 'attack' },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'damageMultiplier',
                            operation: 'addSpeedDifferenceScaled',
                            multiplier: 0.05,
                            minDifference: 3,
                            cap: 0.4,
                        },
                    ],
                },
            ],
            statusInflicted: [
                {
                    oncePer: 'coin',
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'tremor' },
                    ],
                    actions: [
                        {
                            type: 'applyStatus',
                            target: 'opponent',
                            statusId: 'tremor',
                            potency: 2,
                            count: 2,
                        },
                    ],
                },
            ],
        },
    });
})();
