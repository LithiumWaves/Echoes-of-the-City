(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'bullet_solitude',
        label: 'Bullet - Solitude',
        description: 'Unique Ammo with max capacity 6. Spent by certain skills and should not be changed by external effects.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Bullet_-_Solitude.png',
        ammoProfile: {
            unique: true,
            maxCapacity: 6,
            externalMutable: false,
            spentBySkill: true,
        },
        stackModel: {
            count: { enabled: true, min: 0, max: 6, application: 'add' },
            expireWhen: { countLte: 0 },
        },
    });
})();
