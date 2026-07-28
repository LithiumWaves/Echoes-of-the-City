(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    registerStatusDefinition({
        id: 'the_living_and_the_departed',
        label: 'The Living & The Departed',
        description: 'Unique Ammo resource. Potency is The Living, Count is The Departed, their sum is capped at 20, and certain skills randomly consume one side or the other.',
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-The_Living_&_The_Departed.png',
        ammoProfile: {
            unique: true,
            maxCapacity: 20,
            spentBySkill: true,
            canCancelAttacksWhenEmpty: true,
            consumptionMode: 'random_potency_or_count',
            potencyLabel: 'The Living',
            countLabel: 'The Departed',
        },
        stackModel: {
            potency: { enabled: true, min: 0, max: 20, application: 'add' },
            count: { enabled: true, min: 0, max: 20, application: 'add' },
            combinedMax: 20,
            expireWhen: { potencyLte: 0, countLte: 0 },
        },
    });
})();
