import test from 'node:test';
import assert from 'node:assert/strict';
import { battleOf, unitDef, ofType } from './helpers.js';
import { BLADE_FIXER, SHIELD_FIXER, THUG, BOSS } from '../content/units/sampleUnits.js';
import { computeResonance } from '../core/battle.js';

test('a full sample battle runs to a result and is deterministic per seed', () => {
    const run = (seed) => {
        const b = battleOf([BLADE_FIXER, SHIELD_FIXER], [THUG, BOSS], { seed });
        b.start();
        let guard = 0;
        while (!b.result && guard++ < 60) { b.autoPlan(); b.commit(); }
        return { result: b.result, turn: b.turn, events: b.events.length };
    };
    const first = run(7);
    assert.ok(first.result, 'battle should end');
    assert.deepEqual(run(7), first);
});

test('one slot per unit, enemies with slots:2 get two, speed fixed by range', () => {
    const b = battleOf([unitDef({ speed: [4, 4] })], [unitDef({ id: 'e', slots: 2, speed: [2, 2] })]);
    b.start();
    assert.equal(b.slots.length, 3);
    assert.equal(b.slots[0].side, 'ally');
    assert.equal(b.slots[0].speed, 4);
    assert.equal(b.slots[0].choices.length, 2);
});

test('mutual targets clash; clash winner hits with remaining coins', () => {
    const strong = unitDef({ id: 'a', skills: [{ name: 'Big', basePower: 20, coinPower: 0, coins: [{}, {}] }] });
    const weak = unitDef({ id: 'b', skills: [{ name: 'Small', basePower: 1, coinPower: 0, coins: [{}] }] });
    const b = battleOf([strong], [weak]);
    b.start();
    const [ally, enemy] = [b.slots.find((s) => s.side === 'ally'), b.slots.find((s) => s.side === 'enemy')];
    b.choose(ally.id, 0);
    b.target(ally.id, enemy.id);
    const events = b.commit();
    const rounds = ofType(events, 'clashRound');
    assert.equal(rounds.length, 1);
    assert.equal(rounds[0].a.power, 20);
    const end = ofType(events, 'clashEnd')[0];
    assert.equal(end.winner, ally.id);
    const hits = ofType(events, 'hit').filter((h) => h.unit === ally.unit.uid);
    assert.equal(hits.length, 2);
    assert.equal(hits[0].damage, Math.floor(20 * (1 + 0.03)));
    assert.equal(ally.unit.sp, 10, 'clash win SP');
    assert.equal(enemy.unit.sp, 0, 'enemies have no sanity by default');
});

test('faster ally redirects an enemy slot targeting someone else', () => {
    const fast = unitDef({ id: 'fast', speed: [9, 9] });
    const slow = unitDef({ id: 'slow', speed: [1, 1], skills: [...unitDef().skills, { name: 'Block', kind: 'guard', basePower: 1, coinPower: 0, coins: [{}] }] });
    const enemy = unitDef({ id: 'e', speed: [5, 5] });
    const b = battleOf([fast, slow], [enemy]);
    b.start();
    const fastSlot = b.slots.find((s) => s.unit.defId === 'fast');
    const slowSlot = b.slots.find((s) => s.unit.defId === 'slow');
    const enemySlot = b.slots.find((s) => s.side === 'enemy');
    enemySlot.target = slowSlot.id;
    b.choose(fastSlot.id, 0);
    b.target(fastSlot.id, enemySlot.id);
    b.choose(slowSlot.id, { defense: 0 });
    const events = b.commit();
    assert.equal(ofType(events, 'redirect').length, 1);
    assert.equal(ofType(events, 'clashStart')[0].a, fastSlot.id);
});

test('a unit targeted by an enemy slot can always clash it back, even when slower', () => {
    const fast = unitDef({ id: 'fast', speed: [9, 9] });
    const slow = unitDef({ id: 'slow', speed: [1, 1] });
    const b = battleOf([fast, slow], [unitDef({ id: 'e', speed: [5, 5] })]);
    b.start();
    const [fastSlot, slowSlot] = ['fast', 'slow'].map((id) => b.slots.find((s) => s.unit.defId === id));
    const enemySlot = b.slots.find((s) => s.side === 'enemy');
    enemySlot.target = slowSlot.id;
    for (const s of [fastSlot, slowSlot]) { b.choose(s.id, 0); b.target(s.id, enemySlot.id); }
    const events = b.commit();
    assert.equal(ofType(events, 'redirect').length, 0);
    assert.equal(ofType(events, 'clashStart')[0].a, enemySlot.id);
    assert.equal(ofType(events, 'clashStart')[0].b, slowSlot.id);
});

