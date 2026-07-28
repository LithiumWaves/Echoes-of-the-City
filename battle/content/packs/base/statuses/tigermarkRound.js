(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'tigermark_round',
        label: 'Tigermark Round',
        description: 'Unique Ammo with max capacity 12. Certain passives care about the cumulative Tigermark and Savage Tigermark Rounds spent by this unit.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Tigermark_Round.png',
        ammoProfile: {
            unique: true,
            maxCapacity: 12,
            spentBySkill: true,
            cumulativeSpentResourceId: 'tigermark_rounds_spent',
        },
        stackModel: {
            count: { enabled: true, min: 0, max: 12, application: 'add' },
            expireWhen: { countLte: 0 },
        },
    });
})();
