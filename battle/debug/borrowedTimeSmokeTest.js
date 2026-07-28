global.window = {};

require('../validation/battleValidation.js');
require('../registry/battleRegistry.js');
require('../schema/battleSchema.js');
require('../effects/skillEffectRunner.js');
require('../core/damageFormula.js');
require('../core/battleEngine.js');

require('../content/packs/base/statuses/bind.js');
require('../content/packs/base/statuses/haste.js');
require('../content/packs/base/statuses/fragile.js');
require('../content/packs/base/statuses/clashPowerUp.js');
require('../content/packs/base/statuses/borrowedTime.js');

const battleModules = window.EchoesOfTheCityBattleModules;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function createUnit(id, name, skills) {
    return {
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
    };
}

const attackSkill = {
    id: 'poke',
    name: 'Poke',
    skillType: 'attack',
    basePower: 3,
    coinPower: 1,
    coinCount: 1,
    damageType: 'slash',
    sinType: 'wrath',
    effects: [],
};

const battleDefinition = {
    id: 'borrowed-time-smoke',
    name: 'Borrowed Time Smoke',
    playerUnits: [createUnit('ally', 'Ally', [attackSkill])],
    enemyUnits: [createUnit('enemy', 'Enemy', [attackSkill])],
    rules: {
        encounterType: 'focused',
        maxTurns: 3,
        victoryCondition: 'defeat-all-enemies',
        failureCondition: 'all-allies-defeated',
        enemyAiProfile: { skill: 'first', target: 'firstLiving' },
    },
};

const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
engine.addStatus('player', { id: 'borrowed_time', potency: 3, count: 2 }, 0);

engine.selectSlot('player-slot-1');
engine.selectSkill('poke');
engine.selectTarget('enemy-slot-1');
engine.resolveTurn();

const afterTurn1 = engine.getState().playerUnits[0];
const borrowedAfterTurn1 = afterTurn1.statuses.find((status) => status.id === 'borrowed_time') || null;
const borrowedAfterTurn1Snapshot = borrowedAfterTurn1 ? { potency: borrowedAfterTurn1.potency, count: borrowedAfterTurn1.count } : null;

engine.advanceTurn();
const atTurn2Start = engine.getState().playerUnits[0];
const hasteAtTurn2Start = atTurn2Start.statuses.find((status) => status.id === 'haste') || null;
const bindAtTurn2Start = atTurn2Start.statuses.find((status) => status.id === 'bind') || null;
const turn2StartSnapshot = {
    haste: hasteAtTurn2Start ? { count: hasteAtTurn2Start.count } : null,
    bind: bindAtTurn2Start ? { count: bindAtTurn2Start.count } : null,
    staggered: (atTurn2Start.staggerTurnsRemaining || 0) > 0 || (atTurn2Start.staggerLevel || 0) > 0,
};

engine.selectSlot('player-slot-1');
engine.selectSkill('poke');
engine.selectTarget('enemy-slot-1');
engine.resolveTurn();

const afterTurn2 = engine.getState().playerUnits[0];
const borrowedAfterTurn2 = afterTurn2.statuses.find((status) => status.id === 'borrowed_time') || null;
const borrowedAfterTurn2Snapshot = borrowedAfterTurn2 ? { potency: borrowedAfterTurn2.potency, count: borrowedAfterTurn2.count } : null;

engine.advanceTurn();
const atTurn3Start = engine.getState().playerUnits[0];
const bindAtTurn3Start = atTurn3Start.statuses.find((status) => status.id === 'bind') || null;
const turn3StartSnapshot = {
    bind: bindAtTurn3Start ? { count: bindAtTurn3Start.count } : null,
    hasBorrowedTime: atTurn3Start.statuses.some((status) => status.id === 'borrowed_time'),
    staggered: (atTurn3Start.staggerTurnsRemaining || 0) > 0 || (atTurn3Start.staggerLevel || 0) > 0,
};

console.log(JSON.stringify({
    borrowedAfterTurn1: borrowedAfterTurn1Snapshot,
    turn2Start: turn2StartSnapshot,
    borrowedAfterTurn2: borrowedAfterTurn2Snapshot,
    turn3Start: turn3StartSnapshot,
}, null, 2));
