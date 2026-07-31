(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerBattleDefinition = battleModules.content?.registerBattleDefinition;

    if (typeof registerBattleDefinition !== 'function') {
        throw new Error('Battle content registry is not available.');
    }

    const cityGateSkirmishDefinition = {
        id: 'city-gate-skirmish',
        name: 'City Gate Skirmish',
        description: 'A straightforward live encounter built for the general battle launcher: face Callisto at the gate.',
        drive: {
            chapterId: 'echoes-district',
            chapterLabel: 'Echoes District',
            chapterOrder: 0,
            encounterLabel: 'Gate Skirmish',
            encounterOrder: 0,
            accentColor: '#c73e3e',
        },
        enemyUnitIds: [
            'ring-nursefather-hong-lu',
        ],
        rules: {
            encounterType: 'focused',
            maxTurns: 60,
            victoryCondition: 'defeat-all-enemies',
            failureCondition: 'all-allies-defeated',
            enemyAiProfile: {
                skill: 'cycle',
                target: 'mirror',
            },
        },
    };

    registerBattleDefinition(cityGateSkirmishDefinition, {
        aliases: ['cityGateSkirmish'],
        setAsDefault: true,
    });
})();
