(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'concussion',
        label: 'Concussion',
        description: 'Multiply Tremor burst threshold raise and Rupture damage dealt against this unit by 1.2. Lose 1 stack at turn end.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Concussion.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 2, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        hooks: {
            turnEnd: [
                {
                    type: 'adjustStatus',
                    target: 'self',
                    statusId: 'concussion',
                    countDelta: -1,
                },
            ],
        },
    });
})();
