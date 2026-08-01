(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'tremor_gnaw',
        label: 'Tremor - Gnaw',
        description: 'Amplitude-converted Tremor. Tremor Burst deals combined Tremor and Rupture potency and can raise stagger thresholds.',
        iconPath: 'assets/statuseffects/keywordstatus/Tremor.png',
        stackModel: {
            potency: { enabled: true, min: 0, max: 99, application: 'add' },
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { countLte: 0 },
        },
        burstMultiplierByStatusId: {
            rupture: 1,
        },
    });
})();
