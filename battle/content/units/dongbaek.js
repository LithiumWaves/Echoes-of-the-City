(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerUnitDefinition = battleModules.content?.registerUnitDefinition;

    if (typeof registerUnitDefinition !== 'function') {
        throw new Error('Battle content registry is not available.');
    }

    const dongbaekDefinition = {
        id: 'dongbaek',
        name: 'Dongbaek',
        level: 50,
        maxHp: 402,
        sp: 0,
        speedRange: [3, 7],
        defenseLevel: 49,
        staggerThresholds: [0.75, 0.5, 0.25],
        resistances: {
            physical: {
                slash: 1,
                pierce: 1,
                blunt: 1.5,
            },
            sin: {
                wrath: 0.5,
                lust: 0.5,
                sloth: 1,
                gluttony: 1,
                gloom: 2,
                pride: 1.5,
                envy: 1,
            },
        },
        sprites: {
            idle: 'assets/debugsprites/Lobotomy_E.G.O_Sunshower_-_Dongbaek_Idle_Sprite.png',
            moving: 'assets/debugsprites/Lobotomy_E.G.O_Sunshower_-_Dongbaek_Moving_Sprite.png',
            hurt: 'assets/debugsprites/Lobotomy_E.G.O_Sunshower_-_Dongbaek_Hurt_Sprite.png',
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
                id: 'stinging-memories',
                name: 'Stinging Memories',
                basePower: 3,
                coinPower: 3,
                coinCount: 3,
                damageType: 'slash',
                sinType: 'gloom',
                offenseLevel: 0,
                effects: [
                    { trigger: 'onClashWin', type: 'adjustSanity', target: 'self', value: 8, reason: 'clash win' },
                    { trigger: 'onClashLose', type: 'adjustSanity', target: 'self', value: -5, reason: 'clash loss' },
                    { trigger: 'onHit', type: 'applyStatus', statusId: 'sinking', potency: 2, count: 1 },
                    { trigger: 'onHit', type: 'applyStatus', statusId: 'rupture', potency: 2, count: 1 },
                ],
                borderPath: 'assets/skillborders/Gloom1.png',
                description: 'Skill 1. Positive-coin sinker that inflicts Sinking and Rupture on every coin.',
            },
            {
                id: 'aching-heart',
                name: 'Aching Heart',
                basePower: 13,
                coinPower: -4,
                coinCount: 2,
                damageType: 'slash',
                sinType: 'gloom',
                offenseLevel: 1,
                effects: [
                    { trigger: 'onHit', type: 'applyStatus', statusId: 'rupture', potency: 3, count: 1, coinIndex: 1 },
                    { trigger: 'onHit', type: 'applyStatus', statusId: 'rupture', potency: 0, count: 3, coinIndex: 2 },
                ],
                borderPath: 'assets/skillborders/Gloom2.png',
                description: 'Skill 2. Minus-coin slash that stacks Rupture on hit.',
            },
            {
                id: 'sink-it-all',
                name: 'Sink It All',
                basePower: 26,
                coinPower: -10,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'gloom',
                offenseLevel: 2,
                effects: [
                    { trigger: 'onSelect', type: 'adjustSanity', target: 'self', value: -30, reason: 'Sink It All' },
                    { trigger: 'onSelect', type: 'applyStatus', target: 'self', statusId: 'sinking', potency: 5, count: 5 },
                    { trigger: 'onHit', type: 'adjustSanity', value: -15, reason: 'Sink It All' },
                    { trigger: 'onHit', type: 'applyStatus', statusId: 'sinking', potency: 8, count: 1 },
                ],
                borderPath: 'assets/skillborders/Gloom3.png',
                description: 'Skill 3. Self-Sinking opener with a heavy SP hit and Sinking application.',
            },
        ],
    };

    registerUnitDefinition(dongbaekDefinition);
})();
