(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerBattleDefinition = battleModules.content?.registerBattleDefinition;
    const getUnitDefinition = battleModules.content?.getUnitDefinition;

    if (typeof registerBattleDefinition !== 'function' || typeof getUnitDefinition !== 'function') {
        throw new Error('Battle content registry is not available.');
    }

    const playerUnits = [
        getUnitDefinition('vergilius'),
        getUnitDefinition('bamboo-hatted-kim'),
    ];
    const enemyUnits = [
        getUnitDefinition('ring-nursefather-hong-lu'),
        getUnitDefinition('dongbaek'),
    ];

    if (playerUnits.some((unit) => !unit) || enemyUnits.some((unit) => !unit)) {
        throw new Error('Debug fight requires all referenced unit definitions to load first.');
    }

    const debugFightDefinition = {
        id: 'debug-fight',
        name: 'Echoes Debug Battle',
        playerUnits,
        enemyUnits,
    };

    const registeredDefinition = registerBattleDefinition(debugFightDefinition, {
        aliases: ['debugFight'],
        setAsDefault: true,
    });

    battleModules.debugFightTemplate = registeredDefinition;
})();
