(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createInspectState() {
        return {
            isOpen: false,
            unitId: null,
        };
    }

    battleModules.createInspectState = createInspectState;

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        createInspectState,
    };
})();

