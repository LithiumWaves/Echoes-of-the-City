global.window = {};

require('../validation/battleValidation.js');
require('../registry/battleRegistry.js');
require('../schema/battleSchema.js');
require('../effects/skillEffectRunner.js');
require('../core/damageFormula.js');
require('../core/battleEngine.js');

require('../content/packs/base/statuses/poise.js');
require('../content/packs/base/statuses/missingStatusesBatch2.js');

const battleModules = window.EchoesOfTheCityBattleModules;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const createUnit = (id, name, skills) => ({
    id,
    name,
    level: 1,
    maxHp: 50,
    sp: 0,
    speedRange: [1, 1],
    resistances: {
        physical: { slash: 1, pierce: 1, blunt: 1 },
        sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
    },
    staggerThresholds: [],
    sprites: { skills: {} },
    skills,
    passives: [],
});

const battleDefinition = {
    id: 'status-batch2-smoke',
    name: 'Status Batch 2 Smoke',
    playerUnits: [
        createUnit('ally-1', 'Ally 1', [
            {
                id: 'buff-allies',
                name: 'Buff Allies',
                skillType: 'attack',
                basePower: 5,
                coinPower: 1,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                effects: [
                    { trigger: 'onSelect', type: 'applyStatus', target: 'allAllies', statusId: 'poise', potency: 1, count: 2 },
                ],
            },
        ]),
        createUnit('ally-2', 'Ally 2', [
            {
                id: 'poke',
                name: 'Poke',
                skillType: 'attack',
                basePower: 5,
                coinPower: 1,
                coinCount: 1,
                damageType: 'pierce',
                sinType: 'lust',
                effects: [],
            },
        ]),
    ],
    enemyUnits: [
        createUnit('enemy-1', 'Enemy 1', [
            {
                id: 'poke',
                name: 'Enemy Poke',
                skillType: 'attack',
                basePower: 3,
                coinPower: 1,
                coinCount: 1,
                damageType: 'blunt',
                sinType: 'sloth',
                effects: [],
            },
        ]),
    ],
    rules: {
        encounterType: 'focused',
        maxTurns: 1,
        victoryCondition: 'defeat-all-enemies',
        failureCondition: 'all-allies-defeated',
        enemyAiProfile: { skill: 'first', target: 'firstLiving' },
    },
};

const engine = battleModules.createBattleEngine({ battleDefinition, clamp });

engine.selectSlot('player-slot-1');
engine.selectSkill('buff-allies');
engine.selectTarget('enemy-slot-1');

engine.selectSlot('player-slot-2');
engine.selectSkill('poke');
engine.selectTarget('enemy-slot-1');

engine.resolveTurn();

const stateAfterResolve = engine.getState();
const ally1Poise = stateAfterResolve.playerUnits[0].statuses.find((status) => status.id === 'poise') || null;
const ally2Poise = stateAfterResolve.playerUnits[1].statuses.find((status) => status.id === 'poise') || null;

console.log(JSON.stringify({
    ally1Poise,
    ally2Poise,
}, null, 2));
