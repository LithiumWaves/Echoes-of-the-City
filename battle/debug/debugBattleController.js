(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createDebugBattleController(options) {
        if (!window.EchoesOfTheCityBattle?.createBattleHandler) {
            throw new Error('Battle handler is not loaded.');
        }

        return window.EchoesOfTheCityBattle.createBattleHandler({
            ...options,
            battleDefinition: battleModules.battleDefinitions?.debugFight || battleModules.debugFightTemplate,
            enableDebugTools: true,
            storageKeyPrefix: 'echoes-of-the-city:debug-battle',
        });
    }

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        createDebugBattleController,
    };
})();
