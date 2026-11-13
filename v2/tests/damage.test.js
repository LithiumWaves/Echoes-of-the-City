import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDamage, levelAdvantage, resistanceModifier, effectiveTypeResistance } from '../core/damage.js';
import { DEFAULT_RULES as rules } from '../core/constants.js';

test('resistance modifiers match the wiki examples', () => {
    assert.equal(resistanceModifier(2), 1);
    assert.equal(resistanceModifier(1.5), 0.5);
    assert.equal(resistanceModifier(1), 0);
    assert.equal(resistanceModifier(0.75), -0.125);
    assert.equal(resistanceModifier(0.5), -0.25);
    assert.equal(resistanceModifier(0), -0.5);
});

test('level advantage table', () => {
    const r = (d) => Math.round(levelAdvantage(d, 0) * 100) / 100;
    assert.ok(Math.abs(levelAdvantage(1, 0) - 1 / 26) < 1e-9);
    assert.equal(r(25), 0.5);
    assert.equal(r(100), 0.8);
    assert.ok(Math.abs(levelAdvantage(0, 6) + 6 / 31) < 1e-9);
});

test('final damage formula', () => {
    const plain = computeDamage({ coinRoll: 20, rules });
    assert.equal(plain.damage, 20);
    const fatal = computeDamage({ coinRoll: 20, typeResist: 2, rules });
    assert.equal(fatal.damage, 40);
    const crit = computeDamage({ coinRoll: 10, isCrit: true, rules });
    assert.equal(crit.damage, 12);
    const fragile = computeDamage({ coinRoll: 10, dynamicPct: 50, rules });
    assert.equal(fragile.damage, 15);
    // minimum 5% of coin roll
    const floor = computeDamage({ coinRoll: 40, sinResist: 0, typeResist: 0, dynamicPct: -100, rules });
    assert.equal(floor.damage, 2);
    assert.equal(computeDamage({ coinRoll: 0, rules }).damage, 0);
});

test('stagger replaces physical resistance without stacking', () => {
    assert.equal(effectiveTypeResistance(0.5, 1, rules), 2);
    assert.equal(effectiveTypeResistance(0.5, 3, rules), 3);
    assert.equal(effectiveTypeResistance(2, 1, rules), 2);
});
