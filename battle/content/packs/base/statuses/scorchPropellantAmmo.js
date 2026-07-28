(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'scorch_propellant_ammo',
        label: 'Scorch Propellant Ammo',
        description: 'Unique Ammo resource that counts as Ammo for authored firearm skills.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Scorch_Propellant_Ammo.png',
        stackModel: {
            count: { enabled: true, min: 0, max: 15, application: 'add' },
            expireWhen: { countLte: 0 },
        },
    });
})();
