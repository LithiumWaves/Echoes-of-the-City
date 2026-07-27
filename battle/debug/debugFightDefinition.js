(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const getBattleDefinition = battleModules.content?.getBattleDefinition;
    const battleDefinitions = battleModules.battleDefinitions || (battleModules.battleDefinitions = {});

    const debugFightDefinition = typeof getBattleDefinition === 'function'
        ? (
            getBattleDefinition('debugFight')
            || getBattleDefinition('debug-fight')
        )
        : (battleDefinitions.debugFight || battleModules.debugFightTemplate || null);

    if (!debugFightDefinition) {
        throw new Error('Debug battle definition moved to battle/content/definitions/debugFight.js and must load first.');
    }

    battleDefinitions.debugFight = debugFightDefinition;
    battleDefinitions[debugFightDefinition.id] = debugFightDefinition;
    battleModules.debugFightTemplate = debugFightDefinition;
})();
