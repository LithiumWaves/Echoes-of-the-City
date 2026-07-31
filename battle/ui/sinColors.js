(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const SIN_TYPES = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];

    const SIN_COLORS = {
        wrath: '#c73e3e',
        lust: '#e07b39',
        sloth: '#d4b84a',
        gluttony: '#5cb85c',
        gloom: '#6eb8e8',
        pride: '#1e3a6e',
        envy: '#9b59b6',
    };

    const sinColorsApi = {
        SIN_TYPES,
        SIN_COLORS,
    };

    battleModules.sinColors = sinColorsApi;
    window.EchoesOfTheCitySinColors = sinColorsApi;
})();
