// The combat simulation. Pure logic: no DOM, deterministic for a given seed.
// Everything that happens is emitted as an event so the presentation layer
// can play it back (clash rounds, coin flips, hits, status changes...).
//
// Turn flow (limbuscompany.wiki.gg/wiki/Battles):
//   Turn Start  -> pending statuses land, panic/stagger checks, Speed rolled per Skill Slot,
//                  skills offered from each unit's deck, enemies pick skills/targets.
//   Planning    -> player picks a skill + target per slot (choose/target/autoPlan).
//   Combat      -> commit(): resonance, clash pairing, actions resolve in Speed order.
//   Turn End    -> turnEnd hooks (Burn...), one-turn statuses expire, stagger recovery.

import { DEFAULT_RULES, SINS } from './constants.js';
import { createRng } from './rng.js';
import { createUnit } from './units.js';
import { changeStatus, removeStatus } from './statuses.js';
import { fire, modifier, runActions } from './effects.js';
import { computeDamage, effectiveTypeResistance } from './damage.js';
import { planEnemySlots, autoPlanAllies } from './ai.js';

export function createBattle({ allies = [], enemies = [], statuses = {}, rules = {}, seed = Date.now(), name = '' } = {}) {
    const battle = {
        name,
        seed,
        rules: { ...DEFAULT_RULES, ...rules },
        rng: createRng(seed),
        statusDefs: statuses,
        turn: 0,
        phase: 'setup',
        result: null,
        units: [],
        slots: [],
        resources: { ally: emptyResources(), enemy: emptyResources() },
        resonance: { ally: {}, enemy: {} },
        hookUsage: new Set(),
        events: [],
        listeners: new Set(),
    };

    battle.emit = (event) => {
        const full = { turn: battle.turn, seq: battle.events.length, ...event };
        battle.events.push(full);
        for (const fn of battle.listeners) fn(full);
        return full;
    };
    battle.on = (fn) => { battle.listeners.add(fn); return () => battle.listeners.delete(fn); };
    battle.ops = createOps(battle);

    const add = (entries, side) => entries.forEach((entry, i) => {
        const def = entry.unit || entry;
        battle.units.push(createUnit(def, side, statuses, { level: entry.level, deployIndex: i }));
    });
    add(allies, 'ally');
    add(enemies, 'enemy');

    battle.unit = (uid) => battle.units.find((u) => u.uid === uid);
    battle.slot = (id) => battle.slots.find((s) => s.id === id);
    battle.start = () => start(battle);
    battle.choose = (slotId, choice) => choose(battle, slotId, choice);
    battle.target = (slotId, targetSlotId) => setTarget(battle, slotId, targetSlotId);
    battle.autoPlan = (opts) => autoPlanAllies(battle, opts);
    battle.commit = () => commit(battle);
    return battle;
}

function emptyResources() {
    return Object.fromEntries(SINS.map((s) => [s, 0]));
}

// ---------------------------------------------------------------- operations
// Every state change goes through ops so it emits an event and fires hooks.

