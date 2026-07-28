(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'savage_tigermark_round',
        label: 'Savage Tigermark Round',
        description: 'Unique Ammo with max capacity 8. Tracks the same cumulative spent-round total as Tigermark Round for Tiantui-style passives.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Savage_Tigermark_Round.png',
        ammoProfile: {
            unique: true,
            maxCapacity: 8,
            spentBySkill: true,
            cumulativeSpentResourceId: 'tigermark_rounds_spent',
            behavesLike: 'tigermark_round',
        },
        stackModel: {
            count: { enabled: true, min: 0, max: 8, application: 'add' },
            expireWhen: { countLte: 0 },
        },
    });
})();
