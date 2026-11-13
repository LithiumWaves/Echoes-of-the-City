import { createBattle } from '../core/battle.js';
import { STATUSES } from '../content/statuses.js';

export function unitDef(overrides = {}) {
    return {
        id: overrides.id || 'dummy',
        name: overrides.name || 'Dummy',
        level: 40,
        maxHp: 100,
        speed: [5, 5],
        stagger: [],
        skills: [{ name: 'Hit', sin: 'wrath', damageType: 'slash', basePower: 5, coinPower: 0, coins: [{}] }],
        ...overrides,
    };
}

export function battleOf(allies, enemies, opts = {}) {
    const battle = createBattle({ allies, enemies, statuses: STATUSES, seed: 1234, ...opts });
    return battle;
}

export function ofType(events, type) {
    return events.filter((e) => e.type === type);
}
