(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerUnitDefinition = battleModules.content?.registerUnitDefinition;

    if (typeof registerUnitDefinition !== 'function') {
        throw new Error('Battle content registry is not available.');
    }

    const vergiliusDefinition = {
        id: 'vergilius',
        name: 'Vergilius',
        level: 50,
        maxHp: 392,
        sp: 0,
        speedRange: [4, 8],
        defenseLevel: 50,
        staggerThresholds: [0.66, 0.33],
        resistances: {
            physical: {
                slash: 1,
                pierce: 1,
                blunt: 1,
            },
            sin: {
                wrath: 1,
                lust: 1,
                sloth: 1,
                gluttony: 1,
                gloom: 1,
                pride: 1,
                envy: 1,
            },
        },
        sprites: {
            idle: 'assets/debugsprites/Vergilius_Idle_Sprite.png',
            moving: 'assets/debugsprites/Vergilius_Moving_Sprite.png',
            hurt: 'assets/debugsprites/Vergilius_Hurt_Sprite.png',
            guard: 'assets/debugsprites/Vergilius_Guard_Sprite.png',
            evade: 'assets/debugsprites/Vergilius_Evade_Sprite.png',
            skills: {
                'heated-puncture': 'assets/debugsprites/Vergilius_Skill_1.gif',
                'scorching-incision': 'assets/debugsprites/Vergilius_Skill_2.gif',
                'following-the-flow': 'assets/debugsprites/Vergilius_Skill_3.gif',
                'draw-of-the-sword': 'assets/debugsprites/Vergilius_Skill_1.gif',
                acupuncture: 'assets/debugsprites/Vergilius_Skill_2.gif',
                'yield-my-flesh': 'assets/debugsprites/Vergilius_Skill_3.gif',
                'to-claim-their-bones': 'assets/debugsprites/Vergilius_Skill_3.gif',
            },
        },
        skills: [
            {
                id: 'heated-puncture',
                name: 'Heated Puncture',
                basePower: 14,
                coinPower: 2,
                coinCount: 3,
                damageType: 'slash',
                sinType: 'wrath',
                offenseLevel: 0,
                effects: [
                    { trigger: 'onHit', type: 'applyStatus', statusId: 'burn', potency: 3, count: 1 },
                ],
                borderPath: 'assets/skillborders/Wrath1.png',
                description: 'Vergilius Skill 1. Inflicts Burn on hit.',
            },
            {
                id: 'scorching-incision',
                name: 'Scorching Incision',
                basePower: 15,
                coinPower: 2,
                coinCount: 3,
                damageType: 'slash',
                sinType: 'wrath',
                offenseLevel: 1,
                effects: [
                    { trigger: 'onHit', type: 'applyStatus', statusId: 'burn', potency: 4, count: 1 },
                ],
                borderPath: 'assets/skillborders/Wrath2.png',
                description: 'Vergilius Skill 2. Stronger clash route with Burn.',
            },
            {
                id: 'following-the-flow',
                name: 'Following the Flow',
                basePower: 18,
                coinPower: 2,
                coinCount: 3,
                damageType: 'slash',
                sinType: 'wrath',
                offenseLevel: 2,
                effects: [
                    { trigger: 'onHit', type: 'applyStatus', statusId: 'burn', potency: 5, count: 2 },
                ],
                borderPath: 'assets/skillborders/Wrath3.png',
                description: 'Vergilius Skill 3. Highest base power among his starter kit.',
            },
            {
                id: 'vergilius-evade',
                name: 'Evade',
                skillType: 'evade',
                basePower: 14,
                coinPower: 8,
                coinCount: 1,
                sinType: 'wrath',
                offenseLevel: 0,
                borderPath: 'assets/skillborders/Wrath1.png',
                description: 'Defense Skill. Reactively dodges incoming coins while its final power holds.',
            },
        ],
    };

    registerUnitDefinition(vergiliusDefinition);
})();
