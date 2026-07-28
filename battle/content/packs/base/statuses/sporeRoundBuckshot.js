(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'spore_round_buckshot',
        label: 'Spore Round [Buckshot]',
        description: 'Unique Ammo with max stack 6. Spent by certain skills; some attacks cancel if empty. When spent, inflict 3 Spore on hit.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Spore_Round_-Buckshot-.png',
        ammoProfile: {
            unique: true,
            maxCapacity: 6,
            spentBySkill: true,
            canCancelAttacksWhenEmpty: true,
            onSpendOnHit: {
                type: 'applyStatus',
                statusId: 'spore',
                count: 3,
            },
        },
        stackModel: {
            count: { enabled: true, min: 0, max: 6, application: 'add' },
            expireWhen: { countLte: 0 },
        },
    });
})();
