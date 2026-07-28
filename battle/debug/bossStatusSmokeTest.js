global.window = {};

require('../validation/battleValidation.js');
require('../registry/battleRegistry.js');
require('../schema/battleSchema.js');
require('../effects/skillEffectRunner.js');
require('../core/damageFormula.js');
require('../core/battleEngine.js');

require('../content/packs/base/statuses/bleed.js');
require('../content/packs/base/statuses/rupture.js');
require('../content/packs/base/statuses/nails.js');
require('../content/packs/base/statuses/haste.js');
require('../content/packs/base/statuses/offenseLevelUp.js');
require('../content/packs/base/statuses/missingStatusesBatch5Boss.js');

const battleModules = window.EchoesOfTheCityBattleModules;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function createUnit(id, name, skills) {
    return {
        id,
        name,
        level: 1,
        maxHp: 120,
        hp: 120,
        sp: 0,
        speedRange: [1, 1],
        resistances: {
            physical: { slash: 1, pierce: 1, blunt: 1 },
            sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
        },
        staggerThresholds: [0.5],
        sprites: { skills: {} },
        skills,
        passives: [],
    };
}

const guardSkill = {
    id: 'guard',
    name: 'Guard',
    skillType: 'guard',
    basePower: 1,
    coinPower: 0,
    coinCount: 1,
    sinType: 'sloth',
    effects: [],
};

const enemyAttackSkill = {
    id: 'enemy-poke',
    name: 'Enemy Poke',
    skillType: 'attack',
    basePower: 5,
    coinPower: 1,
    coinCount: 1,
    damageType: 'slash',
    sinType: 'wrath',
    effects: [],
};

function createBattleDefinition(playerSkill, enemySkill = guardSkill) {
    return {
        id: 'boss-status-smoke',
        name: 'Boss Status Smoke',
        playerUnits: [createUnit('ally', 'Ally', [playerSkill])],
        enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
        rules: {
            encounterType: 'focused',
            maxTurns: 3,
            victoryCondition: 'defeat-all-enemies',
            failureCondition: 'all-allies-defeated',
            enemyAiProfile: { skill: 'first', target: 'firstLiving' },
        },
    };
}

function createEngine(playerSkill, enemySkill = guardSkill) {
    return battleModules.createBattleEngine({
        battleDefinition: createBattleDefinition(playerSkill, enemySkill),
        clamp,
    });
}

function resolvePlayerTurn(engine, skillId) {
    engine.selectSlot('player-slot-1');
    engine.selectSkill(skillId);
    engine.selectTarget('enemy-slot-1');
    engine.resolveTurn();
}

function getPlayer(engine) {
    return engine.getState().playerUnits[0];
}

function getEnemy(engine) {
    return engine.getState().enemyUnits[0];
}

function getStatus(unit, statusId) {
    return unit.statuses.find((status) => status.id === statusId) || null;
}

function summarizeStatus(unit, statusId) {
    const status = getStatus(unit, statusId);
    return status
        ? { potency: status.potency || 0, count: status.count || 0 }
        : null;
}

function runDamageCase(skill, playerStatuses = [], enemyStatuses = []) {
    const engine = createEngine(skill);
    playerStatuses.forEach((status) => engine.addStatus('player', status, 0));
    enemyStatuses.forEach((status) => engine.addStatus('enemy', status, 0));
    const enemyBefore = getEnemy(engine).hp;
    resolvePlayerTurn(engine, skill.id);
    return {
        dealt: enemyBefore - getEnemy(engine).hp,
        player: getPlayer(engine),
        enemy: getEnemy(engine),
        engine,
    };
}

const bloodflameSkill = {
    id: 'scarlet-slash',
    name: 'Scarlet Slash',
    skillType: 'attack',
    basePower: 5,
    coinPower: 1,
    coinCount: 1,
    damageType: 'slash',
    sinType: 'wrath',
    tags: ['base'],
    effects: [
        { trigger: 'onHit', type: 'applyStatus', statusId: 'burn', potency: 1, count: 1 },
        { trigger: 'onHit', type: 'applyStatus', statusId: 'rupture', potency: 1, count: 1 },
    ],
};

const fanaticSkill = {
    id: 'ncorp-smite',
    name: 'N Corp Smite',
    skillType: 'attack',
    basePower: 6,
    coinPower: 2,
    coinCount: 2,
    damageType: 'blunt',
    sinType: 'wrath',
    effects: [],
};

const festiveSkill = {
    id: 'bloodfeast-step',
    name: 'Bloodfeast Step',
    skillType: 'attack',
    basePower: 10,
    coinPower: 3,
    coinCount: 3,
    damageType: 'pierce',
    sinType: 'lust',
    tags: ['bloodfeast'],
    effects: [],
};

const bloodflameCase = runDamageCase(bloodflameSkill, [{ id: 'bloodflame', count: 2 }]);

const fanaticBaseline = runDamageCase(fanaticSkill, [], [{ id: 'nails', count: 1 }]);
const fanaticBuffed = runDamageCase(fanaticSkill, [{ id: 'fanatic', count: 2 }], [{ id: 'nails', count: 1 }]);

const festiveBaseline = runDamageCase(festiveSkill, [], [{ id: 'bleed', potency: 1, count: 1 }]);
const festiveBuffed = runDamageCase(festiveSkill, [{ id: 'festive_fever', count: 10 }], [{ id: 'bleed', potency: 1, count: 1 }]);

const bloomingEngine = createEngine(guardSkill, enemyAttackSkill);
bloomingEngine.addStatus('player', { id: 'blooming_thorn', count: 10 }, 0);
const bloomingAfterApply = {
    stageOne: summarizeStatus(getPlayer(bloomingEngine), 'blooming_thorn'),
    stageTwo: summarizeStatus(getPlayer(bloomingEngine), 'blooming_thorn_ii'),
    stageThree: summarizeStatus(getPlayer(bloomingEngine), 'blooming_thorn_iii'),
};
resolvePlayerTurn(bloomingEngine, guardSkill.id);
const bloomingPlayer = getPlayer(bloomingEngine);
const bloomingEnemy = getEnemy(bloomingEngine);

console.log(JSON.stringify({
    bloodflame: {
        enemyBurn: summarizeStatus(bloodflameCase.enemy, 'burn'),
        enemyRupture: summarizeStatus(bloodflameCase.enemy, 'rupture'),
        playerBloodflame: summarizeStatus(bloodflameCase.player, 'bloodflame'),
    },
    fanatic: {
        baselineDamage: fanaticBaseline.dealt,
        buffedDamage: fanaticBuffed.dealt,
    },
    festiveFever: {
        baselineDamage: festiveBaseline.dealt,
        buffedDamage: festiveBuffed.dealt,
    },
    bloomingThorn: {
        afterApply: bloomingAfterApply,
        afterHit: {
            stageOne: summarizeStatus(bloomingPlayer, 'blooming_thorn'),
            stageTwo: summarizeStatus(bloomingPlayer, 'blooming_thorn_ii'),
            stageThree: summarizeStatus(bloomingPlayer, 'blooming_thorn_iii'),
            enemyBleed: summarizeStatus(bloomingEnemy, 'bleed'),
        },
    },
}, null, 2));