function createOps(battle) {
    const ops = {
        addStatus(unit, id, { potency = 0, count = 0 }, { nextTurn = false, source = null } = {}) {
            if (!unit?.alive) return;
            const def = battle.statusDefs[id];
            if (!def) {
                battle.emit({ type: 'warning', text: `Unknown status "${id}"` });
                return;
            }
            if (nextTurn && (potency > 0 || count > 0)) {
                unit.pendingStatuses.push({ id, potency, count });
                battle.emit({ type: 'statusQueued', unit: unit.uid, status: id, potency, count });
                return;
            }
            const change = changeStatus(unit, def, { potency, count }, battle.rules.maxStatusValue);
            if (change) battle.emit({ type: 'status', unit: unit.uid, status: id, ...change, source: source?.uid });
        },
        removeStatus(unit, id) {
            const change = removeStatus(unit, id);
            if (change) battle.emit({ type: 'status', unit: unit.uid, status: id, ...change });
        },
        changeSanity(unit, amount, reason = 'effect') {
            if (!unit?.alive || !unit.hasSanity || !amount) return;
            if (unit.panicked && unit.side === 'ally') return; // fixed at -45 until next Turn Start
            const before = unit.sp;
            unit.sp = Math.max(battle.rules.sanityMin, Math.min(battle.rules.sanityMax, unit.sp + Math.round(amount)));
            if (unit.sp !== before) battle.emit({ type: 'sanity', unit: unit.uid, before, after: unit.sp, reason });
        },
        heal(unit, amount) {
            if (!unit?.alive || amount <= 0) return;
            const before = unit.hp;
            unit.hp = Math.min(unit.maxHp, unit.hp + Math.floor(amount));
            if (unit.hp !== before) battle.emit({ type: 'heal', unit: unit.uid, amount: unit.hp - before, hp: unit.hp });
        },
        addShield(unit, amount) {
            if (!unit?.alive || amount <= 0) return;
            unit.shield += Math.floor(amount);
            battle.emit({ type: 'shield', unit: unit.uid, amount: Math.floor(amount), shield: unit.shield });
        },
        addResource(side, sin, amount) {
            if (!SINS.includes(sin) || !amount) return;
            battle.resources[side][sin] = Math.max(0, battle.resources[side][sin] + amount);
            battle.emit({ type: 'resource', side, sin, amount, total: battle.resources[side][sin] });
        },
        dealFixedDamage(unit, amount, { kind = 'fixed', source = null } = {}) {
            if (!unit?.alive) return 0;
            const dmg = Math.max(0, Math.floor(amount));
            if (!dmg) return 0;
            const before = unit.hp;
            unit.hp = Math.max(0, unit.hp - dmg);
            battle.emit({ type: 'fixedDamage', unit: unit.uid, amount: dmg, kind, hp: unit.hp });
            afterHpLoss(battle, unit, before, source);
            return dmg;
        },
        raiseStaggerThreshold(unit, amount) {
            const next = unit.staggerThresholds.filter((t) => !t.broken).sort((a, b) => b.hp - a.hp)[0];
            if (!next || amount <= 0) return;
            next.hp = Math.min(unit.maxHp, next.hp + Math.floor(amount));
            battle.emit({ type: 'staggerThreshold', unit: unit.uid, hp: next.hp });
            checkStagger(battle, unit, unit.hp + 1);
        },
        tremorBurst(unit, source) {
            const tremor = unit.statuses.get('tremor');
            if (!tremor) return;
            battle.emit({ type: 'tremorBurst', unit: unit.uid, potency: tremor.potency });
            ops.raiseStaggerThreshold(unit, tremor.potency);
            ops.addStatus(unit, 'tremor', { count: -1 }, { source });
        },
        stagger(unit, reason = 'threshold') {
            if (!unit.alive) return;
            unit.staggerLevel = Math.min(3, unit.staggerLevel + 1);
            unit.staggerUntilTurn = battle.turn + 1;
            for (const slot of battle.slots) if (slot.unit === unit) slot.disabled = true;
            battle.emit({ type: 'stagger', unit: unit.uid, level: unit.staggerLevel, reason });
            fire(battle, unit, 'staggered', {});
        },
    };
    return ops;
}

function checkStagger(battle, unit, hpBefore) {
    for (const t of unit.staggerThresholds) {
        if (!t.broken && unit.alive && unit.hp <= t.hp && unit.shield <= 0) {
            t.broken = true;
            battle.ops.stagger(unit, 'threshold');
        }
    }
}

function afterHpLoss(battle, unit, hpBefore, killer) {
    if (unit.hp <= 0) {
        defeat(battle, unit, killer);
        return;
    }
    checkStagger(battle, unit, hpBefore);
}

function defeat(battle, unit, killer) {
    if (!unit.alive) return;
    unit.alive = false;
    unit.hp = 0;
    battle.emit({ type: 'defeated', unit: unit.uid, by: killer?.uid ?? null });
    fire(battle, unit, 'defeated', { target: killer });
    if (killer?.alive) {
        fire(battle, killer, 'kill', { target: unit });
        battle.ops.changeSanity(killer, battle.rules.killSanity, 'kill');
    }
    for (const other of battle.units) {
        if (!other.alive) continue;
        if (other.side === unit.side) {
            battle.ops.changeSanity(other, battle.rules.allyDeathSanity, 'allyDeath');
            fire(battle, other, 'allyDefeated', { target: unit });
        } else {
            fire(battle, other, 'enemyDefeated', { target: unit });
        }
    }
    checkEnd(battle);
}

