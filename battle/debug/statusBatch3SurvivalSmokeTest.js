global.window = {};

require('../validation/battleValidation.js');
require('../registry/battleRegistry.js');
require('../schema/battleSchema.js');
require('../effects/skillEffectRunner.js');
require('../core/damageFormula.js');
require('../core/battleEngine.js');

require('../content/packs/base/statuses/protection.js');
require('../content/packs/base/statuses/damageDown.js');
require('../content/packs/base/statuses/aggro.js');
require('../content/packs/base/statuses/poise.js');
require('../content/packs/base/statuses/missingStatusesBatch2.js');
require('../content/packs/base/statuses/missingStatusesBatch3Survival.js');

const battleModules = window.EchoesOfTheCityBattleModules;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const createUnit = (id, name, side, skills) => ({
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
    id: 'status-batch3-survival-smoke',
    name: 'Status Batch 3 (Survival) Smoke',
    playerUnits: [
        createUnit('ally', 'Ally', 'player', [
            {
                id: 'poke',
                name: 'Poke',
                skillType: 'attack',
                basePower: 5,
                coinPower: 1,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                effects: [],
            },
        ]),
    ],
    enemyUnits: [
        createUnit('enemy', 'Enemy', 'enemy', [
            {
                id: 'smash',
                name: 'Smash',
                skillType: 'attack',
                basePower: 100,
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
        maxTurns: 3,
        victoryCondition: 'defeat-all-enemies',
        failureCondition: 'all-allies-defeated',
        enemyAiProfile: { skill: 'first', target: 'firstLiving' },
    },
};

const engine = battleModules.createBattleEngine({ battleDefinition, clamp });

engine.addStatus('player', { id: 'wild_hunt', count: 1 }, 0);

engine.selectSlot('player-slot-1');
engine.selectSkill('poke');
engine.selectTarget('enemy-slot-1');
engine.resolveTurn();

const afterTurn1 = engine.getState();
const allyAfterTurn1 = afterTurn1.playerUnits[0];
const doom = allyAfterTurn1.statuses.find((status) => status.id === 'wild_hunt_doom') || null;
const turn1Snapshot = {
    hp: allyAfterTurn1.hp,
    hasWildHunt: allyAfterTurn1.statuses.some((status) => status.id === 'wild_hunt'),
    doom: doom ? { count: doom.count, potency: doom.potency } : null,
};

engine.advanceTurn();
engine.selectSlot('player-slot-1');
engine.selectSkill('poke');
engine.selectTarget('enemy-slot-1');
engine.resolveTurn();

const afterTurn2 = engine.getState();
const allyAfterTurn2 = afterTurn2.playerUnits[0];
const turn2Snapshot = {
    hp: allyAfterTurn2.hp,
    alive: allyAfterTurn2.hp > 0,
};

console.log(JSON.stringify({
    turn1: turn1Snapshot,
    turn2: turn2Snapshot,
}, null, 2));
