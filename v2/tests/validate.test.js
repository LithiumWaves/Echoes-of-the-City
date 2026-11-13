import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUnit, validateStatus } from '../core/validate.js';
import { STATUSES } from '../content/statuses.js';
import { BLADE_FIXER, SHIELD_FIXER, THUG, BOSS } from '../content/units/sampleUnits.js';

const ids = new Set(Object.keys(STATUSES));

test('all shipped content validates', () => {
    for (const s of Object.values(STATUSES)) assert.deepEqual(validateStatus(s, ids), [], s.id);
    for (const u of [BLADE_FIXER, SHIELD_FIXER, THUG, BOSS]) assert.deepEqual(validateUnit(u, ids), [], u.id);
});

test('errors point at the exact path', () => {
    const errors = validateUnit({
        id: 'x',
        skills: [{ name: 'A', sin: 'rage', coins: [{ hooks: [{ on: 'hitt', do: [{ apply: 'bleeed' }] }] }] }],
    }, ids);
    assert.ok(errors.includes('skills[0].sin: unknown sin "rage"'));
    assert.ok(errors.includes('skills[0].coins[0].hooks[0].on: unknown trigger "hitt"'));
    assert.ok(errors.includes('skills[0].coins[0].hooks[0].do[0].apply: unknown status "bleeed"'));
});
