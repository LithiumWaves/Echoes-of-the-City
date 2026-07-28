global.window = {};

require('../validation/battleValidation.js');
require('../registry/battleRegistry.js');
require('../schema/battleSchema.js');
require('../effects/skillEffectRunner.js');
require('../core/damageFormula.js');
require('../core/battleEngine.js');

require('../content/packs/base/statuses/missingStatusesBatch3Survival.js');
require('../content/packs/base/statuses/missingStatusesBatch4Dawn.js');

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
        staggerThresholds: [],
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

function createBattleDefinition(playerSkill) {
    return {
        id: 'dawn-status-smoke',
        name: 'Dawn Status Smoke',
        playerUnits: [createUnit('ally', 'Ally', [playerSkill])],
        enemyUnits: [createUnit('enemy', 'Enemy', [guardSkill])],
        rules: {
            encounterType: 'focused',
            maxTurns: 3,
            victoryCondition: 'defeat-all-enemies',
            failureCondition: 'all-allies-defeated',
            enemyAiProfile: { skill: 'first', target: 'firstLiving' },
        },
    };
}

function createEngine(playerSkill) {
    return battleModules.createBattleEngine({
        battleDefinition: createBattleDefinition(playerSkill),
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

function runDamageCase(skill, status = null) {
    const engine = createEngine(skill);
    if (status) {
        engine.addStatus('player', status, 0);
    }
    const enemyBefore = getEnemy(engine).hp;
    resolvePlayerTurn(engine, skill.id);
    const enemyAfter = getEnemy(engine).hp;
    return {
        dealt: enemyBefore - enemyAfter,
        player: getPlayer(engine),
        enemy: getEnemy(engine),
        engine,
    };
}

const highNoonSkill = {
    id: 'sunset-blade',
    name: 'Sunset Blade',
    skillType: 'attack',
    basePower: 6,
    coinPower: 2,
    coinCount: 3,
    damageType: 'slash',
    sinType: 'wrath',
    tags: ['base'],
    effects: [],
};

const dawnheraldSkill = {
    id: 'ember-cut',
    name: 'Ember Cut',
    skillType: 'attack',
    basePower: 6,
    coinPower: 2,
    coinCount: 2,
    damageType: 'slash',
    sinType: 'wrath',
    tags: ['base', 'burn'],
    effects: [],
};

const highNoonBaseline = runDamageCase(highNoonSkill);
const highNoonBuffed = runDamageCase(highNoonSkill, { id: 'high_noon', count: 1 });

const highNoonSpeedEngine = createEngine(highNoonSkill);
highNoonSpeedEngine.addStatus('player', { id: 'high_noon', count: 1 }, 0);
resolvePlayerTurn(highNoonSpeedEngine, highNoonSkill.id);
highNoonSpeedEngine.advanceTurn();
const highNoonSpeedTurn2 = getPlayer(highNoonSpeedEngine).speed;

const dawnOfficeEngine = createEngine(highNoonSkill);
dawnOfficeEngine.addStatus('player', { id: 'dawn_office', count: 3 }, 0);
resolvePlayerTurn(dawnOfficeEngine, highNoonSkill.id);
dawnOfficeEngine.advanceTurn();
const dawnOfficePlayer = getPlayer(dawnOfficeEngine);

const dawnheraldBaseline = runDamageCase(dawnheraldSkill);
const dawnheraldBuffed = runDamageCase(dawnheraldSkill, { id: 'dawnherald', count: 2 });

const blazingSunsetEngine = createEngine(highNoonSkill);
getPlayer(blazingSunsetEngine).hp = 30;
getPlayer(blazingSunsetEngine).sp = -20;
blazingSunsetEngine.addStatus('player', { id: 'blazing_sunset', count: 1 }, 0);
resolvePlayerTurn(blazingSunsetEngine, highNoonSkill.id);
blazingSunsetEngine.advanceTurn();
const blazingSunsetPlayer = getPlayer(blazingSunsetEngine);

console.log(JSON.stringify({
    highNoon: {
        baselineDamage: highNoonBaseline.dealt,
        buffedDamage: highNoonBuffed.dealt,
        turn2Speed: highNoonSpeedTurn2,
    },
    dawnOffice: {
        spAtTurnStart: dawnOfficePlayer.sp,
        offenseLevelModifier: dawnOfficePlayer.turnState?.offenseLevelModifier || 0,
    },
    dawnherald: {
        baselineDamage: dawnheraldBaseline.dealt,
        buffedDamage: dawnheraldBuffed.dealt,
    },
    blazingSunset: {
        hpAfterBurst: blazingSunsetPlayer.hp,
        spAfterBurst: blazingSunsetPlayer.sp,
    },
}, null, 2));
