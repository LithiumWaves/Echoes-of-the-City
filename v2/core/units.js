// Turns a unit definition (content data) into battle runtime state.
import { SINS, DAMAGE_TYPES } from './constants.js';

let uidCounter = 0;

function normalizeSkill(def, unitId, index) {
    const kind = def.kind || 'attack';
    const coins = (def.coins ?? [{}]).map((coin, i) => (
        typeof coin === 'object' ? { ...coin, index: i } : { index: i }
    ));
    return {
        id: def.id || `${unitId}.skill${index + 1}`,
        name: def.name || `Skill ${index + 1}`,
        kind,
        sin: def.sin || null,
        damageType: kind === 'attack' || kind === 'counter' ? def.damageType || 'slash' : def.damageType || null,
        basePower: def.basePower ?? 3,
        coinPower: def.coinPower ?? 3,
        coins,
        offenseMod: def.offenseMod ?? 0,
        defenseMod: def.defenseMod ?? 0,
        clashable: def.clashable ?? kind === 'attack',
        targets: def.targets ?? 1, // attack weight
        hooks: def.hooks || [],
        description: def.description || '',
        art: def.art || null,
        rank: def.rank ?? index + 1,
        sanityCost: def.sanityCost ?? 0,
        egoCost: def.egoCost || null, // { wrath: 2, ... } for E.G.O skills
        indiscriminate: Boolean(def.indiscriminate),
    };
}

export function createUnit(def, side, statusDefs, { level, deployIndex = 0 } = {}) {
    const lvl = level ?? def.level ?? 45;
    const maxHp = def.maxHp ?? Math.round((def.hp?.base ?? 100) + (def.hp?.perLevel ?? 0) * lvl);
    const resist = { ...Object.fromEntries([...DAMAGE_TYPES, ...SINS].map((k) => [k, 1])), ...(def.resist || {}) };
    const skills = (def.skills || []).map((s, i) => normalizeSkill(s, def.id, i));
    const attackSkills = skills.filter((s) => s.kind === 'attack' && !s.egoCost);
    const unit = {
        uid: `${side}-${def.id}-${uidCounter++}`,
        defId: def.id,
        name: def.name || def.id,
        title: def.title || '',
        side,
        deployIndex,
        level: lvl,
        maxHp,
        hp: maxHp,
        shield: 0,
        speedRange: def.speed || [3, 6],
        defenseMod: def.defenseMod ?? 0,
        resist,
        staggerThresholds: (def.stagger ?? [0.5]).map((v) => ({ hp: v <= 1 ? Math.round(maxHp * v) : v, broken: false })),
        staggerLevel: 0,
        staggerUntilTurn: -1,
        hasSanity: def.sanity ?? side === 'ally',
        sp: def.startSanity ?? 0,
        panicked: false,
        slotCount: def.slots ?? 1,
        skills,
        attackSkills,
        defenseSkills: skills.filter((s) => s.kind !== 'attack' && !s.egoCost),
        egoSkills: skills.filter((s) => s.egoCost),
        passives: (def.passives || []).map((p, i) => ({ id: p.id || `${def.id}.passive${i + 1}`, ...p, hooks: p.hooks || [] })),
        statuses: new Map(),
        pendingStatuses: [],
        deck: [],
        alive: true,
        art: def.art || {},
        def,
    };
    for (const init of def.startStatuses || []) {
        const sdef = statusDefs[init.id];
        if (sdef) unit.pendingStatuses.push({ id: init.id, potency: init.potency ?? 0, count: init.count ?? 0, immediate: true });
    }
    return unit;
}