function checkEnd(battle) {
    if (battle.result) return;
    const alliesAlive = battle.units.some((u) => u.side === 'ally' && u.alive);
    const enemiesAlive = battle.units.some((u) => u.side === 'enemy' && u.alive);
    if (!enemiesAlive) battle.result = 'victory';
    else if (!alliesAlive) battle.result = 'defeat';
    if (battle.result) {
        battle.phase = 'ended';
        battle.emit({ type: 'battleEnd', result: battle.result });
    }
}

// --------------------------------------------------------------------- turns

function start(battle) {
    if (battle.phase !== 'setup') return battle;
    battle.emit({ type: 'battleStart' });
    for (const unit of battle.units) fire(battle, unit, 'battleStart', {});
    startTurn(battle);
    return battle;
}

function landPendingStatuses(battle, unit) {
    const pending = unit.pendingStatuses;
    unit.pendingStatuses = [];
    for (const p of pending) battle.ops.addStatus(unit, p.id, p, {});
}

function buildDeck(battle, unit) {
    const deck = [];
    unit.attackSkills.forEach((skill) => {
        const copies = skill.copies ?? battle.rules.deckCopies[skill.rank - 1] ?? 1;
        for (let i = 0; i < copies; i += 1) deck.push(skill);
    });
    for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(battle.rng.next() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function draw(battle, unit) {
    if (!unit.deck.length) unit.deck = buildDeck(battle, unit);
    return unit.deck.shift();
}

function startTurn(battle) {
    battle.turn += 1;
    battle.phase = 'planning';
    battle.resonance = { ally: {}, enemy: {} };
    if (battle.turn > battle.rules.turnLimit) {
        battle.result = 'defeat';
        battle.phase = 'ended';
        battle.emit({ type: 'battleEnd', result: 'defeat', reason: 'turnLimit' });
        return;
    }
    battle.emit({ type: 'turnStart' });

    for (const unit of battle.units) {
        if (!unit.alive) continue;
        if (unit.shield > 0) {
            unit.shield = 0;
            battle.emit({ type: 'shield', unit: unit.uid, amount: 0, shield: 0 });
        }
        if (unit.panicked) {
            unit.panicked = false;
            const before = unit.sp;
            unit.sp = 0;
            battle.emit({ type: 'sanity', unit: unit.uid, before, after: 0, reason: 'panicRecovery' });
        }
        landPendingStatuses(battle, unit);
        if (unit.hasSanity && unit.side === 'ally' && unit.sp <= battle.rules.panicAt) {
            unit.panicked = true;
            battle.emit({ type: 'panic', unit: unit.uid });
        }
    }
    for (const unit of battle.units) if (unit.alive) fire(battle, unit, 'turnStart', {});

    // Speed: one roll per Skill Slot.
    battle.slots = [];
    for (const unit of battle.units) {
        if (!unit.alive) continue;
        for (let i = 0; i < unit.slotCount; i += 1) {
            const [min, max] = unit.speedRange;
            const speed = Math.max(1, battle.rng.int(min, max) + modifier(battle, unit, 'speed', {}));
            unit.currentSpeed = speed;
            const slot = {
                id: `${unit.uid}#${i}`,
                unit,
                side: unit.side,
                unitSlotIndex: i,
                speed,
                disabled: unit.staggerLevel > 0 || unit.panicked,
                choices: [],
                skill: null,
                target: null,
                done: false,
            };
            if (unit.side === 'ally' && !slot.disabled) {
                for (let c = 0; c < battle.rules.choicesPerSlot; c += 1) {
                    const drawn = draw(battle, unit);
                    if (drawn) slot.choices.push(drawn);
                }
            }
            battle.slots.push(slot);
        }
    }
    battle.slots.sort(slotOrder);
    planEnemySlots(battle);
    battle.emit({ type: 'planning', slots: battle.slots.map(slotView) });
}

function slotOrder(a, b) {
    if (b.speed !== a.speed) return b.speed - a.speed;
    if (a.side !== b.side) return a.side === 'ally' ? -1 : 1;
    return a.unit.deployIndex - b.unit.deployIndex;
}

export function slotView(slot) {
    return {
        id: slot.id,
        unit: slot.unit.uid,
        side: slot.side,
        speed: slot.speed,
        disabled: slot.disabled,
        skill: slot.skill?.id ?? null,
        target: slot.target,
        choices: slot.choices.map((c) => c.id),
    };
}

// ------------------------------------------------------------------ planning

function choose(battle, slotId, choice) {
    const slot = battle.slot(slotId);
    if (!slot || slot.side !== 'ally' || slot.disabled || battle.phase !== 'planning') return false;
    const unit = slot.unit;
    let skill = null;
    if (typeof choice === 'number') skill = slot.choices[choice];
    else if (choice?.defense != null) skill = unit.defenseSkills[choice.defense];
    else if (choice?.ego != null) {
        skill = unit.egoSkills[choice.ego];
        if (skill && !canAffordEgo(battle, unit, skill)) return false;
    } else if (typeof choice === 'string') skill = unit.skills.find((s) => s.id === choice);
    if (!skill) return false;
    slot.skill = skill;
    if (skill.kind !== 'attack') slot.target = null;
    return true;
}

function canAffordEgo(battle, unit, skill) {
    const pool = battle.resources[unit.side];
    return Object.entries(skill.egoCost || {}).every(([sin, n]) => (pool[sin] ?? 0) >= n);
}

function setTarget(battle, slotId, targetSlotId) {
    const slot = battle.slot(slotId);
    const target = battle.slot(targetSlotId);
    if (!slot || !target || slot.side !== 'ally' || battle.phase !== 'planning') return false;
    if (target.side === slot.side && !slot.skill?.indiscriminate) return false;
    slot.target = target.id;
    return true;
}

/** Sin Resonance for one side's planned skills, dashboard order = slot speed order. */
export function computeResonance(battle, side) {
    const planned = battle.slots.filter((s) => s.side === side && s.skill && !s.disabled);
    const counts = {};
    for (const s of planned) if (s.skill.sin) counts[s.skill.sin] = (counts[s.skill.sin] || 0) + 1;
    const runOf = new Map();
    let i = 0;
    while (i < planned.length) {
        let j = i;
        const sin = planned[i].skill.sin;
        while (j < planned.length && sin && planned[j].skill.sin === sin) j += 1;
        const length = Math.max(1, j - i);
        for (let k = i; k < i + length; k += 1) runOf.set(planned[k], length);
        i += length;
    }
    const result = {};
    for (const [sin, count] of Object.entries(counts)) {
        const longest = Math.max(...planned.filter((s) => s.skill.sin === sin).map((s) => runOf.get(s)));
        result[sin] = { count, absolute: longest >= 3 ? longest : 0 };
    }
    for (const s of planned) {
        const sin = s.skill.sin;
        const r = battle.rules;
        const std = sin ? r.resonanceBonus[Math.min(counts[sin], r.resonanceBonus.length - 1)] : 0;
        const run = runOf.get(s);
        const abs = sin && run >= 3 ? r.absoluteResonanceBonus[Math.min(run, r.absoluteResonanceBonus.length - 1)] : 0;
        s.resonanceBonus = Math.max(std, abs);
    }
    return result;
}

/**
 * Clash pairing. Mutual targets always clash; then, in Speed order, an ally
 * slot that is faster than the enemy slot it targets redirects that slot
 * into a clash. Clashable defense skills clash with attacks aimed at them.
 */
export function pairClashes(battle) {
    const live = battle.slots.filter((s) => s.skill && !s.disabled && s.unit.alive);
    for (const s of live) s.clashWith = null;
    const byId = new Map(live.map((s) => [s.id, s]));
    const lock = (a, b) => { a.clashWith = b.id; b.clashWith = a.id; };
    const canClash = (s) => s.skill.clashable;

    for (const a of live) {
        if (a.clashWith || !a.target) continue;
        const b = byId.get(a.target);
        if (b && !b.clashWith && b.target === a.id && canClash(a) && canClash(b)) lock(a, b);
    }
    // Enemy attacks aimed at a clashable defense slot.
    for (const e of live.filter((s) => s.side === 'enemy' && !s.clashWith && s.target)) {
        const d = byId.get(e.target);
        if (d && !d.clashWith && d.skill.kind !== 'attack' && d.skill.clashable && canClash(e)) lock(e, d);
    }
    for (const a of live.filter((s) => s.side === 'ally' && s.skill.kind === 'attack').sort(slotOrder)) {
        if (a.clashWith || !a.target) continue;
        const b = byId.get(a.target);
        if (b && !b.clashWith && b.side !== a.side && a.speed > b.speed && canClash(b) && b.skill.kind === 'attack') {
            if (b.target !== a.id) battle.emit({ type: 'redirect', slot: b.id, from: b.target, to: a.id });
            b.target = a.id;
            lock(a, b);
        }
    }
    return live.filter((s) => s.clashWith).map((s) => [s.id, s.clashWith]);
}

// -------------------------------------------------------------------- combat

function commit(battle) {
    if (battle.phase !== 'planning') return [];
    const firstEvent = battle.events.length;
    battle.phase = 'combat';

    // Unplanned ally slots get their first choice (game does the same on Start).
    autoPlanAllies(battle);
    // Unchosen skills go back to the top of the deck.
    for (const slot of battle.slots) {
        if (slot.side !== 'ally') continue;
        const unused = slot.choices.filter((c) => c !== slot.skill);
        if (unused.length) slot.unit.deck.unshift(...unused);
    }
    battle.resonance.ally = computeResonance(battle, 'ally');
    battle.resonance.enemy = computeResonance(battle, 'enemy');
    for (const [sin, r] of Object.entries(battle.resonance.ally)) {
        if (r.count >= 2) battle.emit({ type: 'resonance', side: 'ally', sin, count: r.count, absolute: r.absolute });
    }
    // E.G.O costs are paid up front.
    for (const slot of battle.slots) {
        const skill = slot.skill;
        if (!skill?.egoCost || slot.disabled) continue;
        for (const [sin, n] of Object.entries(skill.egoCost)) battle.ops.addResource(slot.side, sin, -n);
        if (skill.sanityCost) battle.ops.changeSanity(slot.unit, -skill.sanityCost, 'ego');
    }

    const pairs = pairClashes(battle);
    battle.emit({ type: 'combatStart', pairs, slots: battle.slots.map(slotView) });
    for (const unit of battle.units) if (unit.alive) fire(battle, unit, 'combatStart', {});

    for (const slot of [...battle.slots].sort(slotOrder)) {
        if (battle.result) break;
        if (slot.done || !slot.skill || slot.skill.kind !== 'attack' && !slot.clashWith) continue;
        if (!canAct(slot)) { slot.done = true; continue; }
        const partner = slot.clashWith ? battle.slot(slot.clashWith) : null;
        if (partner && !partner.done && canAct(partner)) {
            resolveClash(battle, slot, partner);
        } else if (slot.skill.kind === 'attack' || slot.skill.kind === 'counter') {
            slot.done = true;
            const target = resolveTargetSlot(battle, slot);
            if (target) oneSidedAttack(battle, slot, target, { clashCount: 0 });
        } else {
            slot.done = true;
        }
    }

    if (!battle.result) endTurn(battle);
    if (!battle.result) startTurn(battle);
    return battle.events.slice(firstEvent);
}

function canAct(slot) {
    return slot.unit.alive && !slot.disabled && slot.unit.staggerLevel === 0 && !slot.unit.panicked;
}

function resolveTargetSlot(battle, slot) {
    let target = battle.slot(slot.target);
    if (target && target.unit.alive) return target;
    // Original target died: retarget a random living opposing slot.
    const pool = battle.slots.filter((s) => s.side !== slot.side && s.unit.alive);
    target = battle.rng.pick(pool);
    if (target) slot.target = target.id;
    return target || null;
}

function levelOf(battle, slot, kind) {
    const { unit, skill } = slot;
    const res = slot.resonanceBonus || 0;
    if (kind === 'offense') {
        return Math.max(1, unit.level + skill.offenseMod + res + modifier(battle, unit, 'offenseLevel', { skill }, { skill }));
    }
    const mod = skill && skill.kind !== 'attack' ? skill.defenseMod : unit.defenseMod;
    return Math.max(1, unit.level + mod + res + modifier(battle, unit, 'defenseLevel', { skill }, { skill }));
}

function headsChance(battle, unit, skill, ctx) {
    const sp = unit.hasSanity ? unit.sp : 0;
    const pct = 50 + sp + modifier(battle, unit, 'headsChance', ctx, { skill });
    return Math.max(0, Math.min(100, pct)) / 100;
}

/**
 * Flip a set of coins. Returns per-coin results with the running power.
 * Coin power accumulates: coin i lands on base + sum of heads coin powers so far.
 */
function flipCoins(battle, slot, coins, ctx) {
    const { unit, skill } = slot;
    const base = skill.basePower + modifier(battle, unit, 'basePower', ctx, { skill });
    let running = base;
    const results = [];
    for (const coin of coins) {
        const coinPower = coin.cracked ? Math.sign(skill.coinPower || 1) : skill.coinPower;
        const roll = { coin: coin.index, heads: battle.rng.chance(headsChance(battle, unit, skill, ctx)), nullified: false };
        fire(battle, unit, 'coinFlip', { ...ctx, coinRoll: roll, attack: { ...ctx.attack, isHeads: roll.heads } }, { skill, coin });
        let delta = 0;
        if (roll.heads && !roll.nullified) {
            const signMod = coinPower >= 0
                ? modifier(battle, unit, 'plusCoinPower', ctx, { skill, coin })
                : modifier(battle, unit, 'minusCoinPower', ctx, { skill, coin });
            delta = coinPower + signMod + modifier(battle, unit, 'coinPower', ctx, { skill, coin });
        }
        running += delta;
        roll.power = running;
        results.push(roll);
    }
    return { base, results, power: results.length ? results.at(-1).power : base };
}

function resolveClash(battle, a, b) {
    a.done = true;
    b.done = true;
    const sides = [a, b].map((slot) => ({
        slot,
        unit: slot.unit,
        skill: slot.skill,
        coins: slot.skill.coins.map((c) => ({ ...c, broken: false, cracked: false })),
        level: levelOf(battle, slot, slot.skill.kind === 'attack' ? 'offense' : 'defense'),
    }));
    const [A, B] = sides;
    battle.emit({ type: 'clashStart', a: a.id, b: b.id, aUnit: A.unit.uid, bUnit: B.unit.uid, aSkill: A.skill.id, bSkill: B.skill.id });
    for (const [me, foe] of [[A, B], [B, A]]) {
        const ctx = { target: foe.unit, attack: { inClash: true } };
        fire(battle, me.unit, 'use', ctx, { skill: me.skill });
        fire(battle, me.unit, 'clashStart', ctx, { skill: me.skill });
        if (me.skill.kind === 'attack' && me.skill.sin) battle.ops.addResource(me.unit.side, me.skill.sin, battle.rules.egoResourcePerSkill);
    }

    let clashCount = 0;
    const live = (s) => s.coins.filter((c) => !c.broken && !c.cracked);
    while (live(A).length && live(B).length && clashCount < battle.rules.maxClashCount && A.unit.alive && B.unit.alive) {
        clashCount += 1;
        const rolls = sides.map((me) => {
            const foe = me === A ? B : A;
            const ctx = { target: foe.unit, attack: { inClash: true, clashCount } };
            const flip = flipCoins(battle, me.slot, live(me), ctx);
            const levelBonus = Math.max(0, Math.floor((me.level - foe.level) / battle.rules.levelDiffPerClashPower));
            const power = Math.max(0, flip.power
                + modifier(battle, me.unit, 'clashPower', ctx, { skill: me.skill })
                + modifier(battle, me.unit, 'finalPower', ctx, { skill: me.skill })
                + levelBonus);
            return { flip, power, levelBonus };
        });
        const [ra, rb] = rolls;
        let loser = null;
        if (ra.power > rb.power) loser = B;
        else if (rb.power > ra.power) loser = A;
        if (loser) {
            const coin = live(loser)[0];
            if (coin.unbreakable) coin.cracked = true;
            else coin.broken = true;
        }
        battle.emit({
            type: 'clashRound',
            clashCount,
            a: { slot: a.id, heads: ra.flip.results.map((r) => r.heads), power: ra.power, coinsLeft: live(A).length, levelBonus: ra.levelBonus },
            b: { slot: b.id, heads: rb.flip.results.map((r) => r.heads), power: rb.power, coinsLeft: live(B).length, levelBonus: rb.levelBonus },
            loser: loser ? loser.slot.id : null,
        });
    }

    if (clashCount >= battle.rules.maxClashCount && live(A).length && live(B).length) {
        battle.emit({ type: 'clashEnd', winner: null, clashCount, reason: 'clashLimit' });
        return;
    }
    if (!A.unit.alive || !B.unit.alive) return;
    const winner = live(A).length ? A : B;
    const loser = winner === A ? B : A;
    battle.emit({ type: 'clashEnd', winner: winner.slot.id, loser: loser.slot.id, clashCount });
    fire(battle, winner.unit, 'clashWin', { target: loser.unit, attack: { inClash: true, clashCount } }, { skill: winner.skill });
    fire(battle, loser.unit, 'clashLose', { target: winner.unit, attack: { inClash: true, clashCount } }, { skill: loser.skill });
    battle.ops.changeSanity(winner.unit, battle.rules.clashWinSanity + battle.rules.clashWinSanityPerClash * (clashCount - 1), 'clashWin');
    battle.ops.changeSanity(loser.unit, battle.rules.clashLoseSanity, 'clashLose');

    if (winner.skill.kind === 'attack' || winner.skill.kind === 'counter') {
        oneSidedAttack(battle, winner.slot, loser.slot, { clashCount, coins: live(winner), afterClash: true, defenderSkill: loser.skill });
    }
    // Cracked Unbreakable Coins still strike after losing the clash.
    const cracked = loser.coins.filter((c) => c.cracked);
    if (cracked.length && canAct(loser.slot) && winner.unit.alive && loser.skill.kind === 'attack') {
        oneSidedAttack(battle, loser.slot, winner.slot, { clashCount, coins: cracked, afterClash: true });
    }
}

/** Find the defender's non-clash defense skill (guard/evade/counter) for this turn. */
function defenseSlotFor(battle, unit) {
    return battle.slots.find((s) => s.unit === unit && s.skill && s.skill.kind !== 'attack'
        && !s.clashWith && canAct(s) && !s.defenseSpent);
}

function oneSidedAttack(battle, slot, targetSlot, { clashCount = 0, coins = null, afterClash = false, defenderSkill = null } = {}) {
    const attacker = slot.unit;
    const skill = slot.skill;
    const defender = targetSlot.unit;
    if (!attacker.alive || !defender.alive) return;
    const useCoins = coins || skill.coins.map((c) => ({ ...c }));
    const baseCtx = { target: defender, attacker, defender, attack: { clashCount, inClash: false } };

    if (!afterClash) {
        fire(battle, attacker, 'use', baseCtx, { skill });
        if (skill.sin) battle.ops.addResource(attacker.side, skill.sin, battle.rules.egoResourcePerSkill);
    }

    // Non-clash defense: Guard adds shield before the hits; Evade rolls per coin; Counter answers after.
    const defense = defenderSkill ? null : defenseSlotFor(battle, defender);
    let evade = null;
    if (defense?.skill.kind === 'guard') {
        const g = flipCoins(battle, defense, defense.skill.coins, { target: attacker, attack: {} });
        battle.ops.addShield(defender, g.power);
        defense.defenseSpent = true;
        if (defense.skill.sin) battle.ops.addResource(defender.side, defense.skill.sin, 1);
    } else if (defense?.skill.kind === 'evade') {
        evade = defense;
    }

    battle.emit({ type: 'attackStart', slot: slot.id, unit: attacker.uid, target: defender.uid, skill: skill.id, clashCount, afterClash });
    const offense = levelOf(battle, slot, 'offense');
    const defenseLevel = defense && defense.skill.kind !== 'counter' ? levelOf(battle, defense, 'defense') : levelOf(battle, { ...targetSlot, skill: defenderSkill || targetSlot.skill }, 'defense');

    const flip = flipCoins(battle, slot, useCoins, baseCtx);
    flip.results.forEach((roll, i) => {
        if (!attacker.alive || !defender.alive || attacker.staggerLevel > 0) return;
        const coin = useCoins[i];
        const attack = { clashCount, coinIndex: i, isHeads: roll.heads, inClash: false, heads: flip.results.slice(0, i + 1).filter((r) => r.heads).length };
        const ctx = { ...baseCtx, attack };
        fire(battle, attacker, 'coinToss', ctx, { skill, coin });
        if (!attacker.alive) return;

        const finalPower = Math.max(0, roll.power + modifier(battle, attacker, 'finalPower', ctx, { skill, coin }));
        attack.finalPower = finalPower;

        if (evade) {
            const e = flipCoins(battle, evade, evade.skill.coins, { target: attacker, attack: {} });
            if (e.power >= finalPower) {
                battle.emit({ type: 'evade', unit: defender.uid, slot: evade.id, power: e.power, against: finalPower, coin: i });
                fire(battle, defender, 'evade', { target: attacker });
                return;
            }
            evade.defenseSpent = true;
            evade = null;
        }

        const critPct = modifier(battle, attacker, 'critChance', ctx, { skill, coin });
        attack.isCrit = critPct > 0 && battle.rng.next() * 100 < critPct;
        const dynamicPct = modifier(battle, attacker, 'damagePct', ctx, { skill, coin })
            + modifier(battle, defender, 'takenDamagePct', { target: attacker, attacker, defender, attack }, {});
        const typeResist = effectiveTypeResistance(defender.resist[skill.damageType] ?? 1, defender.staggerLevel, battle.rules);
        const { damage, parts } = computeDamage({
            coinRoll: finalPower,
            sinResist: skill.sin ? defender.resist[skill.sin] ?? 1 : 1,
            typeResist,
            offenseLevel: offense,
            defenseLevel,
            isCrit: attack.isCrit,
            clashCount,
            dynamicPct,
            rules: battle.rules,
        });
        attack.damage = damage;

        const absorbed = Math.min(defender.shield, damage);
        defender.shield -= absorbed;
        const hpBefore = defender.hp;
        defender.hp = Math.max(0, defender.hp - (damage - absorbed));
        battle.emit({
            type: 'hit', slot: slot.id, unit: attacker.uid, target: defender.uid, coin: i, heads: roll.heads,
            power: finalPower, damage, absorbed, crit: attack.isCrit, hp: defender.hp, shield: defender.shield,
            damageType: skill.damageType, sin: skill.sin, resist: { type: typeResist, sin: skill.sin ? defender.resist[skill.sin] ?? 1 : 1 }, parts,
        });

        fire(battle, attacker, 'hit', ctx, { skill, coin });
        fire(battle, attacker, roll.heads ? 'headsHit' : 'tailsHit', ctx, { skill, coin });
        if (attack.isCrit) fire(battle, attacker, 'crit', ctx, { skill, coin });
        const takenCtx = { target: attacker, attacker, defender, attack };
        fire(battle, defender, 'hitTaken', takenCtx);
        if (damage > absorbed) fire(battle, defender, 'damaged', takenCtx);
        afterHpLoss(battle, defender, hpBefore, attacker);
    });

    if (attacker.alive) fire(battle, attacker, 'attackEnd', { ...baseCtx }, { skill });
    battle.emit({ type: 'attackEnd', slot: slot.id });

    if (defense?.skill.kind === 'counter' && !defense.defenseSpent && canAct(defense) && attacker.alive) {
        defense.defenseSpent = true;
        oneSidedAttack(battle, defense, slot, {});
    }
}

function endTurn(battle) {
    battle.phase = 'turnEnd';
    for (const unit of battle.units) if (unit.alive) fire(battle, unit, 'turnEnd', {});
    for (const unit of battle.units) {
        if (!unit.alive) continue;
        for (const status of [...unit.statuses.values()]) {
            if (status.def.duration === 'turn') battle.ops.removeStatus(unit, status.id);
        }
        if (unit.staggerLevel > 0 && battle.turn >= unit.staggerUntilTurn) {
            unit.staggerLevel = 0;
            battle.emit({ type: 'staggerRecover', unit: unit.uid });
        }
    }
    battle.emit({ type: 'turnEnd' });
    checkEnd(battle);
}

export { runActions };
