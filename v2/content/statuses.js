// Built-in status effects, written in the same data format users author.
// Wording follows limbuscompany.wiki.gg/wiki/Status_Effects.

const turnStack = (id, name, type, modify, value, extra = {}) => ({
    id, name, type, stack: 'count', duration: 'turn',
    description: extra.description || '',
    hooks: [{ modify, value, ...(extra.if ? { if: extra.if } : {}) }],
    ...extra.def,
});

const pct = (perStack, cap) => ({ min: [{ mul: [{ count: true }, perStack] }, cap] });
const isAttack = { skillKind: 'attack' };
const isDefense = { not: { skillKind: 'attack' } };

export const STATUSES = {
    burn: {
        id: 'burn', name: 'Burn', type: 'debuff', stack: 'potencyCount', keyword: true,
        description: 'At Turn End, take fixed damage equal to Potency, then reduce Count by 1.',
        hooks: [{ on: 'turnEnd', do: [{ damage: { potency: true }, to: 'self', kind: 'burn' }, { reduce: true, count: 1 }] }],
    },
    bleed: {
        id: 'bleed', name: 'Bleed', type: 'debuff', stack: 'potencyCount', keyword: true,
        description: 'After this unit uses a Skill Coin to attack, take fixed damage equal to Potency, then reduce Count by 1.',
        hooks: [{ on: 'coinToss', do: [{ damage: { potency: true }, to: 'self', kind: 'bleed' }, { reduce: true, count: 1 }] }],
    },
    tremor: {
        id: 'tremor', name: 'Tremor', type: 'debuff', stack: 'potencyCount', keyword: true,
        description: 'Tremor Burst: raise Stagger Threshold by Potency, then reduce Count by 1. At Turn End, reduce Count by 1.',
        hooks: [{ on: 'turnEnd', do: [{ reduce: true, count: 1 }] }],
    },
    rupture: {
        id: 'rupture', name: 'Rupture', type: 'debuff', stack: 'potencyCount', keyword: true,
        description: 'When hit, take fixed damage equal to Potency, then reduce Count by 1.',
        hooks: [{ on: 'hitTaken', do: [{ damage: { potency: true }, to: 'self', kind: 'rupture' }, { reduce: true, count: 1 }] }],
    },
    sinking: {
        id: 'sinking', name: 'Sinking', type: 'debuff', stack: 'potencyCount', keyword: true,
        description: 'When hit, lose SP equal to Potency (units without Sanity take Gloom damage instead), then reduce Count by 1.',
        hooks: [{
            on: 'hitTaken',
            do: [
                { sanity: { neg: { potency: true } }, to: 'self', reason: 'sinking' },
                { damage: { potency: true }, to: 'self', kind: 'sinking', if: { any: [{ eq: [{ stat: 'hasSanity' }, 0] }, { eq: [{ stat: 'sp' }, -45] }] } },
                { reduce: true, count: 1 },
            ],
        }],
    },
    poise: {
        id: 'poise', name: 'Poise', type: 'buff', stack: 'potencyCount', keyword: true,
        description: '+5% Critical Hit chance per Potency. Critical Hits deal +20% damage and reduce Count by 1.',
        hooks: [
            { modify: 'critChance', value: { mul: [{ potency: true }, 5] } },
            { on: 'crit', do: [{ reduce: true, count: 1 }] },
        ],
    },
    charge: {
        id: 'charge', name: 'Charge', type: 'buff', stack: 'count', max: 20, keyword: true,
        description: 'A resource spent by skills. Max 20.',
        hooks: [],
    },
    paralyze: {
        id: 'paralyze', name: 'Paralyze', type: 'debuff', stack: 'count', duration: 'turn',
        description: 'Fix the Power of the next X Coins to 0 this turn.',
        hooks: [{ on: 'coinFlip', if: { heads: true }, do: [{ nullifyCoin: true }, { reduce: true, count: 1 }] }],
    },
    haste: turnStack('haste', 'Haste', 'buff', 'speed', { count: true }, { description: '+1 Speed per stack this turn.' }),
    bind: turnStack('bind', 'Bind', 'debuff', 'speed', { neg: { count: true } }, { description: '-1 Speed per stack this turn.' }),
    fragile: turnStack('fragile', 'Fragile', 'debuff', 'takenDamagePct', pct(10, 100), { description: 'Take +10% damage per stack this turn (max 100%).' }),
    protection: turnStack('protection', 'Protection', 'buff', 'takenDamagePct', { neg: pct(10, 100) }, { description: 'Take -10% damage per stack this turn (max 100%).' }),
    damageUp: turnStack('damageUp', 'Damage Up', 'buff', 'damagePct', pct(10, 100), { description: 'Deal +10% damage per stack with skills this turn (max 100%).' }),
    damageDown: turnStack('damageDown', 'Damage Down', 'debuff', 'damagePct', { neg: pct(10, 100) }, { description: 'Deal -10% damage per stack with skills this turn (max 100%).' }),
    attackPowerUp: turnStack('attackPowerUp', 'Attack Power Up', 'buff', 'basePower', { count: true }, { if: isAttack, description: 'Base Power of Attack Skills +1 per stack this turn.' }),
    attackPowerDown: turnStack('attackPowerDown', 'Attack Power Down', 'debuff', 'basePower', { neg: { count: true } }, { if: isAttack, description: 'Base Power of Attack Skills -1 per stack this turn.' }),
    defensePowerUp: turnStack('defensePowerUp', 'Defense Power Up', 'buff', 'basePower', { count: true }, { if: isDefense, description: 'Base Power of Defense Skills +1 per stack this turn.' }),
    defensePowerDown: turnStack('defensePowerDown', 'Defense Power Down', 'debuff', 'basePower', { neg: { count: true } }, { if: isDefense, description: 'Base Power of Defense Skills -1 per stack this turn.' }),
    clashPowerUp: turnStack('clashPowerUp', 'Clash Power Up', 'buff', 'clashPower', { count: true }, { description: 'Clash Power +1 per stack this turn.' }),
    clashPowerDown: turnStack('clashPowerDown', 'Clash Power Down', 'debuff', 'clashPower', { neg: { count: true } }, { description: 'Clash Power -1 per stack this turn.' }),
    finalPowerUp: turnStack('finalPowerUp', 'Final Power Up', 'buff', 'finalPower', { count: true }, { description: 'Final Power +1 per stack this turn.' }),
    offenseLevelUp: turnStack('offenseLevelUp', 'Offense Level Up', 'buff', 'offenseLevel', { count: true }, { description: 'Offense Level +1 per stack this turn.' }),
    offenseLevelDown: turnStack('offenseLevelDown', 'Offense Level Down', 'debuff', 'offenseLevel', { neg: { count: true } }, { description: 'Offense Level -1 per stack this turn.' }),
    defenseLevelUp: turnStack('defenseLevelUp', 'Defense Level Up', 'buff', 'defenseLevel', { count: true }, { description: 'Defense Level +1 per stack this turn.' }),
    defenseLevelDown: turnStack('defenseLevelDown', 'Defense Level Down', 'debuff', 'defenseLevel', { neg: { count: true } }, { description: 'Defense Level -1 per stack this turn.' }),
    coinBoost: turnStack('coinBoost', 'Plus Coin Boost', 'buff', 'plusCoinPower', { count: true }, { description: 'Plus Coin Power +1 per stack this turn.' }),
    coinDrop: turnStack('coinDrop', 'Minus Coin Drop', 'buff', 'minusCoinPower', { neg: { count: true } }, { description: 'Minus Coin Power -1 per stack this turn.' }),
};
