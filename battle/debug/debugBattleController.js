(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createDebugBattleController(options) {
        if (!window.EchoesOfTheCityBattle?.createBattleHandler) {
            throw new Error('Battle handler is not loaded.');
        }
        if (typeof battleModules.createDebugRollManager !== 'function') {
            throw new Error('Debug roll manager is not loaded.');
        }
        const debugBattleDefinition = typeof battleModules.content?.getBattleDefinition === 'function'
            ? (
                battleModules.content.getBattleDefinition('debugFight')
                || battleModules.content.getBattleDefinition('debug-fight')
            )
            : (battleModules.battleDefinitions?.debugFight || battleModules.debugFightTemplate);
        if (!debugBattleDefinition) {
            throw new Error('Debug battle definition is not loaded.');
        }

        return window.EchoesOfTheCityBattle.createBattleHandler({
            ...options,
            battleDefinition: debugBattleDefinition,
            enableDebugTools: true,
            debugRollManager: battleModules.createDebugRollManager(),
            storageKeyPrefix: 'echoes-of-the-city:debug-battle',
        });
    }

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        createDebugBattleController,
    };
})();
