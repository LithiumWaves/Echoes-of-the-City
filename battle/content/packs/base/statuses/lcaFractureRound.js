(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'lca_fracture_round',
        label: 'LCA Fracture Round',
        description: 'Unique Ammo with max capacity 16. Spent by certain skills, and some attacks cancel if the unit lacks ammo.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-LCA_Fracture_Round.png',
        ammoProfile: {
            unique: true,
            maxCapacity: 16,
            spentBySkill: true,
            canCancelAttacksWhenEmpty: true,
        },
        stackModel: {
            count: { enabled: true, min: 0, max: 16, application: 'add' },
            expireWhen: { countLte: 0 },
        },
    });
})();
