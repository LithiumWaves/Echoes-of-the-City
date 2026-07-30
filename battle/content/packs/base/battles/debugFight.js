(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerBattleDefinition = battleModules.content?.registerBattleDefinition;

    if (typeof registerBattleDefinition !== 'function') {
        throw new Error('Battle content registry is not available.');
    }

    const debugFightDefinition = {
        id: 'debug-fight',
        name: 'Echoes Debug Battle',
        description: 'Development encounter assembled from reusable unit definitions.',
        tags: ['debug'],
        enemyUnitIds: [
            'ring-nursefather-hong-lu',
            'dongbaek',
        ],
        rules: {
            encounterType: 'focused',
            maxTurns: 100,
            victoryCondition: 'defeat-all-enemies',
            failureCondition: 'all-allies-defeated',
        },
    };

    const registeredDefinition = registerBattleDefinition(debugFightDefinition, {
        aliases: ['debugFight'],
    });

    battleModules.debugFightTemplate = registeredDefinition;
})();
