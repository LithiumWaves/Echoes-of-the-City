(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'spore_round_base',
        label: 'Spore Round [Base]',
        description: 'Unique Ammo with max stack 10. Spent by certain skills; some attacks cancel if empty. When spent, inflict 2 Spore on hit.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Spore_Round_-Base-.png',
        ammoProfile: {
            unique: true,
            maxCapacity: 10,
            spentBySkill: true,
            canCancelAttacksWhenEmpty: true,
            onSpendOnHit: {
                type: 'applyStatus',
                statusId: 'spore',
                count: 2,
            },
        },
        stackModel: {
            count: { enabled: true, min: 0, max: 10, application: 'add' },
            expireWhen: { countLte: 0 },
        },
    });
})();