test('slower ally attack goes unopposed', () => {
    const b = battleOf([unitDef({ speed: [1, 1] })], [unitDef({ id: 'e', speed: [5, 5] })]);
    b.start();
    const ally = b.slots.find((s) => s.side === 'ally');
    const enemy = b.slots.find((s) => s.side === 'enemy');
    enemy.target = null; // enemy does nothing this turn
    enemy.skill = null;
    b.choose(ally.id, 0);
    b.target(ally.id, enemy.id);
    const events = b.commit();
    assert.equal(ofType(events, 'clashStart').length, 0);
    assert.equal(ofType(events, 'hit').length, 1);
});

test('heads chance follows 50 + SP', () => {
    const coin = unitDef({ skills: [{ name: 'Flip', basePower: 0, coinPower: 1, coins: Array.from({ length: 10 }, () => ({})) }] });
    const run = (sp) => {
        let heads = 0;
        let total = 0;
        for (let seed = 1; seed < 80; seed += 1) {
            const b = battleOf([{ ...coin, startSanity: sp }], [unitDef({ id: 'e', maxHp: 9999, skills: [{ name: 'Wait', kind: 'guard', basePower: 0, coinPower: 0, coins: [{}] }] })], { seed });
            b.start();
            const e = b.slots.find((s) => s.side === 'enemy');
            e.skill = null;
            const a = b.slots.find((s) => s.side === 'ally');
            b.choose(a.id, 0); b.target(a.id, e.id);
            const hits = ofType(b.commit(), 'hit');
            heads += hits.filter((h) => h.heads).length;
            total += hits.length;
        }
        return heads / total;
    };
    assert.ok(Math.abs(run(45) - 0.95) < 0.05);
    assert.ok(Math.abs(run(-40) - 0.10) < 0.05);
    assert.ok(Math.abs(run(0) - 0.5) < 0.07);
});

test('burn ticks at turn end, bleed on coin toss, rupture when hit', () => {
    const b = battleOf([unitDef()], [unitDef({ id: 'e', maxHp: 500 })]);
    b.start();
    const ally = b.units[0];
    const enemy = b.units[1];
    b.ops.addStatus(ally, 'burn', { potency: 3, count: 2 });
    b.ops.addStatus(ally, 'bleed', { potency: 2, count: 3 });
    b.ops.addStatus(enemy, 'rupture', { potency: 4, count: 2 });
    const enemySlot = b.slots.find((s) => s.side === 'enemy');
    enemySlot.skill = null;
    const a = b.slots.find((s) => s.side === 'ally');
    b.choose(a.id, 0); b.target(a.id, enemySlot.id);
    const events = b.commit();
    const fixed = ofType(events, 'fixedDamage');
    assert.deepEqual(fixed.map((f) => [f.kind, f.amount]), [['bleed', 2], ['rupture', 4], ['burn', 3]]);
    assert.equal(ally.statuses.get('burn').count, 1);
    assert.equal(ally.statuses.get('bleed').count, 2);
    assert.equal(enemy.statuses.get('rupture').count, 1);
});

test('crossing a stagger threshold staggers and makes physical Fatal', () => {
    const hitter = unitDef({ skills: [{ name: 'Big', damageType: 'slash', basePower: 30, coinPower: 0, coins: [{}, {}] }] });
    const b = battleOf([hitter], [unitDef({ id: 'e', maxHp: 200, stagger: [0.9], resist: { slash: 0.5 } })]);
    b.start();
    const e = b.slots.find((s) => s.side === 'enemy');
    e.skill = null;
    const a = b.slots.find((s) => s.side === 'ally');
    b.choose(a.id, 0); b.target(a.id, e.id);
    const events = b.commit();
    const hits = ofType(events, 'hit');
    assert.equal(ofType(events, 'stagger').length, 1);
    assert.equal(hits[0].resist.type, 0.5);
    assert.equal(hits[1].resist.type, 2);
    assert.equal(hits[0].damage, 22);
    assert.equal(hits[1].damage, 60);
    // Staggered this turn and the next: no enemy slots act next turn
    assert.ok(b.slots.filter((s) => s.side === 'enemy').every((s) => s.disabled));
});

