// Small original sample roster used by tests and the debug battle.
// (Real Limbus-accurate kits are authored in the creator / content packs.)

export const BLADE_FIXER = {
    id: 'bladeFixer',
    name: 'Blade Fixer',
    title: 'Grade 6 Fixer',
    level: 45,
    hp: { base: 72, perLevel: 2.4 },
    speed: [4, 7],
    defenseMod: 0,
    stagger: [0.6, 0.3],
    resist: { slash: 1, pierce: 1.5, blunt: 0.75 },
    skills: [
        { name: 'Quick Cut', sin: 'wrath', damageType: 'slash', basePower: 4, coinPower: 4, coins: [{}, {}], offenseMod: 0 },
        {
            name: 'Cross Slash', sin: 'lust', damageType: 'slash', basePower: 5, coinPower: 3, coins: [{}, { hooks: [{ on: 'headsHit', do: [{ apply: 'bleed', potency: 2, count: 1 }] }] }, {}],
        },
        {
            name: 'Finishing Draw', sin: 'wrath', damageType: 'slash', basePower: 6, coinPower: 4, coins: [{}, {}, { unbreakable: true }],
            hooks: [{ modify: 'clashPower', value: 2, if: { has: 'bleed', of: 'target', min: 3 } }],
        },
        { name: 'Parry Stance', kind: 'counter', sin: 'gloom', damageType: 'slash', basePower: 4, coinPower: 4, coins: [{}], clashable: true, defenseMod: 2 },
    ],
    passives: [
        { name: 'Momentum', hooks: [{ on: 'clashWin', do: [{ apply: 'poise', potency: 1, count: 1, to: 'self' }] }] },
    ],
};

export const SHIELD_FIXER = {
    id: 'shieldFixer',
    name: 'Shield Fixer',
    level: 45,
    hp: { base: 90, perLevel: 2.8 },
    speed: [2, 5],
    stagger: [0.5, 0.25],
    resist: { slash: 0.75, pierce: 1, blunt: 1.5 },
    skills: [
        { name: 'Bash', sin: 'sloth', damageType: 'blunt', basePower: 5, coinPower: 2, coins: [{}, {}] },
        { name: 'Tremor Strike', sin: 'gluttony', damageType: 'blunt', basePower: 4, coinPower: 3, coins: [{ hooks: [{ on: 'hit', do: [{ apply: 'tremor', potency: 3, count: 1 }] }] }, {}] },
        { name: 'Quake', sin: 'sloth', damageType: 'blunt', basePower: 6, coinPower: 2, coins: [{}, {}, { hooks: [{ on: 'hit', do: [{ tremorBurst: true }] }] }] },
        { name: 'Hold the Line', kind: 'guard', sin: 'sloth', basePower: 8, coinPower: 4, coins: [{}], defenseMod: 3 },
    ],
};

export const THUG = {
    id: 'thug',
    name: 'Back-Alley Thug',
    level: 40,
    maxHp: 140,
    speed: [2, 5],
    stagger: [0.5],
    resist: { slash: 1.5, pierce: 1, blunt: 1 },
    skills: [
        { name: 'Swing', sin: 'wrath', damageType: 'blunt', basePower: 4, coinPower: 3, coins: [{}, {}] },
        { name: 'Shank', sin: 'envy', damageType: 'pierce', basePower: 3, coinPower: 4, coins: [{}, {}], hooks: [{ on: 'use', do: [{ apply: 'bleed', potency: 1, count: 2 }] }] },
    ],
};

export const BOSS = {
    id: 'alleyBoss',
    name: 'Alley Boss',
    level: 48,
    maxHp: 420,
    slots: 2,
    speed: [3, 6],
    stagger: [0.7, 0.4, 0.15],
    resist: { slash: 1, pierce: 0.75, blunt: 1, wrath: 0.5 },
    skills: [
        { name: 'Heavy Swing', sin: 'wrath', damageType: 'blunt', basePower: 6, coinPower: 3, coins: [{}, {}] },
        { name: 'Ignite', sin: 'wrath', damageType: 'slash', basePower: 5, coinPower: 2, coins: [{}, {}, {}], hooks: [{ on: 'hit', do: [{ apply: 'burn', potency: 2, count: 1 }] }] },
        { name: 'Overwhelm', sin: 'pride', damageType: 'blunt', basePower: 8, coinPower: 4, coins: [{}, {}, { unbreakable: true }] },
    ],
    ai: { pattern: [['Heavy Swing', 'Ignite'], ['Ignite', 'Heavy Swing'], ['Overwhelm', 'Heavy Swing']] },
};
