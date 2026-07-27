(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerUnitDefinition = battleModules.content?.registerUnitDefinition;

    if (typeof registerUnitDefinition !== 'function') {
        throw new Error('Battle content registry is not available.');
    }

    const ringNursefatherCallistoDefinition = {
        id: 'ring-nursefather-hong-lu',
        name: 'The Ring Nursefather Callisto',
        level: 50,
        maxHp: 428,
        sp: 0,
        speedRange: [3, 7],
        defenseLevel: 50,
        staggerThresholds: [0.75, 0.5, 0.25],
        resistances: {
            physical: {
                slash: 0.8,
                pierce: 1,
                blunt: 1.2,
            },
            sin: {
                wrath: 1,
                lust: 0.8,
                sloth: 1.2,
                gluttony: 1.2,
                gloom: 0.8,
                pride: 1,
                envy: 1,
            },
        },
        passives: [
            {
                id: 'emergency-procedure',
                name: 'Emergency Procedure',
                description: 'At turn start, if below 50% HP, gain +2 Speed once per turn.',
                hooks: {
                    turnStart: [
                        {
                            id: 'emergency-procedure-haste',
                            oncePer: 'turn',
                            conditions: [
                                { type: 'hpPercentAtOrBelow', target: 'self', value: 0.5 },
                            ],
                            actions: [
                                { type: 'modifySpeed', target: 'self', value: 2 },
                            ],
                        },
                    ],
                },
            },
        ],
        sprites: {
            idle: 'assets/debugsprites/The_Ring_Nursefather_-_Callisto_Idle_Sprite.png',
            moving: 'assets/debugsprites/The_Ring_Nursefather_-_Callisto_Moving_Sprite.png',
            hurt: 'assets/debugsprites/The_Ring_Nursefather_-_Callisto_Hurt_Sprite.png',
            skills: {
                anatomize: 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Skill_1.gif',
                'gather-ingredient-blood-bathed-objet': 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Skill_2.gif',
                'tibias-melody': 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Skill_3.gif',
                'stinging-memories': 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Skill_1.gif',
                'aching-heart': 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Skill_2.gif',
                'sink-it-all': 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Skill_3.gif',
            },
        },
        skills: [
            {
                id: 'anatomize',
                name: 'Anatomize',
                basePower: 6,
                coinPower: 6,
                coinCount: 2,
                damageType: 'slash',
                sinType: 'envy',
                offenseLevel: 0,
                borderPath: 'assets/skillborders/Envy1.png',
                description: 'Hong Lu Skill 1. Two heavy-value slash coins.',
            },
            {
                id: 'gather-ingredient-blood-bathed-objet',
                name: 'Gather Ingredient Blood-bathed Objet',
                basePower: 7,
                coinPower: 7,
                coinCount: 2,
                damageType: 'slash',
                sinType: 'envy',
                offenseLevel: 1,
                borderPath: 'assets/skillborders/Envy2.png',
                description: 'Hong Lu Skill 2. High-variance two-coin clash.',
            },
            {
                id: 'tibias-melody',
                name: "Tibia's Melody Anatomization of the Unatomized by the Anatomized",
                basePower: 10,
                coinPower: 4,
                coinCount: 4,
                damageType: 'slash',
                sinType: 'envy',
                offenseLevel: 2,
                borderPath: 'assets/skillborders/Envy3.png',
                description: 'Hong Lu Skill 3. Long clash route for the second enemy slot.',
            },
        ],
    };

    registerUnitDefinition(ringNursefatherCallistoDefinition, {
        aliases: ['hong-lu-callisto'],
    });
})();