test('guard shields, evade dodges weaker coins', () => {
    const attacker = unitDef({ id: 'atk', speed: [1, 1], skills: [{ name: 'Poke', basePower: 5, coinPower: 0, coins: [{}] }] });
    const guarder = unitDef({ id: 'g', skills: [{ name: 'Guard', kind: 'guard', basePower: 10, coinPower: 0, coins: [{}] }] });
    const b = battleOf([guarder], [attacker]);
    b.start();
    const g = b.slots.find((s) => s.side === 'ally');
    const e = b.slots.find((s) => s.side === 'enemy');
    b.choose(g.id, { defense: 0 });
    e.target = g.id;
    const events = b.commit();
    assert.equal(ofType(events, 'shield')[0].amount, 10);
    assert.equal(ofType(events, 'hit')[0].absorbed, 5);
    assert.equal(b.units[0].hp, 100);

    const evader = unitDef({ id: 'v', skills: [{ name: 'Dodge', kind: 'evade', basePower: 6, coinPower: 0, coins: [{}] }] });
    const b2 = battleOf([evader], [attacker]);
    b2.start();
    const v = b2.slots.find((s) => s.side === 'ally');
    b2.choose(v.id, { defense: 0 });
    b2.slots.find((s) => s.side === 'enemy').target = v.id;
    const ev2 = b2.commit();
    assert.equal(ofType(ev2, 'evade').length, 1);
    assert.equal(ofType(ev2, 'hit').length, 0);
});

test('sin resonance and absolute resonance bonuses', () => {
    const wrath = unitDef({ speed: [5, 5] });
    const b = battleOf([wrath, { ...wrath, id: 'b' }, { ...wrath, id: 'c' }], [unitDef({ id: 'e' })]);
    b.start();
    for (const s of b.slots.filter((x) => x.side === 'ally')) b.choose(s.id, 0);
    const res = computeResonance(b, 'ally');
    assert.deepEqual(res.wrath, { count: 3, absolute: 3 });
    assert.ok(b.slots.filter((x) => x.side === 'ally').every((s) => s.resonanceBonus === 3));
});

test('panic at -45 SP skips the turn, then SP resets', () => {
    const b = battleOf([unitDef({ startSanity: -45 })], [unitDef({ id: 'e' })]);
    b.start();
    const ally = b.units[0];
    assert.equal(ally.panicked, true);
    assert.ok(b.slots.find((s) => s.side === 'ally').disabled);
    b.commit();
    assert.equal(ally.sp, 0);
    assert.equal(ally.panicked, false);
});

test('custom passive written in data: heal on kill, conditional power', () => {
    const custom = unitDef({
        skills: [{
            name: 'Execute', basePower: 5, coinPower: 0, coins: [{}],
            hooks: [{ modify: 'finalPower', value: 50, if: { lte: [{ stat: 'hpPercent', of: 'target' }, 50] } }],
        }],
        passives: [{ name: 'Bloodthirst', hooks: [{ on: 'kill', do: [{ heal: 30, to: 'self' }] }] }],
        maxHp: 100,
    });
    const b = battleOf([custom], [unitDef({ id: 'e', maxHp: 40 }), unitDef({ id: 'f', maxHp: 999 })]);
    b.start();
    b.units[0].hp = 50;
    b.units[1].hp = 20;
    for (const s of b.slots.filter((x) => x.side === 'enemy')) s.skill = null;
    const a = b.slots.find((s) => s.side === 'ally');
    b.choose(a.id, 0);
    b.target(a.id, b.slots.find((s) => s.unit === b.units[1]).id);
    const events = b.commit();
    assert.equal(ofType(events, 'hit')[0].power, 55);
    assert.equal(ofType(events, 'defeated').length, 1);
    assert.equal(b.units[0].hp, 80);
});

test('next-turn statuses land at turn start and expire at turn end', () => {
    const b = battleOf([unitDef()], [unitDef({ id: 'e' })]);
    b.start();
    const ally = b.units[0];
    b.ops.addStatus(ally, 'haste', { count: 3 }, { nextTurn: true });
    assert.equal(ally.statuses.has('haste'), false);
    for (const s of b.slots.filter((x) => x.side === 'enemy')) s.skill = null;
    b.commit();
    assert.equal(ally.statuses.get('haste').count, 3);
    assert.equal(b.slots.find((s) => s.side === 'ally').speed, 8);
});

test('E.G.O costs resources and sanity', () => {
    const ego = unitDef({
        skills: [
            { name: 'Hit', sin: 'wrath', basePower: 5, coinPower: 0, coins: [{}] },
            { name: 'Ego', sin: 'wrath', basePower: 20, coinPower: 0, coins: [{}], egoCost: { wrath: 2 }, sanityCost: 10 },
        ],
    });
    const b = battleOf([ego], [unitDef({ id: 'e', maxHp: 999 })]);
    b.start();
    const slot = () => b.slots.find((s) => s.side === 'ally');
    assert.equal(b.choose(slot().id, { ego: 0 }), false);
    b.resources.ally.wrath = 2;
    assert.equal(b.choose(slot().id, { ego: 0 }), true);
    b.target(slot().id, b.slots.find((s) => s.side === 'enemy').id);
    b.commit();
    assert.equal(b.units[0].sp <= 0, true);
});
